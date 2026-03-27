import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { NotionMCPClient } from "@/lib/notion-mcp";
import { JobRecommendationEngine } from "@/lib/job-engine";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const COOKIE_NAME = "notion_token";

async function getTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

/**
 * POST /api/career
 * MCP-Native Controller for Career OS operations.
 */
export async function POST(req: NextRequest) {
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ success: false, error: "Notion not connected" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { mode } = body;
    const mcp = new NotionMCPClient(token);
    const jobEngine = new JobRecommendationEngine();

    // ── AUTOMATED FULL SETUP (MCP NATIVE) ──────────────────────────────────────
    if (mode === "FULL_SETUP" || mode === "SETUP") {
      console.log(`[${mode}] Starting MCP-native setup...`);
      
      // 1. Discover & Read Profile via MCP
      const profile = await mcp.discoverAndReadProfile();
      
      // 2. Scan for existing infrastructure via MCP
      let setup = await mcp.searchDatabases();
      
      // 3. If no infrastructure, initialize via MCP
      if (!setup.jobLedgerId) {
        // Find a parent page to host the databases
        const searchRes = await mcp.gateway.callTool("notion_search", {
          filter: { property: "object", value: "page" },
          page_size: 1
        });
        const parentPageId = (searchRes as any)?.results?.[0]?.id;
        
        if (parentPageId) {
          setup = await mcp.initializeWorkspace(parentPageId);
        } else {
          throw new Error("No shared page found to initialize workspace.");
        }
      }

      // 4. Generate recommendations
      const jobs = await jobEngine.generateRecommendations(profile, 5);
      const trendingSkills = await jobEngine.analyzeSkillGaps(profile);

      return NextResponse.json({
        success: true,
        profile,
        jobs: jobs.map((j, i) => ({
          ...j,
          id: `job_${i}`,
          status: "researching",
          scanDNA: { authenticity: 85, cultureFit: 78, growthPotential: 82 },
          lastScan: new Date().toLocaleDateString(),
        })),
        skills: trendingSkills.slice(0, 5).map((s: any) => ({
          ...s,
          category: s.category || "Technical",
        })),
        infrastructure: setup,
        stats: {
          skillsFound: profile.skills?.length || 0,
          jobsCreated: jobs.length,
          skillsAnalyzed: trendingSkills.length,
          forensicScans: 0,
        },
        setupComplete: true,
        message: "Lumina Career OS Active via Notion MCP!",
      });
    }

    // ── LOAD EXISTING DATA (MCP NATIVE) ────────────────────────────────────────
    if (mode === "LOAD_DATA") {
      const profile = await mcp.discoverAndReadProfile();
      const setup = await mcp.searchDatabases();
      const gaps = await jobEngine.analyzeSkillGaps(profile);
      
      let jobs: any[] = [];
      if (setup.jobLedgerId) {
        jobs = await mcp.queryDatabase(setup.jobLedgerId);
      }

      return NextResponse.json({
        success: true,
        profile,
        skills: gaps.slice(0, 8).map((s: any) => ({
          ...s,
          category: s.category || "Technical",
          matchWithTechStack: profile.techStack?.some((t: string) => t.toLowerCase().includes(s.skill.toLowerCase())) ? 85 : 45,
        })),
        jobs: jobs.map(j => ({
          id: j.id,
          title: j.properties?.["Job Title"]?.title?.[0]?.plain_text || "Unknown",
          company: j.properties?.Company?.rich_text?.[0]?.plain_text || "Unknown",
          matchScore: (j.properties?.["Trust Score"]?.number || 0) * 100,
          status: j.properties?.Status?.select?.name?.toLowerCase() || "researching",
          url: j.properties?.["Job URL"]?.url || "",
        })),
        forensicReports: [],
      });
    }

    // ── DELETE INFRASTRUCTURE (MCP NATIVE) ──────────────────────────────────────
    if (mode === "DELETE_INFRA") {
      const setup = await mcp.searchDatabases();
      if (setup.jobLedgerId) await mcp.gateway.callTool("notion_delete_block", { block_id: setup.jobLedgerId });
      if (setup.talentPoolId) await mcp.gateway.callTool("notion_delete_block", { block_id: setup.talentPoolId });
      if (setup.careerRoadmapId) await mcp.gateway.callTool("notion_delete_block", { block_id: setup.careerRoadmapId });
      if (setup.agentLogId) await mcp.gateway.callTool("notion_delete_block", { block_id: setup.agentLogId });
      
      return NextResponse.json({ success: true, message: "Infrastructure deleted via MCP" });
    }

    return NextResponse.json({ success: false, error: `Unknown mode: ${mode}` }, { status: 400 });

  } catch (err: any) {
    console.error("[CAREER_API] Critical Error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "An internal error occurred",
    }, { status: 500 });
  }
}
