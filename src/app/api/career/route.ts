import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { NotionMCPClient } from "@/lib/notion-mcp";
import { JobRecommendationEngine } from "@/lib/job-engine";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function getTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("notion_token")?.value || null;
}

/**
 * POST /api/career
 * The Core Sync Engine - Fixed for Official MCP Protocol
 */
export async function POST(req: NextRequest) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ success: false, error: "Notion not connected" }, { status: 401 });

  try {
    const { mode } = await req.json();
    const mcp = new NotionMCPClient(token);
    const jobEngine = new JobRecommendationEngine();

    if (mode === "FULL_SETUP" || mode === "SETUP" || mode === "LOAD_DATA") {
      console.log(`[SYNC] Activating Official Protocol v6.0...`);
      
      // 1. Recover Infrastructure State
      let setup = await mcp.recoverInfrastructure();
      
      // 2. Discover DNA via Deep Read
      const profile = await mcp.discoverAndReadProfile();
      
      // 3. Provision Missing Components (First shared page detection)
      if (!setup.jobsDbId && (mode === "FULL_SETUP" || mode === "SETUP")) {
        const searchRes = await mcp.gateway.callTool("notion-search", { page_size: 5 });
        const parentPageId = (searchRes as any)?.results?.find((i: any) => i.object === "page")?.id;
        if (parentPageId) {
          setup = await mcp.initializeWorkspace(parentPageId);
        } else {
          throw new Error("No shared page found to host infrastructure.");
        }
      }

      // 4. Actionable Intelligence based on verified profile
      let jobs: any[] = [];
      let skillGaps: any[] = [];
      
      if (profile && profile.skills.length > 0) {
        jobs = await jobEngine.generateRecommendations(profile, 10);
        skillGaps = await jobEngine.analyzeSkillGaps(profile);
      }

      return NextResponse.json({
        success: true,
        profile: profile || { name: "Professional", skills: [] },
        jobs: jobs.map((j, i) => ({ ...j, id: `job_${i}`, status: "researching" })),
        skills: skillGaps,
        infrastructure: setup,
        setupComplete: !!setup.jobsDbId
      });
    }

    if (mode === "GENERATE_JOBS") {
      const body = await req.json();
      const count = body.count || 8;
      const profile = await mcp.discoverAndReadProfile();
      const jobs = await jobEngine.generateRecommendations(profile, count);
      const gaps = await jobEngine.analyzeSkillGaps(profile);
      return NextResponse.json({ success: true, jobs, gaps });
    }

    if (mode === "ANALYZE_SKILLS") {
      const profile = await mcp.discoverAndReadProfile();
      const gaps = await jobEngine.analyzeSkillGaps(profile);
      return NextResponse.json({ success: true, gaps });
    }

    return NextResponse.json({ success: false, error: "Mode mismatch" }, { status: 400 });
  } catch (err: any) {
    console.error("[CAREER_API] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
