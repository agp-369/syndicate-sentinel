import { type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { NotionMCPClient, type MCPTransaction, type ForensicReport } from "@/lib/notion-mcp";
import { runForensicAudit } from "@/lib/intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/sentinel/stream
 *
 * Returns a Server-Sent Events stream so the UI can display each MCP tool
 * call the moment it is dispatched — not after the whole request completes.
 *
 * Modes
 * -----
 * ANALYZE  — Scrape the URL, run Gemini forensics, stream the analysis.
 *             Does NOT write to Notion (waits for human approval).
 * SYNC     — Takes pre-analysed data + ledgerId, calls notion_create_page
 *             via MCP, streams every tool call live.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { mode, url, ledgerId, analysisData } = body as {
    mode: "ANALYZE" | "SYNC";
    url?: string;
    ledgerId?: string;
    analysisData?: ForensicReport;
  };

  const cookieStore = await cookies();
  const token = cookieStore.get("notion_token")?.value;

  if (!token) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", data: { message: "Notion not connected. Please reconnect your workspace." } })}\n\n`,
      { status: 401, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      /** Push a typed SSE event. */
      const send = (type: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
          );
        } catch {
          // stream already closed — ignore
        }
      };

      try {
        // ── ANALYZE mode ─────────────────────────────────────────────────────
        if (mode === "ANALYZE") {
          if (!url) {
            send("error", { message: "url is required for ANALYZE mode" });
            return;
          }

          // Phase 1 — web scraping
          send("transaction", {
            id: `scrape_${Date.now()}`,
            timestamp: new Date().toISOString(),
            method: "web.scrape",
            thinking: [
              `🌐 Scraping: ${url}`,
              "Applying custom User-Agent header...",
              "Fetching company root domain for cross-reference...",
            ],
          } satisfies Partial<MCPTransaction>);

          // Phase 2 — AI forensic analysis (Gemini)
          const analysis = await runForensicAudit(url);

          send("transaction", {
            id: `ai_${Date.now()}`,
            timestamp: new Date().toISOString(),
            method: "gemini.forensic_analysis",
            thinking: [
              "🧠 Gemini 2.5 Flash analysis complete",
              `Verdict  : ${analysis.verdict}`,
              `Trust Score: ${analysis.score}%`,
              `Flags    : ${analysis.analysis.flags.length > 0 ? analysis.analysis.flags.slice(0, 3).join(", ") : "none"}`,
            ],
          } satisfies Partial<MCPTransaction>);

          // Send the full analysis object so the UI can display it
          send("analysis", analysis);
          send("complete", { success: true });
        }

        // ── SYNC mode ─────────────────────────────────────────────────────────
        else if (mode === "SYNC") {
          if (!ledgerId || !analysisData) {
            send("error", { message: "ledgerId and analysisData are required for SYNC mode" });
            return;
          }

          // Show MCP session opening in the live monitor
          send("transaction", {
            id: `connect_${Date.now()}`,
            timestamp: new Date().toISOString(),
            method: "mcp.session_open",
            thinking: [
              "🔌 Opening MCP session → mcp.notion.com",
              "  Transport  : StreamableHTTP (POST + SSE)",
              `  Token      : Bearer ${token.substring(0, 8)}...`,
              "  Initializing protocol handshake...",
            ],
          } satisfies Partial<MCPTransaction>);

          const mcp = new NotionMCPClient(token);

          // Every gateway call fires onLog — stream it immediately
          const onLog = (tx: MCPTransaction) => send("transaction", tx);

          const pageUrl = await mcp.logForensicAudit(
            ledgerId,
            analysisData,
            url ?? "",
            undefined,
            onLog
          );

          send("synced", { pageUrl });
          send("complete", { success: true, pageUrl });
        } else {
          send("error", { message: `Unknown stream mode: ${mode}` });
        }
      } catch (e: any) {
        send("error", { message: e.message ?? "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable Nginx / Vercel edge buffering
    },
  });
}
