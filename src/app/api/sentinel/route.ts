import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { NotionMCPClient, type MCPTransaction } from "@/lib/notion-mcp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COOKIE_NAME = "notion_token";

async function getTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

/**
 * POST /api/sentinel
 * Handles workspace management operations via Notion MCP.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { mode, payload } = body as { mode: string; payload?: any };

  const token = await getTokenFromCookie();

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Notion not connected." },
      { status: 401 }
    );
  }

  const mcp = new NotionMCPClient(token);

  try {
    // ── Scan workspace for existing Lumina databases via MCP ──────────────────────────
    if (mode === "SCAN_WORKSPACE") {
      const transactions: MCPTransaction[] = [];
      const setup = await mcp.searchDatabases((tx) => transactions.push(tx));
      return NextResponse.json({
        success: true,
        ...setup,
        connected: !!(setup.jobLedgerId && setup.talentPoolId),
        transactions
      });
    }

    // ── Provision a fresh Lumina workspace via MCP ───────────────────────────────────
    if (mode === "INITIALIZE_INFRASTRUCTURE") {
      let parentPageId: string = payload?.parentPageId;

      if (!parentPageId) {
        // Use MCP search instead of fetch
        const searchRes = await mcp.gateway.callTool("notion_search", {
          filter: { property: "object", value: "page" },
          page_size: 1
        });
        parentPageId = (searchRes as any)?.results?.[0]?.id;

        if (!parentPageId) {
          return NextResponse.json(
            { success: false, error: "No shared page found to host your workspace." },
            { status: 400 }
          );
        }
      }

      const transactions: MCPTransaction[] = [];
      const setup = await mcp.initializeWorkspace(parentPageId, (tx) => transactions.push(tx));

      return NextResponse.json({
        success: true,
        ...setup,
        connected: !!(setup.jobLedgerId && setup.talentPoolId),
        transactions,
      });
    }

    // ── Read entries from a database via MCP ─────────────────────────────────────────
    if (mode === "READ_DATABASE" && payload?.databaseId) {
      const transactions: MCPTransaction[] = [];
      const entries = await mcp.queryDatabase(payload.databaseId, (tx) => transactions.push(tx));
      return NextResponse.json({ success: true, results: entries, transactions });
    }

    // ── System health check ───────────────────────────────────────────────────
    if (mode === "SYSTEM_DIAGNOSTICS") {
      return NextResponse.json({
        success: true,
        gemini: !!process.env.GEMINI_API_KEY,
        hasToken: true,
        connected: !!token,
        mcpEndpoint: "https://mcp.notion.com/mcp",
      });
    }

    return NextResponse.json(
      { success: false, error: `Unknown mode: ${mode}` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[SENTINEL_API]", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sentinel
 * Check connection status using MCP discovery.
 */
export async function GET() {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ connected: false, infraCreated: false });

  try {
    const mcp = new NotionMCPClient(token);
    const setup = await mcp.searchDatabases();
    
    const infraCreated = !!(setup.jobLedgerId && setup.talentPoolId);
    
    return NextResponse.json({
      connected: true,
      infraCreated,
      setupComplete: infraCreated,
      ...setup
    });
  } catch (err) {
    console.error("[SENTINEL_GET]", err);
    return NextResponse.json({ connected: true, infraCreated: false });
  }
}
