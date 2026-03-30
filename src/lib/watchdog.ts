import { GoogleGenerativeAI } from "@google/generative-ai";
import { NotionMCPClient } from "./notion-mcp";
import { runGroqForensic } from "./groq-intelligence";

export class SentinelWatchdog {
  private notionToken: string;
  public mcp: NotionMCPClient | null = null;

  constructor(notionToken: string) {
    this.notionToken = notionToken;
  }

  /**
   * Automatically scan the Jobs database via MCP for new entries and run forensics
   */
  async runFullScan() {
    this.mcp = new NotionMCPClient(this.notionToken);
    
    // 1. Find Lumina databases via MCP Protocol
    const setup = await this.mcp.recoverInfrastructure();
    const jobsDbId = setup.jobsDbId;

    if (!jobsDbId) throw new Error("Job Tracker not found in workspace.");

    // 2. Query for items with 'Researching' or empty status
    const queryRes = await this.mcp.queryDataSource(jobsDbId);
    const entries = (queryRes as any)?.results || [];
    
    const results = [];
    let count = 0;
    
    for (const page of entries) {
      if (count >= 5) break;

      const status = (page as any).properties?.Status?.select?.name || "";
      const url = (page as any).properties?.["Job URL"]?.url || "";
      
      if ((status.includes("Researching") || !status) && url.startsWith("http")) {
        try {
          const analysis = await runGroqForensic(url);
          
          // Official Protocol: Update the existing page instead of creating new ones
          await this.mcp.logForensicAudit(jobsDbId, analysis, url, page.id);
          
          results.push({ id: page.id, company: analysis.jobDetails.company, status: "forensics_complete" });
          count++;
        } catch (e) {
          console.error(`[WATCHDOG] Audit failed for ${page.id}`);
        }
      }
    }

    return results;
  }
}
