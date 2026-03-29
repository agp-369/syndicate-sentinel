import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { JobRecommendationEngine } from "@/lib/job-engine";
import { NotionMCPClient } from "@/lib/notion-mcp";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("notion_token")?.value || null;
}

export async function POST(req: NextRequest) {
  const token = await getToken();
  if (!token) return NextResponse.json({ success: false, error: "Notion not connected" }, { status: 401 });

  try {
    const { mode, selectedPages } = await req.json();
    const mcp = new NotionMCPClient(token);
    const engine = new JobRecommendationEngine();

    // 1. Discover existing infrastructure or create if missing
    let setup = await mcp.searchDatabases();
    
    // 2. Extract profile data
    const profile = await mcp.discoverAndReadProfile(selectedPages || []);
    
    // 3. Handle Full Setup
    if (mode === "FULL_SETUP" || mode === "SETUP") {
      const parentId = (selectedPages || [])[0];
      if (parentId) {
        const newSetup = await mcp.initializeWorkspace(parentId);
        setup = { ...setup, ...newSetup };
      }
    }

    // 4. Generate AI content based on profile
    let jobs: any[] = [];
    let skillGaps: any[] = [];
    
    if (profile && profile.skills?.length > 0) {
      const [recommendedJobs, trendingSkills] = await Promise.all([
        engine.generateRecommendations(profile, 6),
        engine.analyzeSkillGaps(profile)
      ]);
      
      jobs = recommendedJobs;
      skillGaps = trendingSkills;
    }

    // 5. Handle Action Logging (HITL)
    if (mode === "LOG_ACTION") {
      const { action, details, jobId } = await req.json();
      if (jobId) {
        // Update existing page
        await mcp.gateway.callTool("notion-update-page", {
          page_id: jobId,
          properties: {
            "Status": { select: { name: action.includes("APPROVE") ? "✅ Verified" : "🟡 AWAITING_REVIEW" } }
          }
        });
        
        // Also add a comment or block explaining the action
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
        return NextResponse.json({ success: true, message: "Action logged and page updated" });
      } else if (setup.jobsDataSourceId) {
        await mcp.gateway.callTool("notion-create-pages", {
          parent: { database_id: setup.jobsDataSourceId },
          properties: {
            "Job Title": { title: [{ text: { content: `[ACTION] ${action}` } }] },
            "Status": { select: { name: "✅ Verified" } },
            "Company": { rich_text: [{ text: { content: details.company || "Unknown" } }] }
          },
          children: [
            { object: "block", type: "callout", callout: { rich_text: [{ text: { content: `Action: ${action} - ${new Date().toLocaleString()}` } }], icon: { type: "emoji", emoji: "⚡" }, color: "blue_background" } },
            { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: details.summary || "" } }] } }
          ]
        });
        return NextResponse.json({ success: true, message: "Action logged to Notion" });
      }
    }

    if (mode === "FORENSIC_ANALYSIS") {
      const { url } = await req.json();
      const analysis = await engine.forensicAnalysis(url);
      return NextResponse.json({ success: true, analysis });
    }

    if (mode === "GENERATE_JOBS") {
      const { count } = await req.json();
      const jobs = await engine.generateRecommendations(profile, count || 6);
      return NextResponse.json({ success: true, jobs });
    }

    if (mode === "ANALYZE_SKILLS") {
      const gaps = await engine.analyzeSkillGaps(profile);
      return NextResponse.json({ success: true, gaps });
    }

    if (mode === "LOAD_DATA") {
      return NextResponse.json({ success: true, profile, infrastructure: setup });
    }

    // 6. Save initial jobs to Notion if this is a setup
    if ((mode === "FULL_SETUP" || mode === "SETUP") && setup.jobsDataSourceId && jobs.length > 0) {
      for (const job of jobs.slice(0, 3)) {
        try {
          await mcp.gateway.callTool("notion-create-pages", {
            parent: { database_id: setup.jobsDataSourceId },
            properties: {
              "Job Title": { title: [{ text: { content: job.title } }] },
              "Company": { rich_text: [{ text: { content: job.company } }] },
              "Match Score": { number: job.matchScore / 100 },
              "Status": { select: { name: "🔍 Researching" } },
              "Job URL": { url: job.url || "" }
            }
          });
        } catch (e) {
          console.error(`Failed to save job ${job.title}:`, e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      profile,
      jobs: jobs.map((j, i) => ({ ...j, id: `job_${i}`, status: "researching" })),
      skills: skillGaps,
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
      const results = await mcp.queryDataSource(setup.jobsDataSourceId, 20);
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

