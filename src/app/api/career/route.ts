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

export async function POST(req: NextRequest) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ success: false, error: "Notion not connected" }, { status: 401 });

  try {
    const { mode } = await req.json();
    const mcp = new NotionMCPClient(token);
    const jobEngine = new JobRecommendationEngine();

    // ── CORE SYNC ENGINE (Deep extraction + Discovery) ──────────────────────────
    if (mode === "FULL_SETUP" || mode === "SETUP" || mode === "LOAD_DATA") {
      console.log(`[SYNC] Protocol 2025-09-03 active. Beginning deep sync...`);
      
      // 1. Deep Read Profile (Fetch block children recursively)
      const profile = await mcp.discoverAndReadProfile();
      
      // 2. Discover/Recover Infrastructure
      let setup = await mcp.searchDatabases();
      
      // 3. If setup requested but infra missing, build it
      if (!setup.jobsDataSourceId && (mode === "FULL_SETUP" || mode === "SETUP")) {
        const searchRes = await mcp.gateway.callTool("notion_search", { page_size: 5 });
        const parentPageId = (searchRes as any)?.results?.find((i: any) => i.object === "page")?.id;
        if (parentPageId) {
          setup = await mcp.initializeWorkspace(parentPageId);
        } else {
          throw new Error("PROTOCOL_ERROR: No shared page found. Please grant access to at least one page in Notion.");
        }
      }

      // 4. Intelligence Layer - Only generate if profile exists
      let jobs: any[] = [];
      let skillGaps: any[] = [];
      
      if (profile.skills.length > 0) {
        jobs = await jobEngine.generateRecommendations(profile, 8);
        skillGaps = await jobEngine.analyzeSkillGaps(profile);
      }

      return NextResponse.json({
        success: true,
        profile,
        jobs: jobs.map((j, i) => ({ ...j, id: `job_${i}`, status: "researching" })),
        skills: skillGaps,
        infrastructure: setup,
        setupComplete: !!setup.jobsDataSourceId,
        agentLogs: [
          "✓ Deep-read Notion block hierarchy",
          `✓ Found ${profile.skills.length} skills in profile`,
          `✓ Recovered ${setup.jobsDataSourceId ? "active" : "new"} infrastructure`,
          `✓ Matched ${jobs.length} forensic opportunities`
        ]
      });
    }

    return NextResponse.json({ success: false, error: "MODE_UNSUPPORTED" }, { status: 400 });
  } catch (err: any) {
    console.error("[CAREER_API] Critical Failure:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
