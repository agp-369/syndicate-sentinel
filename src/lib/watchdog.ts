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
    const setup = await mcp.searchDatabases();
    const jobsDataSourceId = setup.jobsDataSourceId;

    if (!jobsDataSourceId) throw new Error("Career Ledger/Job Tracker not found via MCP");

    // 2. Query the Job Ledger for entries via MCP
    const queryRes = await mcp.queryDataSource(jobsDataSourceId, 50);
    const ledgerEntries = (queryRes as any)?.results || [];
    
    console.log(`[WATCHDOG_MCP] Found ${ledgerEntries.length} jobs to monitor.`);

    const results = [];
    let count = 0;
    for (const page of ledgerEntries) {
      if (count >= 5) break; // Increased limit

      const status = (page as any).properties?.Status?.select?.name || "";
      const url = (page as any).properties?.["Job URL"]?.url || "";
      
      // Autonomous Activation: Detect links with Researching or empty status
      if ((status.includes("Researching") || !status) && url && url.startsWith("http")) {
        console.log(`[WATCHDOG_MCP] Activating Forensic Sentinel for: ${url}`);
        try {
          const analysis = await runForensicAudit(url);
          
          // Write the Proof back to Notion and set status to AWAITING_REVIEW
          // Pass page.id to update the existing entry instead of creating a new one
          await mcp.logForensicAudit(jobsDataSourceId, analysis, url, page.id);
          
          results.push({ id: page.id, company: analysis.jobDetails.company, status: "forensics_complete" });
          count++;
        } catch (e) {
          console.error(`[WATCHDOG_MCP] Audit failed for ${page.id}:`, e);
        }
      }
    }

    return results;
  }
}
