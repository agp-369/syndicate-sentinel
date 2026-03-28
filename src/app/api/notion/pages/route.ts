import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Client } from "@notionhq/client";

const COOKIE_NAME = "notion_token";

async function getTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

export const dynamic = "force-dynamic";

/**
 * GET /api/notion/pages
 * Lists all pages accessible to the integration
 * Uses direct Notion API (more reliable than MCP for this)
 */
export async function GET() {
  const token = await getTokenFromCookie();

  if (!token) {
    return NextResponse.json({ success: false, error: "Notion not connected" }, { status: 401 });
  }

  try {
    const notion = new Client({ auth: token });
    
    // Search for all pages
    const search = await notion.search({
      filter: { property: "object", value: "page" },
      page_size: 100,
      sort: { direction: "descending", timestamp: "last_edited_time" },
    });

    const pages = search.results.map((page: any) => {
      const title = page.properties?.title?.title?.[0]?.plain_text ||
                    page.properties?.Name?.title?.[0]?.plain_text ||
                    "Untitled";
      
      return {
        id: page.id,
        title: title,
        url: page.url,
        type: page.object,
        lastEdited: page.last_edited_time,
        icon: page.icon?.emoji || null,
        parentId: page.parent?.page_id || page.parent?.database_id || null,
        hasChildren: false,
      };
    });

    return NextResponse.json({
      success: true,
      pages,
      count: pages.length,
    });

  } catch (err: any) {
    console.error("[NOTION_PAGES] Error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch Notion pages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notion/pages
 * Save selected page IDs to cookie
 */
export async function POST(req: Request) {
  const { pageIds } = await req.json();
  const token = await getTokenFromCookie();

  if (!token) {
    return NextResponse.json({ success: false, error: "Notion not connected" }, { status: 401 });
  }

  const response = NextResponse.json({
    success: true,
    message: "Pages selected successfully",
    selectedCount: pageIds?.length || 0,
  });

  response.cookies.set("notion_selected_pages", JSON.stringify(pageIds || []), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}
