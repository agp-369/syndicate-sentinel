import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { NotionMCPClient } from "@/lib/notion-mcp";

const COOKIE_NAME = "notion_token";

async function getTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

export const dynamic = "force-dynamic";

/**
 * GET /api/notion/pages
 * Lists all pages accessible to the integration via Notion MCP
 */
export async function GET() {
  const token = await getTokenFromCookie();

  if (!token) {
    return NextResponse.json({ success: false, error: "Notion not connected" }, { status: 401 });
  }

  try {
    const mcp = new NotionMCPClient(token);
    
    // Robust search without filters to get everything first
    const searchRes = await mcp.gateway.callTool("notion_search", { 
      page_size: 100 
    });

    const pages = searchRes.results.map((item: any) => {
      let title = "Untitled";
      if (item.object === "page") {
        title = item.properties?.title?.title?.[0]?.plain_text ||
                item.properties?.Name?.title?.[0]?.plain_text ||
                "Untitled Page";
      } else if (item.object === "data_source") {
        title = item.name || "Untitled Data Source";
      }
      
      return {
        id: item.id,
        title: title,
        url: item.url,
        type: item.object,
        lastEdited: item.last_edited_time,
        icon: item.icon?.emoji || item.icon?.external?.url || item.icon?.file?.url || null,
        parentId: item.parent?.page_id || item.parent?.database_id || item.parent?.block_id || null,
        parentType: item.parent?.type || null,
        hasChildren: false,
      };
    });

    return NextResponse.json({
      success: true,
      pages,
      count: pages.length,
    });

  } catch (err: any) {
    console.error("[NOTION_PAGES_MCP] Error:", err);
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
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return response;
}
