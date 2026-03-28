import { NotionMCPGateway } from "./notion-mcp-gateway";
import type { MCPTransaction } from "./notion-mcp-gateway";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import * as cheerio from "cheerio";

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
  experience: { role: string; company: string; duration: string; description?: string; skills?: string[] }[];
  education: { institution: string; degree: string; field: string; year: string }[];
  goals: string[];
  preferences: { location?: string; remote?: boolean; salary?: string; roles?: string[] };
}

export interface WorkspaceSetup {
  jobLedgerId?: string;
  talentPoolId?: string;
  careerRoadmapId?: string;
  agentLogId?: string;
}

/**
 * 🛰️ NotionMCPClient v3.0 (Compatible with Notion MCP v2.0 / API 2025-09-03)
 */
export class NotionMCPClient {
  public gateway: NotionMCPGateway;

  constructor(token: string) {
    this.gateway = new NotionMCPGateway(token);
  }

  /**
   * Provision a complete Lumina workspace in Notion.
   * Uses v2.0 'create-a-data-source' tool.
   */
  async initializeWorkspace(
    parentPageId: string,
    onLog?: (tx: MCPTransaction) => void
  ): Promise<WorkspaceSetup> {
    const setup: WorkspaceSetup = {};

    try {
      // Step 0 — Handshake
      await this.gateway.listTools(onLog);

      // Step 1 — Career Ledger (Data Source)
      const ledger = await this.gateway.callTool(
        "create-a-data-source",
        {
          parent: { page_id: parentPageId },
          name: "Lumina: Career Ledger",
          icon: { type: "emoji", emoji: "🛰️" },
          schema: {
            "Job Title": { type: "title" },
            "Status": {
              type: "select",
              select: {
                options: [
                  { name: "🟢 VERIFIED", color: "green" },
                  { name: "🟡 AWAITING_REVIEW", color: "yellow" },
                  { name: "🔴 SCAM_RISK", color: "red" },
                  { name: "⚪ APPLIED", color: "blue" },
                  { name: "🏆 OFFER", color: "purple" },
                ],
              },
            },
            "Trust Score": { type: "number", number: { format: "percent" } },
            "Company": { type: "rich_text" },
            "Location": { type: "rich_text" },
            "Salary Range": { type: "rich_text" },
            "Job URL": { type: "url" },
          },
        },
        onLog
      );
      setup.jobLedgerId = ledger?.id;

      // Step 2 — Talent Pool
      const pool = await this.gateway.callTool(
        "create-a-data-source",
        {
          parent: { page_id: parentPageId },
          name: "Lumina: Talent Pool",
          icon: { type: "emoji", emoji: "👥" },
          schema: {
            "Name": { type: "title" },
            "Current Role": { type: "rich_text" },
            "Skills": { type: "multi_select" },
            "Match Score": { type: "number", number: { format: "percent" } },
          },
        },
        onLog
      );
      setup.talentPoolId = pool?.id;

      // Step 3 — Career Roadmaps
      const roadmap = await this.gateway.callTool(
        "create-a-data-source",
        {
          parent: { page_id: parentPageId },
          name: "Lumina: Career Roadmaps",
          icon: { type: "emoji", emoji: "🗺️" },
          schema: {
            "Milestone": { type: "title" },
            "Phase": { type: "select" },
            "Progress": { type: "number", number: { format: "percent" } },
          },
        },
        onLog
      );
      setup.careerRoadmapId = roadmap?.id;

      // Step 4 — Welcome page content
      await this.gateway.callTool(
        "notion_append_block_children",
        {
          block_id: parentPageId,
          children: [
            {
              object: "block",
              type: "callout",
              callout: {
                rich_text: [{ type: "text", text: { content: "🌌 LUMINA CAREER OS v3.0 ACTIVE — Built on Notion MCP v2.0 (API 2025-09-03). All interactions use native Data Source tools." } }],
                icon: { emoji: "🚀" },
                color: "purple_background",
              },
            },
          ],
        },
        onLog
      );
    } finally {
      await this.gateway.close();
    }

    return setup;
  }

  /** Read user profile from their Notion workspace using ONLY MCP tools */
  async discoverAndReadProfile(onLog?: (tx: MCPTransaction) => void): Promise<UserProfile> {
    const profile: UserProfile = {
      name: "", email: "", headline: "", summary: "", skills: [], techStack: [],
      yearsOfExperience: 0, currentRole: "", currentCompany: "", experience: [],
      education: [], goals: [], preferences: {},
    };

    try {
      // 1. Search for profile pages (Updated filter: data_source instead of database)
      const searchResult = await this.gateway.callTool("notion_search", { 
        filter: { property: "object", value: "page" },
        page_size: 50 
      }, onLog);

      const targetPages: string[] = [];
      for (const page of (searchResult?.results ?? []) as any[]) {
        const title = (
          page.properties?.title?.title?.[0]?.plain_text ?? 
          page.properties?.Name?.title?.[0]?.plain_text ?? 
          ""
        ).toLowerCase();
        
        if (title.includes("resume") || title.includes("profile") || title.includes("experience")) {
          targetPages.push(page.id);
        }
      }

      const fullText: string[] = [];
      for (const pageId of targetPages.slice(0, 3)) {
        try {
          const pageData = await this.gateway.callTool("notion_read_page", { page_id: pageId }, onLog);
          const content = (pageData as any).content || "";
          if (typeof content === "string") fullText.push(content);
        } catch (e) { /* skip */ }
      }

      if (fullText.length > 0) {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const aiRes = await model.generateContent(`Extract professional profile JSON from: ${fullText.join("\n").substring(0, 5000)}`);
        const extracted = JSON.parse(aiRes.response.text().replace(/```json/g, "").replace(/```/g, "").trim());
        Object.assign(profile, extracted);
      }
    } finally {
      await this.gateway.close();
    }
    return profile;
  }

  /** Search Notion workspace for existing Lumina data sources via MCP. */
  async searchDatabases(onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const setup: WorkspaceSetup = {};
    try {
      // Updated filter: 'data_source' as per documentation
      const result = await this.gateway.callTool("notion_search", { 
        filter: { property: "object", value: "data_source" } 
      }, onLog);

      for (const item of (result?.results ?? []) as any[]) {
        const title: string = (
          item.name ?? 
          item.title?.[0]?.plain_text ?? 
          ""
        ).toLowerCase();
        
        if (title.includes("ledger")) setup.jobLedgerId = item.id;
        else if (title.includes("talent")) setup.talentPoolId = item.id;
        else if (title.includes("roadmap")) setup.careerRoadmapId = item.id;
      }
    } catch (e) {
      // Fallback to broad search if filter fails
      const result = await this.gateway.callTool("notion_search", { page_size: 100 }, onLog);
      for (const item of (result?.results ?? []) as any[]) {
        const title = (item.name || item.title?.[0]?.plain_text || "").toLowerCase();
        if (title.includes("ledger")) setup.jobLedgerId = item.id;
      }
    } finally {
      await this.gateway.close();
    }
    return setup;
  }

  /** Query a data source via MCP (Updated tool name and parameter) */
  async queryDatabase(dataSourceId: string, onLog?: (tx: MCPTransaction) => void): Promise<any[]> {
    let result: any = null;
    try {
      // Updated tool: 'query-data-source'
      // Updated parameter: 'data_source_id'
      result = await this.gateway.callTool("query-data-source", { 
        data_source_id: dataSourceId, 
        page_size: 50 
      }, onLog);
    } catch (e) {
      console.error(`[MCP_QUERY] Failed:`, e);
    } finally {
      await this.gateway.close();
    }
    return result?.results ?? [];
  }

  async logForensicAudit(ledgerId: string, analysis: ForensicReport, url: string, onLog?: (tx: MCPTransaction) => void): Promise<string> {
    const statusName = analysis.verdict.includes("LEGITIMATE") ? "🟢 VERIFIED" : "🔴 SCAM_RISK";
    let pageId = "";
    try {
      // notion_create_page remains the same or mapped to create-page
      const result = await this.gateway.callTool("notion_create_page", {
          parent: { data_source_id: ledgerId }, // Updated parameter
          properties: {
            "Job Title": { title: [{ text: { content: `${analysis.jobDetails.company}: ${analysis.jobDetails.title}` } }] },
            "Company": { rich_text: [{ text: { content: analysis.jobDetails.company } }] },
            "Status": { select: { name: statusName } },
            "Trust Score": { number: (analysis.score || 50) / 100 },
            "Job URL": { url },
          },
          children: [
            { object: "block", type: "callout", callout: { rich_text: [{ type: "text", text: { content: `FORENSIC VERDICT: ${analysis.verdict}` } }], icon: { emoji: "🛰️" } } }
          ],
        }, onLog);
      pageId = result?.id || "";
    } finally { await this.gateway.close(); }
    return `https://notion.so/${pageId.replace(/-/g, "")}`;
  }

  getTransactions(): MCPTransaction[] { return this.gateway.getTransactions(); }
}
