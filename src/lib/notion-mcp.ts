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

export class NotionMCPClient {
  public gateway: NotionMCPGateway;

  constructor(token: string) {
    this.gateway = new NotionMCPGateway(token);
  }

  /**
   * Provision a complete Lumina workspace in Notion.
   */
  async initializeWorkspace(
    parentPageId: string,
    onLog?: (tx: MCPTransaction) => void
  ): Promise<WorkspaceSetup> {
    const setup: WorkspaceSetup = {};

    try {
      await this.gateway.listTools(onLog);

      // Step 1 — Career Ledger
      const ledger = await this.gateway.callTool(
        "notion_create_database",
        {
          parent: { page_id: parentPageId },
          title: [{ type: "text", text: { content: "Lumina: Career Ledger" } }],
          icon: { type: "emoji", emoji: "🛰️" },
          properties: {
            "Job Title": { title: {} },
            "Status": {
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
            "Trust Score": { number: { format: "percent" } },
            "Company": { rich_text: {} },
            "Location": { rich_text: {} },
            "Salary Range": { rich_text: {} },
            "Job URL": { url: {} },
            "Applied Date": { date: {} },
            "Interview Stage": {
              select: {
                options: [
                  { name: "Not Applied", color: "gray" },
                  { name: "Applied", color: "blue" },
                  { name: "Phone Screen", color: "yellow" },
                  { name: "Technical", color: "orange" },
                  { name: "Final Round", color: "purple" },
                  { name: "Offer Received", color: "green" },
                ],
              },
            },
          },
        },
        onLog
      );
      setup.jobLedgerId = ledger?.id;

      // Step 2 — Talent Pool
      const pool = await this.gateway.callTool(
        "notion_create_database",
        {
          parent: { page_id: parentPageId },
          title: [{ type: "text", text: { content: "Lumina: Talent Pool" } }],
          icon: { type: "emoji", emoji: "👥" },
          properties: {
            "Name": { title: {} },
            "Current Role": { rich_text: {} },
            "Target Role": { rich_text: {} },
            "Skills": { multi_select: {} },
            "Match Score": { number: { format: "percent" } },
            "Status": {
              select: {
                options: [
                  { name: "Active", color: "green" },
                  { name: "Exploring", color: "yellow" },
                  { name: "Placed", color: "blue" },
                ],
              },
            },
          },
        },
        onLog
      );
      setup.talentPoolId = pool?.id;

      // Step 3 — Career Roadmaps
      const roadmap = await this.gateway.callTool(
        "notion_create_database",
        {
          parent: { page_id: parentPageId },
          title: [{ type: "text", text: { content: "Lumina: Career Roadmaps" } }],
          icon: { type: "emoji", emoji: "🗺️" },
          properties: {
            "Milestone": { title: {} },
            "Phase": {
              select: {
                options: [
                  { name: "Foundation", color: "blue" },
                  { name: "Growth", color: "yellow" },
                  { name: "Mastery", color: "green" },
                ],
              },
            },
            "Target Date": { date: {} },
            "Progress": { number: { format: "percent" } },
            "Status": {
              select: {
                options: [
                  { name: "Not Started", color: "gray" },
                  { name: "In Progress", color: "blue" },
                  { name: "Completed", color: "green" },
                ],
              },
            },
          },
        },
        onLog
      );
      setup.careerRoadmapId = roadmap?.id;

      // Step 4 — Agent Audit Log
      const auditLog = await this.gateway.callTool(
        "notion_create_database",
        {
          parent: { page_id: parentPageId },
          title: [{ type: "text", text: { content: "Lumina: Agent Audit Log" } }],
          icon: { type: "emoji", emoji: "📊" },
          properties: {
            "Event": { title: {} },
            "Timestamp": { date: {} },
            "Agent": {
              select: {
                options: [
                  { name: "Forensic Sentinel", color: "red" },
                  { name: "Strategy Oracle", color: "blue" },
                  { name: "Roadmap Architect", color: "green" },
                ],
              },
            },
            "Confidence": { number: { format: "percent" } },
            "Verdict": {
              select: {
                options: [
                  { name: "Success", color: "green" },
                  { name: "Warning", color: "yellow" },
                  { name: "Error", color: "red" },
                ],
              },
            },
          },
        },
        onLog
      );
      setup.agentLogId = auditLog?.id;

      // Step 5 — Welcome page content
      await this.gateway.callTool(
        "notion_append_block_children",
        {
          block_id: parentPageId,
          children: [
            {
              object: "block",
              type: "callout",
              callout: {
                rich_text: [{ type: "text", text: { content: "🌌 LUMINA CAREER OS ACTIVE — Autonomous career intelligence via Notion MCP. Every entry in this workspace was written by AI agents using the Model Context Protocol (StreamableHTTP transport)." } }],
                icon: { emoji: "🚀" },
                color: "purple_background",
              },
            },
            { object: "block", type: "divider", divider: {} },
            {
              object: "block",
              type: "heading_2",
              heading_2: { rich_text: [{ type: "text", text: { content: "🕵️ How to Use Lumina" } }] },
            },
            {
              object: "block",
              type: "numbered_list_item",
              numbered_list_item: { rich_text: [{ type: "text", text: { content: "Paste any job posting URL into the Lumina dashboard" } }] },
            },
            {
              object: "block",
              type: "numbered_list_item",
              numbered_list_item: { rich_text: [{ type: "text", text: { content: "Watch the Forensic Sentinel scrape, score, and flag the job in real-time" } }] },
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
      // Robust discovery: Search without filters first, then handle multiple schemas
      const searchResult = await this.gateway.callTool("notion_search", { page_size: 50 }, onLog);

      const targetPages: string[] = [];
      for (const page of (searchResult?.results ?? []) as any[]) {
        const title = (
          page.properties?.title?.title?.[0]?.plain_text ?? 
          page.properties?.Name?.title?.[0]?.plain_text ?? 
          (page.title ? (page.title[0]?.plain_text || page.title[0]?.text?.content) : "") ??
          ""
        ).toLowerCase();
        
        if (title.includes("resume") || title.includes("cv") || title.includes("profile") || title.includes("about me") || title.includes("experience")) {
          targetPages.push(page.id);
        }
      }

      const fullText: string[] = [];
      for (const pageId of targetPages.slice(0, 5)) {
        try {
          const pageData = await this.gateway.callTool("notion_read_page", { page_id: pageId }, onLog);
          const content = (pageData as any).content || "";
          if (typeof content === "string") fullText.push(content);
          else if (Array.isArray(content)) {
            content.forEach(c => {
              if (c.type === "text" && c.text) fullText.push(c.text);
              else if (typeof c === "string") fullText.push(c);
            });
          }
        } catch (e) { console.warn(`Failed to read page ${pageId}`); }
      }

      if (fullText.length > 0) {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const extractionPrompt = `Extract professional profile data from text: ${fullText.join("\n").substring(0, 8000)}... Output JSON format.`;
        const aiRes = await model.generateContent(extractionPrompt);
        const extracted = JSON.parse(aiRes.response.text().replace(/```json/g, "").replace(/```/g, "").trim());
        Object.assign(profile, extracted);
      }
    } catch (e) {
      console.error("[MCP_PROFILE_READ] Error:", e);
    } finally {
      await this.gateway.close();
    }
    return profile;
  }

  /** Search Notion workspace for existing Lumina databases via MCP. */
  async searchDatabases(onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const setup: WorkspaceSetup = {};
    const filterTypes = ["database", "data_source"];
    
    for (const filterVal of filterTypes) {
      try {
        const result = await this.gateway.callTool("notion_search", { filter: { property: "object", value: filterVal } }, onLog);
        for (const item of (result?.results ?? []) as any[]) {
          const title: string = (
            item.title?.[0]?.plain_text ?? 
            item.title?.[0]?.text?.content ?? 
            item.properties?.title?.title?.[0]?.plain_text ?? 
            item.properties?.Name?.title?.[0]?.plain_text ?? 
            (item.properties?.title ? "Untitled" : "")
          ).toLowerCase();
          
          if (title.includes("ledger")) setup.jobLedgerId = item.id;
          else if (title.includes("talent") || title.includes("pool")) setup.talentPoolId = item.id;
          else if (title.includes("roadmap")) setup.careerRoadmapId = item.id;
          else if (title.includes("audit") || title.includes("agent log")) setup.agentLogId = item.id;
        }
        if (setup.jobLedgerId) break;
      } catch (e) { console.warn(`Filter '${filterVal}' failed`); }
    }
    await this.gateway.close();
    return setup;
  }

  async logForensicAudit(ledgerId: string, analysis: ForensicReport, url: string, onLog?: (tx: MCPTransaction) => void): Promise<string> {
    const statusName = analysis.verdict.includes("LEGITIMATE") ? "🟢 VERIFIED" : analysis.verdict.includes("SCAM") ? "🔴 SCAM_RISK" : "🟡 AWAITING_REVIEW";
    let pageId = "";
    try {
      const result = await this.gateway.callTool("notion_create_page", {
          parent: { database_id: ledgerId },
          properties: {
            "Job Title": { title: [{ text: { content: `${analysis.jobDetails.company}: ${analysis.jobDetails.title}` } }] },
            "Company": { rich_text: [{ text: { content: analysis.jobDetails.company } }] },
            "Status": { select: { name: statusName } },
            "Trust Score": { number: (analysis.score || 50) / 100 },
            "Job URL": { url },
          },
          children: [
            { object: "block", type: "callout", callout: { rich_text: [{ type: "text", text: { content: `FORENSIC VERDICT: ${analysis.verdict}` } }], icon: { emoji: "🛰️" } } },
            { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: analysis.jobDetails.summary } }] } }
          ],
        }, onLog);
      pageId = result?.id || "";
    } finally { await this.gateway.close(); }
    return `https://notion.so/${pageId.replace(/-/g, "")}`;
  }

  async queryDatabase(databaseId: string, onLog?: (tx: MCPTransaction) => void): Promise<any[]> {
    let result: any = null;
    try {
      // Official Notion MCP tool name is 'notion_query_database'
      // Schema: { database_id: string, query?: object, sort?: object, page_size?: number }
      result = await this.gateway.callTool("notion_query_database", { 
        database_id: databaseId, 
        page_size: 50 
      }, onLog);
    } catch (e) {
      console.error(`[MCP_QUERY] Failed database ${databaseId}:`, e);
    } finally {
      await this.gateway.close();
    }
    return result?.results ?? [];
  }

  /** Robust workspace discovery - handles multiple Notion object schemas */
  async searchWorkspace(query?: string, filter?: any, onLog?: (tx: MCPTransaction) => void): Promise<any[]> {
    try {
      const result = await this.gateway.callTool("notion_search", {
        query,
        filter,
        page_size: 100
      }, onLog);
      return result?.results ?? [];
    } catch (e) {
      console.error("[MCP_SEARCH] Error:", e);
      return [];
    }
  }

  getTransactions(): MCPTransaction[] { return this.gateway.getTransactions(); }
}
