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
 * 🛰️ NotionMCPClient v7.0 - ULTIMATE EXTRACTION & PERSISTENCE
 * Fixed: Multi-page extraction, Auto-parent discovery, Deep recursive reading.
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
    if (depth > 3) return ""; // Increased depth for complex pages
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
   * RECOVER existing infrastructure using fuzzy matching.
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
   * saveProfile - Persist user profile to a Notion page with enhanced layout
   */
  async saveProfile(parentPageId: string, profile: UserProfile, onLog?: (tx: MCPTransaction) => void): Promise<string> {
    try {
      console.log(`[BACKEND] Saving Profile for ${profile.name} under ${parentPageId}`);
      const res = await this.gateway.callTool("notion-create-pages", {
        parent: { type: "page_id", page_id: parentPageId },
        properties: {
          title: [{ type: "text", text: { content: `👤 Profile: ${profile.name || "Professional"}` } }]
        },
        children: [
          { object: "block", type: "heading_1", heading_1: { rich_text: [{ text: { content: "Career Intelligence DNA" } }] } },
          { object: "block", type: "callout", callout: { rich_text: [{ text: { content: profile.summary || "No summary extracted." } }], icon: { type: "emoji", emoji: "🧠" }, color: "blue_background" } },
          { object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: "Current Status" } }] } },
          { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: `Role: ${profile.currentRole}\nCompany: ${profile.currentCompany}\nExperience: ${profile.yearsOfExperience} Years` } }] } },
          { object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: "Extracted Skills" } }] } },
          { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: profile.skills.join(", ") } }] } },
          { object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: "Career Goals" } }] } },
          ...profile.goals.map(goal => ({
            object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: goal } }] }
          }))
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
    for (const skill of skills.slice(0, 10)) {
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
   * discoverAndReadProfile - READS ALL SELECTED PAGES and aggregates data
   */
  async discoverAndReadProfile(pageIds: string[] = [], onLog?: (tx: MCPTransaction) => void): Promise<UserProfile> {
    const profile: UserProfile = {
      name: "", email: "", headline: "", summary: "", skills: [], techStack: [],
      yearsOfExperience: 0, currentRole: "", currentCompany: "", experience: [],
      education: [], goals: [], preferences: {},
    };

    try {
      let targets = pageIds;
      
      // If no page provided, search for everything
      if (targets.length === 0) {
        const searchRes = await this.gateway.callTool("notion-search", {
          filter: { property: "object", value: "page" }
        }, onLog);
        targets = (searchRes as any)?.results?.slice(0, 3).map((r: any) => r.id) || [];
      }
      
      if (targets.length === 0) return profile;

      // Read ALL pages in parallel
      const contents = await Promise.all(targets.map(id => this.deepReadBlock(id)));
      const combinedText = contents.join("\n\n--- NEXT PAGE ---\n\n");

      if (!combinedText.trim()) return profile;

      // Extraction via LLM with aggregated text
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        You are 'Lumina', a Career Intelligence AI. 
        Extract a COMPREHENSIVE career profile from the following Notion workspace data.
        AGGREGATE information from all pages provided. 
        If information conflicts, use the most recent or detailed one.

        WORKSPACE DATA:
        ${combinedText.substring(0, 15000)}

        OUTPUT STRICT JSON:
        {
          "name": "Full Name",
          "headline": "Professional Title",
          "summary": "3-sentence professional summary",
          "skills": ["List at least 15 technical skills"],
          "yearsOfExperience": number,
          "currentRole": "Current Title",
          "currentCompany": "Current Company",
          "experience": [{"role": "...", "company": "...", "duration": "..."}],
          "goals": ["List 3 career goals based on their trajectory"]
        }
      `;

      const aiRes = await model.generateContent(prompt);
      let responseText = aiRes.response.text().trim();
      responseText = responseText.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
      
      try {
        const extracted = JSON.parse(responseText);
        Object.assign(profile, extracted);
        profile.techStack = profile.skills.slice(0, 10);
      } catch (e) {
        // Fallback to strict extractor if AI fails
        const { profile: fallbackProfile } = StrictDataExtractor.extractProfile(combinedText, "notion", "workspace");
        Object.assign(profile, fallbackProfile);
      }

    } catch (e: any) { console.error("[BACKEND] Profile aggregation failed.", e.message); }
    return profile;
  }

  /**
   * PROVISION with Persistence - Supports Auto-Parent Selection
   */
  async initializeWorkspace(parentPageId?: string, onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const existing = await this.searchDatabases(onLog);
    const creationStamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    try {
      let careerPageId = existing.careerPageId;
      let targetParentId = parentPageId;

      // 1. Auto-discover a parent if none provided
      if (!targetParentId && !careerPageId) {
        const searchRes = await this.gateway.callTool("notion-search", {
          filter: { property: "object", value: "page" }
        });
        targetParentId = (searchRes as any)?.results?.[0]?.id;
      }
      
      if (!careerPageId && targetParentId) {
        console.log(`[BACKEND] Creating main Career OS page under ${targetParentId}`);
        const newPage = await this.gateway.callTool("notion-create-pages", {
          parent: { type: "page_id", page_id: targetParentId },
          properties: {
            title: [{ type: "text", text: { content: "🏛️ Forensic Career OS" } }]
          },
          children: [
            { object: "block", type: "heading_1", heading_1: { rich_text: [{ text: { content: "Forensic Career Intelligence Dashboard" } }] } },
            { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: "Your autonomous career tracking layer. Powered by MCP." } }] } }
          ]
        }, onLog);
        careerPageId = newPage?.id;
        existing.careerPageId = careerPageId;
      }

      if (!careerPageId) return existing;

      // 2. Create databases under the careerPageId
      if (!existing.jobsDataSourceId) {
        console.log(`[BACKEND] Creating Job Tracker database...`);
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
        console.log(`[BACKEND] Creating Skills DNA database...`);
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
