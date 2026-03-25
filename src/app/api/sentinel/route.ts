import { NextResponse } from "next/server";
import { NotionMCPClient, runForensicAudit, MCPTransaction } from "@/lib/notion-mcp";

export async function POST(req: Request) {
  const { mode, accessToken, payload } = await req.json();
  
  if (!accessToken) {
    return NextResponse.json({ success: false, error: "Notion access token required" }, { status: 401 });
  }

  const mcp = new NotionMCPClient(accessToken);

  try {
    if (mode === "SCAN_WORKSPACE") {
      const setup = await mcp.searchDatabases();
      return NextResponse.json({
        success: true,
        ...setup,
        connected: !!(setup.jobLedgerId && setup.talentPoolId)
      });
    }

    if (mode === "INITIALIZE_INFRASTRUCTURE") {
      if (!payload.parentPageId) {
        const searchRes = await fetch("https://api.notion.com/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ filter: { property: "object", value: "page" }, page_size: 1 }),
        });
        const pageData = await searchRes.json();
        const parentId = pageData.results?.[0]?.id;
        
        if (!parentId) {
          return NextResponse.json({
            success: false,
            error: "No shared page found. Please share a page with your Notion integration first."
          }, { status: 400 });
        }
        payload.parentPageId = parentId;
      }

      const setup = await mcp.initializeWorkspace(payload.parentPageId);
      return NextResponse.json({
        success: true,
        ...setup,
        transactions: mcp.getTransactions()
      });
    }

    if (mode === "READ_DATABASE" && payload.databaseId) {
      const notion = mcp.getNotionClient();
      const res = await notion.databases.query({
        database_id: payload.databaseId,
        page_size: 20
      });
      return NextResponse.json({ success: true, results: res.results });
    }

    if (mode === "SYSTEM_DIAGNOSTICS") {
      return NextResponse.json({
        success: true,
        gemini: !!process.env.GEMINI_API_KEY,
        notion: !!process.env.NOTION_TOKEN,
        hasAccessToken: !!accessToken,
        mcpEndpoint: "https://mcp.notion.com/mcp"
      });
    }

    if (mode === "FORENSIC_AUDIT" && payload.url) {
      const transactions: MCPTransaction[] = [];

      const onLog = (tx: MCPTransaction) => {
        transactions.push(tx);
      };

      transactions.push({
        id: `init_${Date.now()}`,
        timestamp: new Date().toISOString(),
        method: "sentinel.initiate",
        params: { url: payload.url },
        thinking: [
          "🔍 LUMINA FORENSIC SENTINEL ACTIVATED",
          "Target: " + payload.url,
          "Initiating deep analysis sequence..."
        ]
      });

      transactions.push({
        id: `scrape_${Date.now()}`,
        timestamp: new Date().toISOString(),
        method: "web.scrape",
        params: { url: payload.url },
        thinking: [
          "🌐 Scraping job posting content...",
          "Cross-referencing company domain..."
        ]
      });

      const analysis = await runForensicAudit(payload.url);

      transactions.push({
        id: `analyze_${Date.now()}`,
        timestamp: new Date().toISOString(),
        method: "ai.analyze",
        params: { url: payload.url },
        thinking: [
          "🧠 Gemini 2.5 Flash Analysis",
          `Verdict: ${analysis.verdict}`,
          `Trust Score: ${analysis.score}%`,
          `Flags: ${analysis.analysis.flags.length > 0 ? analysis.analysis.flags.join(", ") : "None"}`
        ]
      });

      if (payload.ledgerId) {
        transactions.push({
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          method: "notion.create_page",
          params: { ledgerId: payload.ledgerId },
          thinking: [
            "📝 Writing to Notion Career Ledger...",
            "Creating structured forensic report page..."
          ]
        });

        const pageUrl = await mcp.logForensicAudit(
          payload.ledgerId,
          analysis,
          payload.url,
          onLog
        );

        transactions.push({
          id: `complete_${Date.now()}`,
          timestamp: new Date().toISOString(),
          method: "sentinel.complete",
          params: {},
          thinking: [
            `✅ Forensic audit complete`,
            `Page created: ${pageUrl}`
          ]
        });
      }

      return NextResponse.json({
        success: true,
        analysis,
        transactions,
        pageUrl: payload.ledgerId ? `https://notion.so/${payload.ledgerId.replace(/-/g, '')}` : null
      });
    }

    return NextResponse.json({ success: false, error: `Unknown mode: ${mode}` }, { status: 400 });

  } catch (err: any) {
    console.error("[SENTINEL_API]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
