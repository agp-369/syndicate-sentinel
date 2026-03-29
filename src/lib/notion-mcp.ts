import { NotionMCPGateway } from "./notion-mcp-gateway";
import type { MCPTransaction } from "./notion-mcp-gateway";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { runForensicAudit } from "./intelligence";
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
  education: { institution?: string; degree?: string; field?: string; year?: string }[];
  goals: string[];
  preferences: { location?: string; remote?: boolean; salary?: string; roles?: string[] };
}

export interface WorkspaceSetup {
  jobsDataSourceId?: string;
  skillsDataSourceId?: string;
  careerPageId?: string;
}

/**
 * 🛰️ NotionMCPClient v6.0 - CORE BACKEND ENGINE
 * Fixed: Robust Data Extraction, Infrastructure Persistence, Recursive Reading, Data Saving
 */
export class NotionMCPClient {
  public gateway: NotionMCPGateway;

  constructor(token: string) {
    this.gateway = new NotionMCPGateway(token);
  }

  /**
   * RECURSIVELY fetch all text content from blocks.
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
    } catch (e) {}
    return text;
  }

  /**
   * RECOVER existing infrastructure to prevent duplicates.
   */
  async searchDatabases(onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const setup: WorkspaceSetup = {};
    try {
      const result = await this.gateway.callTool("notion-search", {
        filter: { property: "object", value: "database" }
      }, onLog, ["Scanning for existing Forensic OS infrastructure..."]);

      for (const db of (result?.results ?? []) as any[]) {
        const title = (db.title?.[0]?.plain_text || db.name || "").toLowerCase();
        if (title.includes("job") || title.includes("tracker") || title.includes("ledger")) {
          setup.jobsDataSourceId = db.id;
        }
        if (title.includes("skill") || title.includes("dna") || title.includes("talent")) {
          setup.skillsDataSourceId = db.id;
        }
      }

      const pageRes = await this.gateway.callTool("notion-search", {
        filter: { property: "object", value: "page" }
      });
      
      for (const page of (pageRes?.results ?? []) as any[]) {
        const title = (page.properties?.title?.title?.[0]?.plain_text || "").toLowerCase();
        if (title.includes("career") || title.includes("os") || title.includes("dashboard") || title.includes("lumina")) {
          setup.careerPageId = page.id;
          break;
        }
      }

    } catch (e: any) { console.error("[BACKEND] Discovery failed.", e.message); }
    return setup;
  }

  /**
   * saveProfile - Persist user profile to a Notion page
   */
  async saveProfile(parentPageId: string, profile: UserProfile, onLog?: (tx: MCPTransaction) => void): Promise<string> {
    try {
      const res = await this.gateway.callTool("notion-create-pages", {
        parent: { type: "page_id", page_id: parentPageId },
        properties: {
          title: [{ type: "text", text: { content: `👤 Profile: ${profile.name || "Professional"}` } }]
        },
        children: [
          { object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: "Career DNA Summary" } }] } },
          { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: `Headline: ${profile.headline || "N/A"}` } }] } },
          { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: `Current Role: ${profile.currentRole || "N/A"}` } }] } },
          { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: `Experience: ${profile.yearsOfExperience || 0} years` } }] } },
          { object: "block", type: "heading_3", heading_3: { rich_text: [{ text: { content: "Core Skills" } }] } },
          { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: profile.skills.length > 0 ? profile.skills.join(", ") : "Not detected yet." } }] } }
        ]
      }, onLog);
      return res?.id || "";
    } catch (e) {
      console.error("Failed to save profile:", e);
      return "";
    }
  }

  /**
   * saveSkillGaps - Save skill analysis to the DNA database
   */
  async saveSkillGaps(databaseId: string, skills: any[], onLog?: (tx: MCPTransaction) => void) {
    for (const skill of skills.slice(0, 5)) {
      try {
        await this.gateway.callTool("notion-create-pages", {
          parent: { database_id: databaseId },
          properties: {
            "Skill Name": { title: [{ text: { content: skill.skill } }] },
            "Proficiency": { select: { name: "Intermediate" } },
            "Years": { number: 1 }
          }
        }, onLog);
      } catch (e) {
        console.error(`Failed to save skill ${skill.skill}:`, e);
      }
    }
  }

  /**
   * discoverAndReadProfile - Extract and persist profile data
   */
  async discoverAndReadProfile(pageIds: string[] = [], onLog?: (tx: MCPTransaction) => void): Promise<UserProfile> {
    const profile: UserProfile = {
      name: "", email: "", headline: "", summary: "", skills: [], techStack: [],
      yearsOfExperience: 0, currentRole: "", currentCompany: "", experience: [],
      education: [], goals: [], preferences: {},
    };

    try {
      let targetId = pageIds && pageIds.length > 0 ? pageIds[0] : null;
      
      if (!targetId) {
        const searchRes = await this.gateway.callTool("notion-search", {
          query: "Profile",
          filter: { property: "object", value: "page" }
        }, onLog);
        if ((searchRes as any)?.results?.[0]) targetId = (searchRes as any).results[0].id;
      }
      
      if (!targetId) return profile;

      const text = await this.deepReadBlock(targetId);
      if (!text.trim()) return profile;

      const { profile: strictProfile } = StrictDataExtractor.extractProfile(text, "notion", "workspace");
      Object.assign(profile, strictProfile);

      if (profile.skills.length === 0 && text.trim()) {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Extract career data from text. DO NOT INVENT. Return JSON: { "name": "", "skills": [], "yearsOfExperience": 0, "currentRole": "", "headline": "" }. Text: ${text.substring(0, 4000)}`;
        const aiRes = await model.generateContent(prompt);
        let responseText = aiRes.response.text().trim();
        responseText = responseText.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
        try {
          const extracted = JSON.parse(responseText);
          profile.name = profile.name || extracted.name || "";
          profile.skills = profile.skills.length > 0 ? profile.skills : (extracted.skills || []);
          profile.yearsOfExperience = profile.yearsOfExperience || extracted.yearsOfExperience || 0;
          profile.currentRole = profile.currentRole || extracted.currentRole || "";
          profile.headline = profile.headline || extracted.headline || "";
        } catch (e) {}
      }
    } catch (e: any) { console.error("[BACKEND] Profile sync failed.", e.message); }
    return profile;
  }

  /**
   * PROVISION with Persistence
   */
  async initializeWorkspace(parentPageId: string, onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const existing = await this.searchDatabases(onLog);
    const creationStamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    try {
      let careerPageId = existing.careerPageId;
      
      if (!careerPageId) {
        const newPage = await this.gateway.callTool("notion-create-pages", {
          parent: { type: "page_id", page_id: parentPageId },
          properties: {
            title: [{ type: "text", text: { content: "🏛️ Forensic Career OS" } }]
          },
          children: [
            { object: "block", type: "heading_1", heading_1: { rich_text: [{ type: "text", text: { content: "Forensic Career Intelligence Dashboard" } }] } },
            { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: "Your autonomous career tracking layer. Powered by MCP." } }] } }
          ]
        }, onLog);
        careerPageId = newPage?.id;
        existing.careerPageId = careerPageId;
      }

      if (!careerPageId) return existing;

      if (!existing.jobsDataSourceId) {
        const jobsDb = await this.gateway.callTool("notion-create-database", {
          parent: { type: "page_id", page_id: careerPageId },
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
        }, onLog);
        existing.jobsDataSourceId = jobsDb?.id;
      }
      
      if (!existing.skillsDataSourceId) {
        const skillsDb = await this.gateway.callTool("notion-create-database", {
          parent: { type: "page_id", page_id: careerPageId },
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
        }, onLog);
        existing.skillsDataSourceId = skillsDb?.id;
      }
    } catch (e: any) { console.error("[BACKEND] Workspace initialization failed.", e.message); }
    return existing;
  }

  async queryDataSource(dataSourceId: string, pageSize: number = 50, onLog?: (tx: MCPTransaction) => void) {
    return this.gateway.callTool("notion-query-data-sources", { database_id: dataSourceId, page_size: pageSize }, onLog);
  }

  async logForensicAudit(dataSourceId: string, analysis: ForensicReport, url: string, existingPageId?: string, onLog?: (tx: MCPTransaction) => void): Promise<string> {
    try {
      const properties: any = {
        "Job Title": { title: [{ text: { content: analysis.jobDetails.title } }] },
        "Status": { select: { name: "🟡 AWAITING_REVIEW" } },
        "Company": { rich_text: [{ text: { content: analysis.jobDetails.company } }] },
        "Job URL": { url: url },
        "Match Score": { number: analysis.score / 100 }
      };

      if (existingPageId) {
        await this.gateway.callTool("notion-update-page", { page_id: existingPageId, properties }, onLog);
        
        // Append analysis blocks
        await this.gateway.callTool("notion-append-blocks", {
          block_id: existingPageId,
          children: [
            { object: "block", type: "callout", callout: { rich_text: [{ text: { content: `🚨 FORENSIC VERDICT: ${analysis.verdict}` } }], icon: { type: "emoji", emoji: "🛡️" }, color: "red_background" } },
            { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: analysis.jobDetails.summary } }] } }
          ]
        }, onLog);
        return existingPageId;
      } else {
        const result = await this.gateway.callTool("notion-create-pages", {
          parent: { database_id: dataSourceId },
          properties,
          children: [
            { object: "block", type: "callout", callout: { rich_text: [{ text: { content: `🚨 FORENSIC VERDICT: ${analysis.verdict}` } }], icon: { type: "emoji", emoji: "🛡️" }, color: "red_background" } },
            { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: analysis.jobDetails.summary } }] } }
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
