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
    
    // 2. Extract profile (Aggressive Multi-Page Extraction)
    const profile = await mcp.discoverAndReadProfile(selectedPages || []);
    
    let generatedJobs: any[] = [];
    let generatedSkills: any[] = [];

    // 3. Handle Setup (Force Creation & Immediate Population)
    if (mode === "FULL_SETUP" || mode === "SETUP" || !setup.jobsDataSourceId) {
      const parentId = (selectedPages || [])[0];
      
      console.log(`[BACKEND] Initializing Career OS. Parent: ${parentId || "AUTO"}`);
      const newSetup = await mcp.initializeWorkspace(parentId);
      setup = { ...setup, ...newSetup };
      
      if (!setup.careerPageId && !parentId) {
        throw new Error("NOTION_PERMISSION_REQUIRED: Please select/share at least one page with the integration.");
      }

      // Save Profile immediately
      if (setup.careerPageId) {
        await mcp.saveProfile(setup.careerPageId, profile);
      }

      // Generate content to show immediately
      if (profile.skills.length > 0) {
        [generatedJobs, generatedSkills] = await Promise.all([
          engine.generateRecommendations(profile, 10),
          engine.analyzeSkillGaps(profile)
        ]);

        // Save to Notion in background (don't wait for all if it's too many)
        if (setup.jobsDataSourceId) {
          for (const job of generatedJobs.slice(0, 5)) {
            mcp.gateway.callTool("notion-create-pages", {
              parent: { database_id: setup.jobsDataSourceId },
              properties: {
                "Job Title": { title: [{ text: { content: job.title } }] },
                "Company": { rich_text: [{ text: { content: job.company } }] },
                "Match Score": { number: (job.matchScore || 0) / 100 },
                "Status": { select: { name: "🔍 Researching" } },
                "Job URL": { url: job.url || "" }
              }
            }).catch(() => {});
          }
        }

        if (setup.skillsDataSourceId) {
          mcp.saveSkillGaps(setup.skillsDataSourceId, generatedSkills).catch(() => {});
        }
      }
    }

    // --- FEATURE MODES ---

    if (mode === "FORENSIC_ANALYSIS") {
      const analysis = await runForensicAudit(url);
      return NextResponse.json({ success: true, analysis });
    }

    // LOAD_DATA / DEFAULT: 
    // We combine Notion data with generated data to ensure "0" never happens on first run
    const { jobs: notionJobs, skills: notionSkills } = await getFullDataFromNotion(mcp, setup);
    
    // Merge: If Notion is empty (due to indexing delay), use the generated ones
    const finalJobs = notionJobs.length > 0 ? notionJobs : generatedJobs.map((j, i) => ({
      ...j, id: `gen_${i}`, status: "researching"
    }));
    
    const finalSkills = notionSkills.length > 0 ? notionSkills : generatedSkills.map((s, i) => ({
      ...s, id: `gen_s_${i}`, proficiency: "Intermediate"
    }));

    return NextResponse.json({
      success: true,
      profile,
      jobs: finalJobs,
      skills: finalSkills,
      infrastructure: setup,
      setupComplete: !!(setup.jobsDataSourceId && setup.skillsDataSourceId)
    });

  } catch (err: any) {
    console.error("Career API error:", err);
    const isPermissionError = err.message.includes("NOTION_PERMISSION");
    return NextResponse.json({ 
      success: false, 
      error: isPermissionError ? "Please share a page with the 'Lumina' integration in Notion settings." : err.message 
    }, { status: isPermissionError ? 403 : 500 });
  }
}

async function getFullDataFromNotion(mcp: NotionMCPClient, setup: any) {
  let jobs: any[] = [];
  let skills: any[] = [];

  if (setup.jobsDataSourceId) {
    try {
      const results = await mcp.queryDataSource(setup.jobsDataSourceId, 50);
      jobs = (results as any).results.map((page: any) => {
        const props = page.properties;
        return {
          id: page.id,
          title: props["Job Title"]?.title?.[0]?.plain_text || "Untitled",
          company: props["Company"]?.rich_text?.[0]?.plain_text || "Unknown",
          matchScore: (props["Match Score"]?.number || 0) * 100,
          status: props["Status"]?.select?.name?.includes("Research") ? "researching" : "applied",
          url: props["Job URL"]?.url || ""
        };
      });
    } catch (e) {}
  }

  if (setup.skillsDataSourceId) {
    try {
      const results = await mcp.queryDataSource(setup.skillsDataSourceId, 50);
      skills = (results as any).results.map((page: any) => ({
        id: page.id,
        skill: page.properties["Skill Name"]?.title?.[0]?.plain_text || "Skill",
        proficiency: page.properties["Proficiency"]?.select?.name || "Intermediate"
      }));
    } catch (e) {}
  }

  return { jobs, skills };
}

export async function GET() {
  const token = await getToken();
  if (!token) return NextResponse.json({ success: false });
  try {
    const mcp = new NotionMCPClient(token);
    const setup = await mcp.searchDatabases();
    const { jobs, skills } = await getFullDataFromNotion(mcp, setup);
    return NextResponse.json({ success: true, jobs, skills, infrastructure: setup });
  } catch (e) {
    return NextResponse.json({ success: false });
  }
}
