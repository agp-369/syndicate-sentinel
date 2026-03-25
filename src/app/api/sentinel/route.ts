import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { NotionMCPClient, runForensicAudit, type MCPTransaction } from "@/lib/notion-mcp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COOKIE_NAME = "notion_token";

async function getTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

/**
 * POST /api/sentinel
 * Handles workspace management operations.
 * Token is read from httpOnly cookie set by /api/notion/callback
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { mode, payload } = body as { mode: string; payload?: any };

  const token = await getTokenFromCookie();

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Notion not connected. Please reconnect." },
      { status: 401 }
    );
  }

  const mcp = new NotionMCPClient(token);

  try {
    // ── Scan workspace for existing Lumina databases ──────────────────────────
    if (mode === "SCAN_WORKSPACE") {
      const setup = await mcp.searchDatabases();
      return NextResponse.json({
        success: true,
        ...setup,
        connected: !!(setup.jobLedgerId && setup.talentPoolId),
      });
    }

    // ── Provision a fresh Lumina workspace ───────────────────────────────────
    if (mode === "INITIALIZE_INFRASTRUCTURE") {
      let parentPageId: string = payload?.parentPageId;

      if (!parentPageId) {
        const searchRes = await fetch("https://api.notion.com/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filter: { property: "object", value: "page" },
            page_size: 1,
          }),
        });
        const pageData = await searchRes.json();
        parentPageId = pageData.results?.[0]?.id;

        if (!parentPageId) {
          return NextResponse.json(
            { success: false, error: "No shared page found. Please share a Notion page with your integration first." },
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

    // ── Read entries from a database ─────────────────────────────────────────
    if (mode === "READ_DATABASE" && payload?.databaseId) {
      const entries = await mcp.queryDatabase(payload.databaseId);
      return NextResponse.json({ success: true, results: entries });
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

    // ── Forensic audit (returns JSON) ────────────────────────────────────────
    if (mode === "FORENSIC_AUDIT" && payload?.url) {
      const analysis = await runForensicAudit(payload.url);
      let pageUrl = null;

      if (payload.ledgerId) {
        pageUrl = await mcp.logForensicAudit(payload.ledgerId, analysis, payload.url);
      }

      return NextResponse.json({
        success: true,
        analysis,
        pageUrl,
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
 * Check if Notion is connected
 */
export async function GET() {
  const token = await getTokenFromCookie();
  return NextResponse.json({
    connected: !!token,
    hasToken: !!token,
  });
}
