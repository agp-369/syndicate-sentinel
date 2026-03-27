import { GoogleGenerativeAI } from "@google/generative-ai";
import { NotionMCPClient } from "./notion-mcp";
import { JobRecommendationEngine } from "./job-engine";

export class SentinelWatchdog {
  private notionToken: string;
  private genAI: GoogleGenerativeAI;

  constructor(notionToken: string) {
    this.notionToken = notionToken;
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  /**
   * Automatically scan the Jobs database via MCP for new entries and run forensics
   */
  async runFullScan(careerPageId: string, profile: any) {
    const mcp = new NotionMCPClient(this.notionToken);
    const engine = new JobRecommendationEngine();
    
    // 1. Find Lumina databases via MCP
    const setup = await mcp.searchDatabases();
    if (!setup.jobLedgerId) throw new Error("Career Ledger not found via MCP");

    // 2. Query the Job Ledger for entries via MCP
    const ledgerEntries = await mcp.queryDatabase(setup.jobLedgerId);
    
    console.log(`[WATCHDOG_MCP] Found ${ledgerEntries.length} jobs to monitor.`);

    const results = [];
    let count = 0;
    for (const page of ledgerEntries) {
      if (count >= 3) break; // Throttle to stay under gateway limits

      const status = (page as any).properties?.Status?.select?.name;
      const url = (page as any).properties?.["Job URL"]?.url;
      
      // If it's awaiting review and has a URL, we can run a deep forensic audit
      if (status === "🟡 AWAITING_REVIEW" && url) {
        console.log(`[WATCHDOG_MCP] Performing forensic audit on: ${url}`);
        try {
          const analysis = await mcp.runForensicAudit(url);
          
          // Log results back to the page via MCP
          await mcp.logForensicAudit(setup.jobLedgerId, analysis, url);
          
          results.push({ id: page.id, status: "analyzed" });
          count++;
        } catch (e) {
          console.error(`[WATCHDOG_MCP] Analysis failed for ${page.id}:`, e);
        }
      }
    }

    return results;
  }
}
