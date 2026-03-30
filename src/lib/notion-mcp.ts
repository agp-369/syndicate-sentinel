import { NotionMCPGateway } from "./notion-mcp-gateway";
import type { MCPTransaction } from "./notion-mcp-gateway";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { StrictDataExtractor } from "./data-extraction";

export type { MCPTransaction };

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface ForensicReport {
  verdict: "🟢 LEGITIMATE" | "🔴 SCAM RISK" | "🟡 GHOST JOB" | "⚪ INCONCLUSIVE";
  score: number;
  analysis: {
    flags: string[];
    hiddenSignals: string[];
    cultureMatch: string;
  };
  jobDetails: {
    title: string;
    company: string;
    summary: string;
    location?: string;
    salary?: string;
  };
}

export interface UserProfile {
  name: string;
  email: string;
  headline: string;
  summary: string;
  skills: string[];
  techStack: string[];
  yearsOfExperience: number;
  currentRole: string;
  currentCompany: string;
  experience: { role: string; company: string; duration: string; description?: string }[];
  education: { institution: string; degree: string; field: string; year: string }[];
  goals: string[];
  preferences: { location?: string; remote?: boolean; salary?: string; roles?: string[] };
}

export interface WorkspaceSetup {
  jobsDbId?: string;
  skillsDbId?: string;
  statePageId?: string;
}

/**
 * 🛰️ NotionMCPClient v6.0 - THE WINNING ENGINE
 * Fixed: Official Tool Naming, Persistent State, Recursive Reading
 */
export class NotionMCPClient {
  public gateway: NotionMCPGateway;

  constructor(token: string) {
    this.gateway = new NotionMCPGateway(token);
  }

  /**
   * Deep Read: Fetches all content from a page by ID.
   * Uses official 'notion-fetch' tool.
   */
  async deepReadContent(pageId: string, onLog?: (tx: MCPTransaction) => void): Promise<string> {
    try {
      const result = await this.gateway.callTool("notion-fetch", {
        url: `https://www.notion.so/${pageId.replace(/-/g, "")}`
      }, onLog, [`Deep-reading page context: ${pageId.substring(0, 8)}...`]);
      
      // Notion-fetch usually returns a markdown or text summary of the page content
      return (result as any)?.content || (result as any)?.text || "";
    } catch (e) {
      console.warn(`[DEEP_READ] Failed for ${pageId}`);
      return "";
    }
  }

  /**
   * State Recovery: Searches for Lumina infrastructure using official 'notion-search'.
   */
  async recoverInfrastructure(onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const setup: WorkspaceSetup = {};
    try {
      const result = await this.gateway.callTool("notion-search", {
        query: "Lumina",
        filter: { property: "object", value: "database" }
      }, onLog, ["Scanning for existing Lumina databases..."]);

      const items = (result as any)?.results || [];
      for (const item of items) {
        const title = (item.title?.[0]?.plain_text || item.name || "").toLowerCase();
        if (title.includes("job tracker") || title.includes("career ledger")) setup.jobsDbId = item.id;
        else if (title.includes("skill dna") || title.includes("talent pool")) setup.skillsDbId = item.id;
      }

      // Check for state page
      const pageRes = await this.gateway.callTool("notion-search", {
        query: ".lumina-state",
        filter: { property: "object", value: "page" }
      });
      if ((pageRes as any)?.results?.[0]) setup.statePageId = (pageRes as any).results[0].id;

    } catch (e) {
      console.error("[RECOVERY] Handshake failed.");
    }
    return setup;
  }

  /**
   * Provisioning: Builds the Career OS using official 'notion-create-database'.
   */
  async initializeWorkspace(parentPageId: string, onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const existing = await this.recoverInfrastructure(onLog);
    if (existing.jobsDbId && existing.skillsDbId) return existing;

    try {
      // 1. Create Job Tracker
      if (!existing.jobsDbId) {
        const jobsDb = await this.gateway.callTool("notion-create-database", {
          parent: { page_id: parentPageId },
          title: [{ type: "text", text: { content: "🎯 Lumina: Job Tracker" } }],
          properties: {
            "Job Title": { title: {} },
            "Status": { select: { options: [
              { name: "🔍 Researching", color: "yellow" },
              { name: "🟡 REVIEW", color: "orange" },
              { name: "✅ VERIFIED", color: "green" },
              { name: "🚩 SCAM", color: "red" }
            ]}},
            "Company": { rich_text: {} },
            "Job URL": { url: {} },
            "Trust Score": { number: { format: "percent" } }
          }
        }, onLog, ["Provisioning Forensic Job Tracker..."]);
        existing.jobsDbId = jobsDb?.id;
      }

      // 2. Create Skill DNA
      if (!existing.skillsDbId) {
        const skillsDb = await this.gateway.callTool("notion-create-database", {
          parent: { page_id: parentPageId },
          title: [{ type: "text", text: { content: "🧬 Lumina: Skill DNA" } }],
          properties: {
            "Skill": { title: {} },
            "Category": { select: { options: [
              { name: "Technical", color: "blue" },
              { name: "Soft Skill", color: "yellow" }
            ]}},
            "Proficiency": { number: { format: "percent" } }
          }
        }, onLog, ["Provisioning Skill DNA database..."]);
        existing.skillsDbId = skillsDb?.id;
      }

      // 3. Create Persistent State Page
      const statePage = await this.gateway.callTool("notion-create-pages", {
        parent: { page_id: parentPageId },
        properties: {
          title: [{ type: "text", text: { content: ".lumina-state" } }]
        },
        children: [
          { object: "block", type: "code", code: { language: "json", rich_text: [{ type: "text", text: { content: JSON.stringify(existing, null, 2) } }] } }
        ]
      }, onLog, ["Saving infrastructure state to Notion..."]);
      existing.statePageId = statePage?.id;

    } catch (e) {
      console.error("[PROVISION] Failed to build OS.");
    } finally {
      await this.gateway.close();
    }
    return existing;
  }

  /**
   * Deep Sync: Reads shared pages and extracts DNA using strict rules.
   */
  async discoverAndReadProfile(onLog?: (tx: MCPTransaction) => void) {
    try {
      const searchRes = await this.gateway.callTool("notion-search", {
        filter: { property: "object", value: "page" },
        page_size: 20
      }, onLog, ["Scanning workspace for Resume/CV data..."]);

      const pages = (searchRes as any)?.results || [];
      let fullContent = "";

      for (const page of pages) {
        const title = (page.properties?.title?.title?.[0]?.plain_text || "").toLowerCase();
        if (title.includes("resume") || title.includes("cv") || title.includes("profile") || title.includes("experience")) {
          fullContent += await this.deepReadContent(page.id, onLog);
        }
      }

      if (fullContent.trim()) {
        const { profile } = StrictDataExtractor.extractProfile(fullContent, "notion", "workspace");
        return profile;
      }
    } catch (e) {
      console.error("[PROFILE_SYNC] Failed.");
    } finally {
      await this.gateway.close();
    }
    return null;
  }

  async queryDataSource(dataSourceId: string, pageSize: number = 50, onLog?: (tx: MCPTransaction) => void) {
    return this.gateway.callTool("notion_query_database", { database_id: dataSourceId, page_size: pageSize }, onLog, ["Fetching items from Notion database..."]);
  }

  async logForensicAudit(jobsDbId: string, analysis: ForensicReport, url: string, updatePageId?: string, onLog?: (tx: MCPTransaction) => void) {
    try {
      if (updatePageId) {
        return await this.gateway.callTool("notion-update-page", {
          page_id: updatePageId,
          properties: {
            "Status": { select: { name: "🟡 REVIEW" } },
            "Trust Score": { number: (analysis.score || 50) / 100 }
          }
        }, onLog, ["Updating existing job entry with forensic proof..."]);
      }

      return await this.gateway.callTool("notion-create-pages", {
        parent: { database_id: jobsDbId },
        properties: {
          "Job Title": { title: [{ text: { content: `${analysis.jobDetails.company}: ${analysis.jobDetails.title}` } }] },
          "Status": { select: { name: "🟡 REVIEW" } },
          "Trust Score": { number: (analysis.score || 50) / 100 },
          "Company": { rich_text: [{ text: { content: analysis.jobDetails.company } }] },
          "Job URL": { url: url }
        },
        children: [
          { object: "block", type: "callout", callout: { rich_text: [{ type: "text", text: `🚨 FORENSIC VERDICT: ${analysis.verdict}` }], icon: { emoji: "🛡️" } } }
        ]
      }, onLog, ["Writing forensic proof to Notion..."]);
    } finally {
      await this.gateway.close();
    }
  }

  getTransactions(): MCPTransaction[] { return this.gateway.getTransactions(); }
}
