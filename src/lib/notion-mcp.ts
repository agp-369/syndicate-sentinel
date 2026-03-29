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
    if (depth > 1) return "";
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
        if (block.has_children && depth < 1) {
          text += await this.deepReadBlock(block.id, depth + 1);
        }
      }
    } catch (e) { /* silent fail for speed */ }
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

    } catch (e: any) { console.error("[BACKEND] Discovery failed.", e.message); }
    return setup;
  }

  /**
   * STRICT Profile Extraction - Follows your rules to prevent hallucination.
   */
  async discoverAndReadProfile(pageIds: string[] = [], onLog?: (tx: MCPTransaction) => void): Promise<UserProfile> {
    const profile: UserProfile = {
      name: "", email: "", headline: "", summary: "", skills: [], techStack: [],
      yearsOfExperience: 0, currentRole: "", currentCompany: "", experience: [],
      education: [], goals: [], preferences: {},
    };

    try {
      // Use only the first pageId to reduce API calls
      const targetId = pageIds && pageIds.length > 0 ? pageIds[0] : null;
      
      if (!targetId) {
        return profile;
      }

      // Quick read of first page only
      const text = await this.deepReadBlock(targetId);
      if (!text.trim()) {
        return profile;
      }

      // Extract using strict rules
      const { profile: strictProfile } = StrictDataExtractor.extractProfile(text, "notion", "workspace");
      Object.assign(profile, strictProfile);

      // LLM fallback if no skills found
      if (profile.skills.length === 0 && text.trim()) {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Extract career data from text. DO NOT INVENT. Return JSON: { "name": "", "skills": [], "yearsOfExperience": 0, "currentRole": "" }. Text: ${text.substring(0, 4000)}`;
        const aiRes = await model.generateContent(prompt);
        
        // Strip out annoying LLM markdown wrappers if present
        let responseText = aiRes.response.text().trim();
        responseText = responseText.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
        
        try {
          const extracted = JSON.parse(responseText);
          profile.name = profile.name || extracted.name || "";
          profile.skills = extracted.skills || [];
          profile.yearsOfExperience = extracted.yearsOfExperience || 0;
          profile.currentRole = extracted.currentRole || "";
        } catch (e) {
          console.error("Failed to parse AI response:", responseText);
        }
      }

    } catch (e: any) { console.error("[BACKEND] Profile sync failed.", e.message); }
    return profile;
  }

  /**
   * PROVISION with Persistence - Only creates what's missing.
   */
  async initializeWorkspace(parentPageId: string, onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const existing = await this.searchDatabases(onLog);
    const creationStamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    try {
      if (!existing.jobsDataSourceId) {
        const jobsDb = await this.gateway.callTool("notion-create-database", {
          parent: { type: "page_id", page_id: parentPageId },
          title: [{ type: "text", text: { content: `🎯 Lumina Job Tracker (${creationStamp})` } }],
          properties: {
            "Job Title": { title: {} },
            "Status": { select: { options: [
              { name: "🔍 Researching", color: "yellow" },
              { name: "🟡 AWAITING_REVIEW", color: "orange" },
              { name: "✅ Verified", color: "green" }
            ]}},
            "Company": { rich_text: {} },
            "Job URL": { url: {} },
            "Match Score": { number: { format: "percent" } }
          }
        }, onLog, ["Creating new Job Tracker..."]);
        existing.jobsDataSourceId = jobsDb?.id;
      }
      
      if (!existing.skillsDataSourceId) {
        const skillsDb = await this.gateway.callTool("notion-create-database", {
          parent: { type: "page_id", page_id: parentPageId },
          title: [{ type: "text", text: { content: `🧬 Lumina Skills DNA (${creationStamp})` } }],
          properties: {
            "Skill Name": { title: {} },
            "Proficiency": { select: { options: [
              { name: "Beginner", color: "red" },
              { name: "Intermediate", color: "yellow" },
              { name: "Expert", color: "green" }
            ]}},
            "Years": { number: { format: "number" } }
          }
        }, onLog, ["Creating new Skills DNA..."]);
        existing.skillsDataSourceId = skillsDb?.id;
      }
    } catch (e: any) {
      console.error("[BACKEND] Workspace initialization failed.", e.message);
    }
    return existing;
  }

  async queryDataSource(dataSourceId: string, pageSize: number = 50, onLog?: (tx: MCPTransaction) => void) {
    return this.gateway.callTool("notion-query-data-sources", { database_id: dataSourceId, page_size: pageSize }, onLog);
  }

  async logForensicAudit(dataSourceId: string, analysis: ForensicReport, url: string, existingPageId?: string, onLog?: (tx: MCPTransaction) => void): Promise<string> {
    try {
      const properties = {
        "Job Title": { title: [{ type: "text", text: { content: analysis.jobDetails.title } }] },
        "Status": { select: { name: "🟡 AWAITING_REVIEW" } },
        "Company": { rich_text: [{ type: "text", text: { content: analysis.jobDetails.company } }] },
        "Job URL": { url: url },
        "Match Score": { number: analysis.score / 100 }
      };

      if (existingPageId) {
        await this.gateway.callTool("notion-update-page", {
          page_id: existingPageId,
          properties
        }, onLog);
        return existingPageId;
      } else {
        const result = await this.gateway.callTool("notion-create-pages", {
          parent: { type: "database_id", database_id: dataSourceId },
          properties,
          children: [
            { object: "block", type: "callout", callout: { rich_text: [{ type: "text", text: { content: `🚨 FORENSIC VERDICT: ${analysis.verdict}` } }], icon: { type: "emoji", emoji: "🛡️" }, color: "red_background" } },
            { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: analysis.jobDetails.summary } }] } }
          ]
        }, onLog);
        return result?.id || "";
      }
    } catch (e: any) {
      console.error("[BACKEND] Forensic log failed.", e.message);
      return "";
    }
  }

  getTransactions(): MCPTransaction[] { return this.gateway.getTransactions(); }
}
