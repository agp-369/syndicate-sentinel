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

    // ── DATA RECOVERY & SYNC (THE FIX) ──────────────────────────────────────────
    if (mode === "FULL_SETUP" || mode === "SETUP" || mode === "LOAD_DATA") {
      console.log(`[BACKEND] Synchronizing workspace DNA...`);
      
      // 1. Recover existing state first
      let setup = await mcp.searchDatabases();
      
      // 2. Discover DNA from pages (Deep Read)
      const profile = await mcp.discoverAndReadProfile();
      
      // 3. Provision if setup requested and databases missing
      if (!setup.jobsDataSourceId && (mode === "FULL_SETUP" || mode === "SETUP")) {
        const searchRes = await mcp.gateway.callTool("notion-search", { page_size: 5 });
        const parentPageId = (searchRes as any)?.results?.find((i: any) => i.object === "page")?.id;
        if (parentPageId) {
          setup = await mcp.initializeWorkspace(parentPageId);
        }
      }

      // 4. Actionable Intelligence based on REAL extracted data
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
        setupComplete: !!setup.jobsDataSourceId
      });
    }

    return NextResponse.json({ success: false, error: "Invalid mode" }, { status: 400 });
  } catch (err: any) {
    console.error("[CAREER_API] Critical Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
