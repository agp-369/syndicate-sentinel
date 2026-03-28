import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { Client } from "@notionhq/client";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const COOKIE_NAME = "notion_token";

async function getTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

/**
 * POST /api/career
 * Forensic Career OS - Create infrastructure using direct Notion API
 */
export async function POST(req: NextRequest) {
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ success: false, error: "Notion not connected" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { mode } = body;
    const notion = new Client({ auth: token });

    // ── FULL SETUP ─────────────────────────────────────────────
    if (mode === "FULL_SETUP" || mode === "SETUP") {
      console.log("[SETUP] Starting Forensic Career OS setup...");
      
      // Create default profile
      const profile = {
        name: "Career Professional",
        headline: "Software Engineer",
        skills: ["JavaScript", "TypeScript", "React", "Node.js", "Python"],
        currentRole: "Software Engineer",
        currentCompany: "Tech Company",
      };

      // Search for existing Forensic Career OS page
      const existing = await notion.search({
        query: "Forensic Career OS",
        filter: { property: "object", value: "page" },
      });

      let careerPageId = "";
      
      if (existing.results.length > 0) {
        careerPageId = existing.results[0].id;
        console.log("[SETUP] Using existing page:", careerPageId);
      } else {
        // Create new main page
        const page = await notion.pages.create({
          parent: { type: "workspace", workspace: true },
          icon: { type: "emoji", emoji: "🔍" },
          properties: {
            title: {
              title: [{ text: { content: "Forensic Career OS" } }]
            }
          }
        });
        careerPageId = page.id;
        console.log("[SETUP] Created main page:", careerPageId);

        // Add welcome content
        await notion.blocks.children.append({
          block_id: careerPageId,
          children: [
            {
              object: "block",
              type: "callout",
              callout: {
                rich_text: [{ type: "text", text: { content: "🚀 Forensic Career OS v2.0 Ready! Built with Notion MCP." } }],
                icon: { emoji: "🚀" },
                color: "blue_background"
              }
            },
            {
              object: "block",
              type: "heading_2",
              heading_2: {
                rich_text: [{ type: "text", text: { content: "Your Career Dashboard" } }]
              }
            },
            {
              object: "block",
              type: "bulleted_list_item",
              bulleted_list_item: {
                rich_text: [{ type: "text", text: { content: `📊 Role: ${profile.currentRole}` } }]
              }
            },
            {
              object: "block",
              type: "bulleted_list_item",
              bulleted_list_item: {
                rich_text: [{ type: "text", text: { content: `🏢 Company: ${profile.currentCompany}` } }]
              }
            },
            {
              object: "block",
              type: "bulleted_list_item",
              bulleted_list_item: {
                rich_text: [{ type: "text", text: { content: `🛠️ Skills: ${profile.skills.length} identified` } }]
              }
            }
          ]
        });

        // Create Jobs section page
        const jobsPage = await notion.pages.create({
          parent: { type: "page_id", page_id: careerPageId },
          icon: { type: "emoji", emoji: "💼" },
          properties: {
            title: { title: [{ text: { content: "🎯 Job Tracker" } }] }
          }
        });
        await notion.blocks.children.append({
          block_id: jobsPage.id,
          children: [
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [{ type: "text", text: { content: "Track your job applications here. Jobs will appear after forensic analysis." } }]
              }
            }
          ]
        });
        console.log("[SETUP] Created Jobs page:", jobsPage.id);

        // Create Skills section page
        const skillsPage = await notion.pages.create({
          parent: { type: "page_id", page_id: careerPageId },
          icon: { type: "emoji", emoji: "🧬" },
          properties: {
            title: { title: [{ text: { content: "🧬 Skill DNA" } }] }
          }
        });
        await notion.blocks.children.append({
          block_id: skillsPage.id,
          children: [
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [{ type: "text", text: { content: "Your skills mapped with DNA analysis." } }]
              }
            }
          ]
        });
        console.log("[SETUP] Created Skills page:", skillsPage.id);
      }

      return NextResponse.json({
        success: true,
        profile,
        jobs: [],
        skills: [],
        forensicReports: [],
        infrastructure: { careerPageId },
        stats: {
          skillsFound: profile.skills.length,
          jobsCreated: 0,
          skillsAnalyzed: 0,
          forensicScans: 0,
        },
        setupComplete: true,
        message: "Forensic Career OS Ready!",
      });
    }

    return NextResponse.json({ success: false, error: `Unknown mode: ${mode}` }, { status: 400 });

  } catch (err: any) {
    console.error("[CAREER_API] Error:", err.message);
    return NextResponse.json({
      success: false,
      error: err.message || "An internal error occurred",
    }, { status: 500 });
  }
}
