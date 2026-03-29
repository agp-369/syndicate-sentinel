import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { JobRecommendationEngine } from "@/lib/job-engine";
import { NotionMCPClient } from "@/lib/notion-mcp";
import { runForensicAudit } from "@/lib/intelligence";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("notion_token")?.value || null;
}

export async function POST(req: NextRequest) {
  const token = await getToken();
  if (!token) return NextResponse.json({ success: false, error: "Notion not connected" }, { status: 401 });

  try {
    const { mode, selectedPages, url, count } = await req.json();
    const mcp = new NotionMCPClient(token);
    const engine = new JobRecommendationEngine();

    // 1. Discover existing infrastructure
    let setup = await mcp.searchDatabases();
    
    // 2. Extract/Read profile
    const profile = await mcp.discoverAndReadProfile(selectedPages || []);
    
    // 3. Handle Infrastructure Setup
    if (mode === "FULL_SETUP" || mode === "SETUP") {
      const parentId = (selectedPages || [])[0];
      if (parentId) {
        const newSetup = await mcp.initializeWorkspace(parentId);
        setup = { ...setup, ...newSetup };
        
        // 4. Save Profile to the new infrastructure
        if (setup.careerPageId) {
          await mcp.saveProfile(setup.careerPageId, profile);
        }

        // 5. Generate and save initial matching jobs
        if (setup.jobsDataSourceId && profile.skills.length > 0) {
          const recommendedJobs = await engine.generateRecommendations(profile, 5);
          for (const job of recommendedJobs) {
            await mcp.gateway.callTool("notion-create-pages", {
              parent: { database_id: setup.jobsDataSourceId },
              properties: {
                "Job Title": { title: [{ text: { content: job.title } }] },
                "Company": { rich_text: [{ text: { content: job.company } }] },
                "Match Score": { number: (job.matchScore || 0) / 100 },
                "Status": { select: { name: "🔍 Researching" } },
                "Job URL": { url: job.url || "" }
              }
            });
          }
        }

        // 6. Generate and save initial skill DNA
        if (setup.skillsDataSourceId && profile.skills.length > 0) {
          const gaps = await engine.analyzeSkillGaps(profile);
          await mcp.saveSkillGaps(setup.skillsDataSourceId, gaps);
        }
      }
    }

    // --- FEATURE MODES ---

    if (mode === "FORENSIC_ANALYSIS") {
      const analysis = await runForensicAudit(url);
      // Map to frontend expected format
      return NextResponse.json({ 
        success: true, 
        analysis: {
          verdict: analysis.verdict,
          trustScore: analysis.score,
          redFlags: analysis.analysis.flags,
          cultureAnalysis: analysis.analysis.cultureMatch,
          jobDetails: analysis.jobDetails,
          cyberMetadata: analysis.analysis.cyberMetadata
        } 
      });
    }

    if (mode === "LOG_ACTION") {
      const { action, details, jobId } = await req.json();
      if (jobId) {
        await mcp.gateway.callTool("notion-update-page", {
          page_id: jobId,
          properties: {
            "Status": { select: { name: action.includes("APPROVE") ? "✅ Verified" : "🟡 AWAITING_REVIEW" } }
          }
        });
        
        await mcp.gateway.callTool("notion-create-pages", {
          parent: { database_id: setup.jobsDataSourceId! },
          properties: {
            "Job Title": { title: [{ text: { content: `[LOG] ${action} for ${details.company || "Job"}` } }] },
            "Status": { select: { name: "✅ Verified" } },
            "Company": { rich_text: [{ text: { content: details.company || "Unknown" } }] }
          },
          children: [
            { object: "block", type: "callout", callout: { rich_text: [{ text: { content: `${action}: ${new Date().toLocaleString()}` } }], icon: { type: "emoji", emoji: "📋" }, color: "gray_background" } },
            { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: details.summary || "" } }] } }
          ]
        });
        return NextResponse.json({ success: true });
      }
    }

    if (mode === "GENERATE_JOBS") {
      const jobs = await engine.generateRecommendations(profile, count || 6);
      return NextResponse.json({ success: true, jobs });
    }

    if (mode === "ANALYZE_SKILLS") {
      const gaps = await engine.analyzeSkillGaps(profile);
      return NextResponse.json({ success: true, gaps });
    }

    // Default response for setup or data load
    return NextResponse.json({
      success: true,
      profile,
      infrastructure: setup,
      setupComplete: !!(setup.jobsDataSourceId && setup.skillsDataSourceId)
    });

  } catch (err: any) {
    console.error("Career API error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const token = await getToken();
  if (!token) return NextResponse.json({ success: false, error: "Notion not connected" }, { status: 401 });

  try {
    const mcp = new NotionMCPClient(token);
    const setup = await mcp.searchDatabases();
    
    let jobs: any[] = [];
    let skills: any[] = [];

    if (setup.jobsDataSourceId) {
      const results = await mcp.queryDataSource(setup.jobsDataSourceId, 50);
      jobs = (results as any).results.map((page: any) => {
        const props = page.properties;
        return {
          id: page.id,
          title: props["Job Title"]?.title?.[0]?.plain_text || "Untitled",
          company: props["Company"]?.rich_text?.[0]?.plain_text || "Unknown",
          matchScore: (props["Match Score"]?.number || 0) * 100,
          status: props["Status"]?.select?.name?.includes("Research") ? "researching" : 
                  props["Status"]?.select?.name?.includes("Verified") ? "researching" : "applied",
          url: props["Job URL"]?.url || ""
        };
      });
    }

    if (setup.skillsDataSourceId) {
      const results = await mcp.queryDataSource(setup.skillsDataSourceId, 50);
      skills = (results as any).results.map((page: any) => ({
        id: page.id,
        skill: page.properties["Skill Name"]?.title?.[0]?.plain_text || "Skill",
        proficiency: page.properties["Proficiency"]?.select?.name || "Intermediate"
      }));
    }

    return NextResponse.json({
      success: true,
      jobs,
      skills,
      infrastructure: setup
    });

  } catch (err: any) {
    console.error("Career API GET error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
