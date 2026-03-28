import { GoogleGenerativeAI } from "@google/generative-ai";
import { NotionMCPClient } from "./notion-mcp";
import { JobRecommendationEngine } from "./job-engine";
import { runForensicAudit } from "./intelligence";

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
    
    // 1. Find Lumina databases via MCP
    const searchRes = await mcp.searchWorkspace("Job Tracker");
    const jobsDb = (searchRes as any)?.results?.find((item: any) => 
      item.object === "data_source" || item.object === "database" || 
      (item.title?.[0]?.plain_text || item.name)?.includes("Job")
    );

    if (!jobsDb) throw new Error("Career Ledger/Job Tracker not found via MCP");

    const jobsDataSourceId = jobsDb.id;

    // 2. Query the Job Ledger for entries via MCP
    const queryRes = await mcp.queryDataSource(jobsDataSourceId, 50);
    const ledgerEntries = (queryRes as any)?.results || [];
    
    console.log(`[WATCHDOG_MCP] Found ${ledgerEntries.length} jobs to monitor.`);

    const results = [];
    let count = 0;
    for (const page of ledgerEntries) {
      if (count >= 3) break; // Throttle to stay under gateway limits

      const status = (page as any).properties?.Status?.select?.name || "🔍 Researching";
      const url = (page as any).properties?.["Job URL"]?.url || (page as any).url; // Fallback if no specific prop
      
      // If it's awaiting review and has a URL, we can run a deep forensic audit
      if ((status.includes("AWAITING_REVIEW") || status.includes("Researching")) && url && url.startsWith("http")) {
        console.log(`[WATCHDOG_MCP] Performing forensic audit on: ${url}`);
        try {
          const analysis = await runForensicAudit(url);
          
          // Log results back to the page via MCP
          await mcp.logForensicAudit(jobsDataSourceId, analysis, url);
          
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
