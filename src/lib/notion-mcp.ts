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
  experience: { role: string; company: string; duration: string; description?: string }[];
  education: { institution: string; degree: string; field: string; year: string }[];
  goals: string[];
  preferences: { location?: string; remote?: boolean; salary?: string; roles?: string[] };
}

export interface WorkspaceSetup {
  careerPageId?: string;
  jobsDataSourceId?: string;
  skillsDataSourceId?: string;
  systemStateId?: string;
}

/**
 * 🛰️ NotionMCPClient v4.0 - TRUE CORE POWER
 * Features: Deep Block Reading, State Persistence, Robust Schema Mapping
 */
export class NotionMCPClient {
  public gateway: NotionMCPGateway;

  constructor(token: string) {
    this.gateway = new NotionMCPGateway(token);
  }

  /**
   * RECURSIVELY fetch all text content from a page's blocks.
   * This is the "True Core Power" required to actually 'read' Notion.
   */
  async deepReadPage(blockId: string, depth = 0, onLog?: (tx: MCPTransaction) => void): Promise<string> {
    if (depth > 3) return ""; // Prevent infinite loops or too much context
    
    let textContent = "";
    try {
      const result = await this.gateway.callTool("notion_fetch_block_children", {
        block_id: blockId
      }, onLog, [`Reading block layer ${depth}...`]);

      const blocks = (result as any)?.results || [];
      for (const block of blocks) {
        // Extract text from various block types
        const type = block.type;
        const content = block[type];
        
        if (content?.rich_text) {
          const blockText = content.rich_text.map((t: any) => t.plain_text).join("");
          textContent += blockText + "\n";
        }

        // If block has children (nested lists, etc), recurse
        if (block.has_children) {
          textContent += await this.deepReadPage(block.id, depth + 1, onLog);
        }
      }
    } catch (e) {
      console.warn(`[DEEP_READ] Failed for block ${blockId}:`, e);
    }
    return textContent;
  }

  /**
   * Provision or RECOVER existing Lumina infrastructure.
   */
  async initializeWorkspace(
    parentPageId: string,
    onLog?: (tx: MCPTransaction) => void
  ): Promise<WorkspaceSetup> {
    // 1. Check if we already have these databases (RECOVERY MODE)
    const existing = await this.searchDatabases(onLog);
    if (existing.jobsDataSourceId && existing.skillsDataSourceId) {
      onLog?.({ id: "recovery", timestamp: new Date().toISOString(), method: "agent/recovery", thinking: ["♻️ Existing Lumina infrastructure detected. Recovering system state..."] });
      return existing;
    }

    const setup: WorkspaceSetup = {};
    try {
      // Step 1: Jobs Tracker Database
      const jobsDb = await this.gateway.callTool("notion_create_database", {
        parent: { page_id: parentPageId },
        title: [{ type: "text", text: { content: "🎯 Lumina: Job Tracker" } }],
        properties: {
          "Job Title": { title: {} },
          "Status": { select: { options: [
            { name: "🔍 Researching", color: "yellow" },
            { name: "🟡 AWAITING_REVIEW", color: "orange" },
            { name: "✅ Verified", color: "green" },
            { name: "🚩 Scam Risk", color: "red" }
          ]}},
          "Company": { rich_text: {} },
          "Job URL": { url: {} },
          "Trust Score": { number: { format: "percent" } }
        }
      }, onLog, ["Provisioning Job Tracker..."]);
      setup.jobsDataSourceId = jobsDb?.id;

      // Step 2: Skill DNA Database
      const skillsDb = await this.gateway.callTool("notion_create_database", {
        parent: { page_id: parentPageId },
        title: [{ type: "text", text: { content: "🧬 Lumina: Skill DNA" } }],
        properties: {
          "Skill": { title: {} },
          "Category": { select: { options: [
            { name: "Technical", color: "blue" },
            { name: "Soft Skill", color: "yellow" },
            { name: "Tooling", color: "purple" }
          ]}},
          "Demand": { number: { format: "percent" } }
        }
      }, onLog, ["Provisioning Skill DNA..."]);
      setup.skillsDataSourceId = skillsDb?.id;

    } finally {
      await this.gateway.close();
    }
    return setup;
  }

  /**
   * Deep Discover & Extract Profile using strict rules.
   */
  async discoverAndReadProfile(onLog?: (tx: MCPTransaction) => void): Promise<UserProfile> {
    const profile: UserProfile = {
      name: "", email: "", headline: "", summary: "", skills: [], techStack: [],
      yearsOfExperience: 0, currentRole: "", currentCompany: "", experience: [],
      education: [], goals: [], preferences: {},
    };

    try {
      // 1. Search for potential profile sources
      const searchRes = await this.gateway.callTool("notion_search", {
        query: "resume cv profile experience",
        filter: { property: "object", value: "page" },
        page_size: 10
      }, onLog, ["Searching for profile data sources..."]);

      const targetPages = (searchRes as any)?.results || [];
      let consolidatedText = "";

      for (const page of targetPages) {
        onLog?.({ id: `read_${page.id}`, timestamp: new Date().toISOString(), method: "notion_fetch_block_children", thinking: [`🔍 Deep reading page: ${page.properties?.title?.title?.[0]?.plain_text || "Untitled"}`] });
        consolidatedText += await this.deepReadPage(page.id, 0, onLog);
      }

      if (consolidatedText.trim()) {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `You are a professional data extraction agent. Extract career data from the provided text.
RULES:
1. ONLY extract information explicitly present in the text.
2. DO NOT hallucinate. If a field is missing, use "" or [].
3. Format specifically for Lumina OS.
4. Output STRICT JSON:
{
  "name": "string",
  "headline": "string",
  "skills": ["string"],
  "yearsOfExperience": number,
  "currentRole": "string",
  "currentCompany": "string",
  "experience": [{"role": "string", "company": "string", "duration": "string"}]
}

TEXT:
${consolidatedText.substring(0, 10000)}`;

        const aiRes = await model.generateContent(prompt);
        const extracted = JSON.parse(aiRes.response.text().replace(/```json/g, "").replace(/```/g, "").trim());
        Object.assign(profile, extracted);
      }
    } catch (e) {
      console.error("[MCP_PROFILE] Failure:", e);
    } finally {
      await this.gateway.close();
    }
    return profile;
  }

  /**
   * Search for existing Lumina components to prevent duplicates.
   */
  async searchDatabases(onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const setup: WorkspaceSetup = {};
    try {
      const result = await this.gateway.callTool("notion_search", {
        filter: { property: "object", value: "database" }
      }, onLog, ["Scanning for existing infrastructure..."]);

      const items = (result as any)?.results || [];
      for (const item of items) {
        const title = (item.title?.[0]?.plain_text || "").toLowerCase();
        if (title.includes("job tracker")) setup.jobsDataSourceId = item.id;
        else if (title.includes("skill dna")) setup.skillsDataSourceId = item.id;
      }
    } catch (e) {
      console.warn("[SEARCH_DB] Failed, might be no databases yet.");
    }
    return setup;
  }

  async queryDataSource(dataSourceId: string, pageSize: number = 50, onLog?: (tx: MCPTransaction) => void) {
    return this.gateway.callTool("notion_query_database", {
      database_id: dataSourceId,
      page_size: pageSize
    }, onLog, ["Fetching items from Notion database..."]);
  }

  async logForensicAudit(dataSourceId: string, analysis: ForensicReport, url: string, onLog?: (tx: MCPTransaction) => void): Promise<string> {
    const statusName = "🟡 AWAITING_REVIEW";
    try {
      const result = await this.gateway.callTool("notion_create_page", {
        parent: { database_id: dataSourceId },
        properties: {
          "Job Title": { title: [{ text: { content: `${analysis.jobDetails.company}: ${analysis.jobDetails.title}` } }] },
          "Status": { select: { name: statusName } },
          "Trust Score": { number: (analysis.score || 50) / 100 },
          "Company": { rich_text: [{ text: { content: analysis.jobDetails.company } }] },
          "Job URL": { url: url }
        },
        children: [
          { object: "block", type: "callout", callout: { rich_text: [{ type: "text", text: { content: `🚨 FORENSIC VERDICT: ${analysis.verdict} (${analysis.score}%)` } }], icon: { emoji: "🛡️" }, color: "red_background" } },
          { object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "Investigation Proof" } }] } },
          ...analysis.analysis.flags.map(flag => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ type: "text", text: { content: flag } }] } }))
        ]
      }, onLog, ["Logging forensic proof to Notion..."]);
      return result?.id || "";
    } finally {
      await this.gateway.close();
    }
  }
}
