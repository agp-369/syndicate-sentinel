import { NotionMCPGateway } from "./notion-mcp-gateway";
import type { MCPTransaction } from "./notion-mcp-gateway";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import * as cheerio from "cheerio";
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
  jobsDataSourceId?: string;
  skillsDataSourceId?: string;
  careerPageId?: string;
}

/**
 * 🛰️ NotionMCPClient v5.0 - CORE BACKEND ENGINE
 * Fixed: Robust Data Extraction, Infrastructure Persistence, Recursive Reading
 */
export class NotionMCPClient {
  public gateway: NotionMCPGateway;

  constructor(token: string) {
    this.gateway = new NotionMCPGateway(token);
  }

  /**
   * RECURSIVELY fetch all text content from blocks.
   * Ensures we see the ACTUAL content of your Notion pages.
   */
  async deepReadBlock(blockId: string, depth = 0): Promise<string> {
    if (depth > 2) return "";
    let text = "";
    try {
      const result = await this.gateway.callTool("notion-fetch", { block_id: blockId });
      const blocks = (result as any)?.results || [];
      for (const block of blocks) {
        const type = block.type;
        const content = block[type];
        if (content?.rich_text) {
          text += content.rich_text.map((t: any) => t.plain_text).join("") + "\n";
        }
        if (block.has_children) {
          text += await this.deepReadBlock(block.id, depth + 1);
        }
      }
    } catch (e) { console.warn(`[DEEP_READ] Error at ${blockId}`); }
    return text;
  }

  /**
   * RECOVER existing infrastructure to prevent duplicates and empty states.
   */
  async searchDatabases(onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const setup: WorkspaceSetup = {};
    try {
      // 1. Search for databases
      const result = await this.gateway.callTool("notion-search", {
        filter: { property: "object", value: "database" }
      }, onLog, ["Scanning for existing Forensic OS infrastructure..."]);

      for (const db of (result?.results ?? []) as any[]) {
        const title = (db.title?.[0]?.plain_text || db.name || "").toLowerCase();
        if (title.includes("job tracker") || title.includes("career ledger")) setup.jobsDataSourceId = db.id;
        else if (title.includes("skill dna") || title.includes("talent pool")) setup.skillsDataSourceId = db.id;
      }

      // 2. Search for the main dashboard page
      const pageRes = await this.gateway.callTool("notion-search", {
        query: "Forensic Career OS",
        filter: { property: "object", value: "page" }
      });
      if ((pageRes as any)?.results?.[0]) setup.careerPageId = (pageRes as any).results[0].id;

    } catch (e) { console.error("[BACKEND] Discovery failed."); }
    return setup;
  }

  /**
   * STRICT Profile Extraction - Follows your rules to prevent hallucination.
   */
  async discoverAndReadProfile(onLog?: (tx: MCPTransaction) => void): Promise<UserProfile> {
    const profile: UserProfile = {
      name: "", email: "", headline: "", summary: "", skills: [], techStack: [],
      yearsOfExperience: 0, currentRole: "", currentCompany: "", experience: [],
      education: [], goals: [], preferences: {},
    };

    try {
      // 1. Search for Resume/CV/Profile pages
      const searchRes = await this.gateway.callTool("notion-search", {
        query: "resume cv experience profile",
        filter: { property: "object", value: "page" },
        page_size: 10
      }, onLog, ["Deep-searching your Notion for career DNA..."]);

      let consolidatedText = "";
      const pages = (searchRes as any)?.results || [];
      
      for (const page of pages) {
        consolidatedText += await this.deepReadBlock(page.id);
      }

      // 2. Use Strict Rules Extractor first
      const { profile: strictProfile, confidence } = StrictDataExtractor.extractProfile(consolidatedText, "notion", "workspace");
      Object.assign(profile, strictProfile);

      // 3. Only use LLM if strict extraction found nothing, and with STRICT instructions
      if (profile.skills.length === 0 && consolidatedText.trim()) {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Strictly extract career data from text. DO NOT GUESS OR INFER.
If a field is explicitly stated, extract it. If it is NOT explicitly present in the text, return empty string for text fields, 0 for numbers, or [] for arrays. DO NOT invent skills.
Text: ${consolidatedText.substring(0, 8000)}
JSON Output Schema: { "name": string, "skills": string[], "yearsOfExperience": number, "currentRole": string }`;
        const aiRes = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        });
        const extracted = JSON.parse(aiRes.response.text().trim());
        profile.name = profile.name || extracted.name || "";
        profile.skills = extracted.skills || [];
        profile.yearsOfExperience = extracted.yearsOfExperience || 0;
        profile.currentRole = extracted.currentRole || "";
      }

    } catch (e) { console.error("[BACKEND] Profile sync failed."); }
    return profile;
  }

  /**
   * PROVISION with Persistence - Only creates what's missing.
   */
  async initializeWorkspace(parentPageId: string, onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const existing = await this.searchDatabases(onLog);
    if (existing.jobsDataSourceId && existing.skillsDataSourceId) return existing;

    try {
      if (!existing.jobsDataSourceId) {
        const jobsDb = await this.gateway.callTool("notion-create-database", {
          parent: { page_id: parentPageId },
          title: [{ text: { content: "🎯 Lumina: Job Tracker" } }],
          properties: {
            "Job Title": { title: {} },
            "Status": { select: { options: [
              { name: "🔍 Researching", color: "yellow" },
              { name: "🟡 AWAITING_REVIEW", color: "orange" },
              { name: "✅ Verified", color: "green" }
            ]}},
            "Company": { rich_text: {} },
            "Job URL": { url: {} }
          }
        }, onLog, ["Creating missing Job Tracker..."]);
        existing.jobsDataSourceId = jobsDb?.id;
      }
    } finally { await this.gateway.close(); }
    return existing;
  }

  async queryDataSource(dataSourceId: string, pageSize: number = 50, onLog?: (tx: MCPTransaction) => void) {
    return this.gateway.callTool("notion-query-data-sources", { database_id: dataSourceId, page_size: pageSize }, onLog);
  }

  async logForensicAudit(dataSourceId: string, analysis: ForensicReport, url: string, onLog?: (tx: MCPTransaction) => void): Promise<string> {
    try {
      const result = await this.gateway.callTool("notion-create-pages", {
        parent: { database_id: dataSourceId },
        properties: {
          "Job Title": { title: [{ text: { content: `${analysis.jobDetails.company}: ${analysis.jobDetails.title}` } }] },
          "Status": { select: { name: "🟡 AWAITING_REVIEW" } },
          "Company": { rich_text: [{ text: { content: analysis.jobDetails.company } }] },
          "Job URL": { url: url }
        },
        children: [
          { object: "block", type: "callout", callout: { rich_text: [{ text: { content: `🚨 FORENSIC VERDICT: ${analysis.verdict}` } }], icon: { emoji: "🛡️" }, color: "red_background" } }
        ]
      }, onLog);
      return result?.id || "";
    } finally { await this.gateway.close(); }
  }

  getTransactions(): MCPTransaction[] { return this.gateway.getTransactions(); }
}
