import { NotionMCPGateway } from "./notion-mcp-gateway";
import type { MCPTransaction } from "./notion-mcp-gateway";
import { AIEngine } from "./ai";

export type { MCPTransaction };

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
  experience: { role: string; company: string; duration: string }[];
  education: { institution?: string; degree?: string; field?: string; year?: string }[];
  goals: string[];
  preferences: any;
}

export interface WorkspaceSetup {
  jobsDataSourceId?: string;
  skillsDataSourceId?: string;
  careerPageId?: string;
}

export interface ForensicReport {
  verdict: "🟢 LEGITIMATE" | "🔴 SCAM RISK" | "🟡 GHOST JOB" | "⚪ INCONCLUSIVE";
  score: number;
  analysis: {
    flags: string[];
    hiddenSignals: string[];
    cultureMatch: string;
    cyberMetadata?: any;
  };
  jobDetails: {
    title: string;
    company: string;
    summary: string;
  };
}

export class NotionMCPClient {
  public gateway: NotionMCPGateway;

  constructor(token: string) {
    this.gateway = new NotionMCPGateway(token);
  }

  /**
   * DEEP READ - Exhaustive recursive content fetcher
   */
  async deepReadBlock(blockId: string, depth = 0): Promise<string> {
    if (depth > 5) return ""; 
    let text = "";
    try {
      // Get block info to check if it's a database
      const blockInfo = await this.gateway.callTool("notion-get-page", { page_id: blockId }).catch(() => null);
      
      if (blockInfo?.object === "database") {
        const items = await this.gateway.callTool("notion-query-data-sources", { database_id: blockId });
        for (const page of (items?.results || [])) {
          text += await this.deepReadBlock(page.id, depth + 1) + "\n";
        }
        return text;
      }

      // Read children
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

  async searchDatabases(onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const setup: WorkspaceSetup = {};
    try {
      const result = await this.gateway.callTool("notion-search", {
        filter: { property: "object", value: "database" }
      }, onLog);

      for (const db of (result?.results ?? []) as any[]) {
        const title = (db.title?.[0]?.plain_text || db.name || "").toLowerCase();
        if (title.includes("job") || title.includes("tracker")) setup.jobsDataSourceId = db.id;
        if (title.includes("skill") || title.includes("dna")) setup.skillsDataSourceId = db.id;
      }

      const pageRes = await this.gateway.callTool("notion-search", { filter: { property: "object", value: "page" } });
      for (const page of (pageRes?.results ?? []) as any[]) {
        const title = (page.properties?.title?.title?.[0]?.plain_text || "").toLowerCase();
        if (title.includes("career") || title.includes("lumina")) {
          setup.careerPageId = page.id;
          break;
        }
      }
    } catch (e: any) {}
    return setup;
  }

  async saveProfile(parentPageId: string, profile: UserProfile, onLog?: (tx: MCPTransaction) => void) {
    try {
      await this.gateway.callTool("notion-create-pages", {
        parent: { type: "page_id", page_id: parentPageId },
        properties: { title: [{ type: "text", text: { content: `👤 Profile: ${profile.name || "Professional"}` } }] },
        children: [
          { object: "block", type: "heading_1", heading_1: { rich_text: [{ text: { content: "Career Intelligence DNA" } }] } },
          { object: "block", type: "callout", callout: { rich_text: [{ text: { content: profile.summary } }], icon: { type: "emoji", emoji: "🧠" }, color: "blue_background" } },
          { object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: "Extracted Skills" } }] } },
          { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: profile.skills.join(", ") } }] } }
        ]
      }, onLog);
    } catch (e) {}
  }

  async discoverAndReadProfile(pageIds: string[] = [], onLog?: (tx: MCPTransaction) => void): Promise<UserProfile> {
    const profile: UserProfile = {
      name: "", email: "", headline: "", summary: "", skills: [], techStack: [],
      yearsOfExperience: 0, currentRole: "", currentCompany: "", experience: [],
      education: [], goals: [], preferences: {},
    };

    try {
      let targets = pageIds;
      if (targets.length === 0) {
        const res = await this.gateway.callTool("notion-search", { filter: { property: "object", value: "page" } });
        targets = res?.results?.slice(0, 5).map((r: any) => r.id) || [];
      }
      
      const contents = await Promise.all(targets.map(id => this.deepReadBlock(id)));
      const combinedText = contents.join("\n\n---\n\n");

      if (!combinedText.trim()) return profile;

      const prompt = `
        TASK: Extract detailed career profile from this text.
        DATA: ${combinedText.substring(0, 20000)}
        FORMAT: JSON ONLY.
        FIELDS: { name, headline, summary, skills (min 20), yearsOfExperience, currentRole, currentCompany, goals }
      `;

      const aiRes = await AIEngine.generateContent(prompt);
      const extracted = AIEngine.parseJSON(aiRes);
      Object.assign(profile, extracted);
      profile.techStack = profile.skills.slice(0, 10);

    } catch (e: any) { console.error("[BACKEND] Profile Extraction Failed:", e.message); }
    return profile;
  }

  async initializeWorkspace(parentPageId?: string, onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const existing = await this.searchDatabases(onLog);
    const creationStamp = new Date().toLocaleDateString();

    try {
      let careerPageId = existing.careerPageId;
      if (!careerPageId) {
        const parent = parentPageId || (await this.gateway.callTool("notion-search", { filter: { property: "object", value: "page" } }))?.results?.[0]?.id;
        if (parent) {
          const newPage = await this.gateway.callTool("notion-create-pages", {
            parent: { type: "page_id", page_id: parent },
            properties: { title: [{ type: "text", text: { content: "🏛️ Forensic Career OS" } }] },
            children: [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: "Your autonomous career tracking layer." } }] } }]
          }, onLog);
          careerPageId = newPage?.id;
          existing.careerPageId = careerPageId;
        }
      }

      if (careerPageId) {
        if (!existing.jobsDataSourceId) {
          const db = await this.gateway.callTool("notion-create-database", {
            parent: { type: "page_id", page_id: careerPageId },
            title: [{ type: "text", text: { content: `🎯 Job Tracker (${creationStamp})` } }],
            properties: { "Job Title": { title: {} }, "Status": { select: { options: [{ name: "🔍 Researching", color: "yellow" }, { name: "✅ Verified", color: "green" }] } }, "Company": { rich_text: {} }, "Job URL": { url: {} }, "Match Score": { number: { format: "percent" } } }
          }, onLog);
          existing.jobsDataSourceId = db?.id;
        }
        if (!existing.skillsDataSourceId) {
          const db = await this.gateway.callTool("notion-create-database", {
            parent: { type: "page_id", page_id: careerPageId },
            title: [{ type: "text", text: { content: `🧬 Skills DNA (${creationStamp})` } }],
            properties: { "Skill Name": { title: {} }, "Proficiency": { select: { options: [{ name: "Expert", color: "green" }, { name: "Beginner", color: "red" }] } } }
          }, onLog);
          existing.skillsDataSourceId = db?.id;
        }
      }
    } catch (e: any) {}
    return existing;
  }

  async queryDataSource(dataSourceId: string, pageSize: number = 50) {
    return this.gateway.callTool("notion-query-data-sources", { database_id: dataSourceId, page_size: pageSize });
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
