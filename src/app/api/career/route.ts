import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { JobRecommendationEngine } from "@/lib/job-engine";
import { NotionMCPClient } from "@/lib/notion-mcp";
import { runForensicAudit } from "@/lib/intelligence";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get("notion_token")?.value || null;
}

export async function POST(req: NextRequest) {
  const token = await getToken();
  if (!token) return NextResponse.json({ success: false, error: "Not connected" }, { status: 401 });

  try {
    const { mode, selectedPages, url } = await req.json();
    const mcp = new NotionMCPClient(token);
    const engine = new JobRecommendationEngine();

    let setup = await mcp.searchDatabases();
    const profile = await mcp.discoverAndReadProfile(selectedPages || []);

    if (mode === "FULL_SETUP" || mode === "SETUP" || !setup.jobsDataSourceId) {
      const parent = (selectedPages || [])[0];
      const newSetup = await mcp.initializeWorkspace(parent);
      setup = { ...setup, ...newSetup };

      if (setup.careerPageId) await mcp.saveProfile(setup.careerPageId, profile);

      if (setup.jobsDataSourceId && profile.skills.length > 0) {
        const jobs = await engine.generateRecommendations(profile, 5);
        for (const j of jobs) {
          await mcp.gateway.callTool("notion-create-pages", {
            parent: { database_id: setup.jobsDataSourceId },
            properties: {
              "Job Title": { title: [{ text: { content: j.title } }] },
              "Company": { rich_text: [{ text: { content: j.company } }] },
              "Match Score": { number: (j.matchScore || 0) / 100 },
              "Status": { select: { name: "🔍 Researching" } },
              "Job URL": { url: j.url || "" }
            }
          }).catch(() => {});
        }
      }
    }

    if (mode === "FORENSIC_ANALYSIS") {
      const res = await runForensicAudit(url);
      return NextResponse.json({ success: true, analysis: res });
    }

    const { jobs, skills } = await getFullData(mcp, setup);

    return NextResponse.json({
      success: true,
      profile,
      jobs,
      skills,
      infrastructure: setup,
      setupComplete: !!setup.jobsDataSourceId
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function getFullData(mcp: NotionMCPClient, setup: any) {
  let jobs: any[] = [];
  let skills: any[] = [];

  if (setup.jobsDataSourceId) {
    try {
      const res = await mcp.queryDataSource(setup.jobsDataSourceId);
      jobs = (res as any).results.map((p: any) => ({
        id: p.id,
        title: p.properties["Job Title"]?.title?.[0]?.plain_text || "Job",
        company: p.properties["Company"]?.rich_text?.[0]?.plain_text || "Company",
        matchScore: (p.properties["Match Score"]?.number || 0) * 100,
        status: p.properties["Status"]?.select?.name || "Researching",
        url: p.properties["Job URL"]?.url || ""
      }));
    } catch (e) {}
  }

  if (setup.skillsDataSourceId) {
    try {
      const res = await mcp.queryDataSource(setup.skillsDataSourceId);
      skills = (res as any).results.map((p: any) => ({
        id: p.id,
        skill: p.properties["Skill Name"]?.title?.[0]?.plain_text || "Skill",
        proficiency: p.properties["Proficiency"]?.select?.name || "Expert"
      }));
    } catch (e) {}
  }

  return { jobs, skills };
}

export async function GET() {
  const token = await getToken();
  if (!token) return NextResponse.json({ success: false });
  const mcp = new NotionMCPClient(token);
  const setup = await mcp.searchDatabases();
  const data = await getFullData(mcp, setup);
  return NextResponse.json({ success: true, ...data, infrastructure: setup });
}
