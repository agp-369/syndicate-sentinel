import { NotionMCPGateway } from "./notion-mcp-gateway";
import type { MCPTransaction } from "./notion-mcp-gateway";
import { AIEngine } from "./ai";

export type { MCPTransaction };

export interface UserProfile {
  name: string;
  headline: string;
  summary: string;
  skills: string[];
  techStack: string[];
  yearsOfExperience: number;
  currentRole: string;
  currentCompany: string;
  experience: { role: string; company: string; duration: string; details?: string }[];
  education: { institution: string; degree: string; year?: string }[];
  goals: string[];
}

export interface WorkspaceSetup {
  jobsDataSourceId?: string;
  skillsDataSourceId?: string;
  careerPageId?: string;
}

/**
 * 🛰️ NotionMCPClient v8.0 - GRAPH-AWARE INTELLIGENCE
 * High-fidelity data access, recursive graph traversal, and semantic understanding.
 */
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
   * GRAPH TRAVERSAL: Recursively reads everything accessible
   */
  async deepReadBlock(id: string, depth = 0): Promise<string> {
    if (depth > 5) return "";
    let accumulatedText = "";

    try {
      // 1. Identify the object type
      const info = await this.gateway.callTool("notion-get-page", { page_id: id }).catch(async () => {
        // Fallback: Check if it's a database
        const dbRes = await fetch(`https://api.notion.com/v1/databases/${id}`, {
          headers: { "Authorization": `Bearer ${(this.gateway as any).token}`, "Notion-Version": "2022-06-28" }
        });
        return await dbRes.json();
      });

      if (!info || info.object === "error") return "";

      // 2. If it's a database, query all its rows
      if (info.object === "database") {
        accumulatedText += `[DATABASE: ${info.title?.[0]?.plain_text || "Untitled"}]\n`;
        const rows = await this.gateway.callTool("notion-query-data-sources", { database_id: id });
        for (const page of (rows?.results || [])) {
          accumulatedText += await this.deepReadBlock(page.id, depth + 1);
        }
        return accumulatedText;
      }

      // 3. Read blocks of the page
      const children = await this.gateway.callTool("notion-fetch", { block_id: id });
      for (const block of (children?.results || [])) {
        const type = block.type;
        
        // Handle nested content
        if (block[type]?.rich_text) {
          accumulatedText += block[type].rich_text.map((t: any) => t.plain_text).join("") + "\n";
        }

        // Recursive dive into child pages or nested blocks
        if (type === "child_page") {
          accumulatedText += await this.deepReadBlock(block.id, depth + 1);
        } else if (block.has_children) {
          accumulatedText += await this.deepReadBlock(block.id, depth + 1);
        }
      }
    } catch (e) {
      console.error(`[GRAPH] Error reading ${id}:`, e);
    }

    return accumulatedText;
  }

  /**
   * DISCOVER: Locate the Career OS footprint
   */
  async searchDatabases(onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const setup: WorkspaceSetup = {};
    try {
      const dbs = await this.gateway.callTool("notion-search", { filter: { property: "object", value: "database" } }, onLog);
      for (const db of (dbs?.results || [])) {
        const title = (db.title?.[0]?.plain_text || db.name || "").toLowerCase();
        if (title.includes("job") || title.includes("tracker")) setup.jobsDataSourceId = db.id;
        if (title.includes("skill") || title.includes("dna")) setup.skillsDataSourceId = db.id;
      }

      const pages = await this.gateway.callTool("notion-search", { filter: { property: "object", value: "page" } });
      for (const p of (pages?.results || [])) {
        const title = (p.properties?.title?.title?.[0]?.plain_text || "").toLowerCase();
        if (title.includes("career") || title.includes("forensic")) {
          setup.careerPageId = p.id;
          break;
        }
      }
    } catch (e) {}
    return setup;
  }

  /**
   * PROVISION: Create dedicated structure
   */
  async initializeWorkspace(parentPageId?: string, onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const existing = await this.searchDatabases(onLog);
    const stamp = new Date().toLocaleDateString();

    try {
      let careerId = existing.careerPageId;
      if (!careerId) {
        const parent = parentPageId || (await this.gateway.callTool("notion-search", { filter: { property: "object", value: "page" } }))?.results?.[0]?.id;
        if (parent) {
          const res = await this.gateway.callTool("notion-create-pages", {
            parent: { type: "page_id", page_id: parent },
            properties: { title: [{ type: "text", text: { content: "🏛️ Forensic Career OS" } }] },
            children: [
              { object: "block", type: "heading_1", heading_1: { rich_text: [{ text: { content: "Autonomous Career Ledger" } }] } },
              { object: "block", type: "callout", callout: { rich_text: [{ text: { content: "Built by Lumina Forensic Agent." } }], icon: { type: "emoji", emoji: "🛡️" } } }
            ]
          }, onLog);
          careerId = res?.id;
          existing.careerPageId = careerId;
        }
      }

      if (careerId) {
        if (!existing.jobsDataSourceId) {
          const db = await this.gateway.callTool("notion-create-database", {
            parent: { type: "page_id", page_id: careerId },
            title: [{ type: "text", text: { content: `🎯 Job Tracker` } }],
            properties: {
              "Job Title": { title: {} },
              "Company": { rich_text: {} },
              "Status": { select: { options: [{ name: "🔍 Researching", color: "yellow" }, { name: "✅ Verified", color: "green" }] } },
              "Job URL": { url: {} },
              "Match Score": { number: { format: "percent" } }
            }
          }, onLog);
          existing.jobsDataSourceId = db?.id;
        }
        if (!existing.skillsDataSourceId) {
          const db = await this.gateway.callTool("notion-create-database", {
            parent: { type: "page_id", page_id: careerId },
            title: [{ type: "text", text: { content: `🧬 Skills DNA` } }],
            properties: {
              "Skill Name": { title: {} },
              "Proficiency": { select: { options: [{ name: "Expert", color: "green" }, { name: "Intermediate", color: "blue" }, { name: "Beginner", color: "orange" }] } }
            }
          }, onLog);
          existing.skillsDataSourceId = db?.id;
        }
      }
    } catch (e) {}
    return existing;
  }

  async discoverAndReadProfile(pageIds: string[] = []): Promise<UserProfile> {
    const profile: UserProfile = {
      name: "", headline: "", summary: "", skills: [], techStack: [],
      yearsOfExperience: 0, currentRole: "", currentCompany: "", experience: [],
      education: [], goals: [],
    };

    try {
      let targets = pageIds;
      if (targets.length === 0) {
        const res = await this.gateway.callTool("notion-search", { filter: { property: "object", value: "page" } });
        targets = res?.results?.slice(0, 5).map((r: any) => r.id) || [];
      }

      const allTexts = await Promise.all(targets.map(id => this.deepReadBlock(id)));
      const corpus = allTexts.join("\n\n--- SOURCE BOUNDARY ---\n\n");

      if (!corpus.trim()) return profile;

      const prompt = `
        MANDATE: Extract Career DNA from this graph-dump of a Notion workspace.
        CORPUS:
        ${corpus.substring(0, 30000)}

        RETURN JSON:
        {
          "name": "Full Name",
          "headline": "Expert Title",
          "summary": "Detailed professional bio",
          "skills": ["List 20+ specific technologies found"],
          "yearsOfExperience": number,
          "currentRole": "Title",
          "currentCompany": "Company",
          "experience": [{"role": "...", "company": "...", "duration": "...", "details": "..."}],
          "education": [{"institution": "...", "degree": "..."}],
          "goals": ["Goal 1", "Goal 2", "Goal 3"]
        }
      `;

      const aiRes = await AIEngine.generateContent(prompt);
      const data = AIEngine.parseJSON(aiRes);
      Object.assign(profile, data);
      profile.techStack = profile.skills.slice(0, 15);
    } catch (e) {}
    return profile;
  }

  async saveProfile(parentId: string, profile: UserProfile) {
    try {
      await this.gateway.callTool("notion-create-pages", {
        parent: { type: "page_id", page_id: parentId },
        properties: { title: [{ type: "text", text: { content: `👤 DNA: ${profile.name}` } }] },
        children: [
          { object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: "Professional Summary" } }] } },
          { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: profile.summary } }] } },
          { object: "block", type: "heading_3", heading_3: { rich_text: [{ text: { content: "Core Experience" } }] } },
          ...profile.experience.map(exp => ({
            object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: `${exp.role} at ${exp.company} (${exp.duration})` } }] }
          }))
        ]
      });
    } catch (e) {}
  }

  async saveSkillGaps(dbId: string, skills: any[]) {
    for (const s of skills.slice(0, 10)) {
      await this.gateway.callTool("notion-create-pages", {
        parent: { database_id: dbId },
        properties: {
          "Skill Name": { title: [{ text: { content: s.skill || s } }] },
          "Proficiency": { select: { name: "Intermediate" } }
        }
      }).catch(() => {});
    }
  }

  async queryDataSource(id: string) { return this.gateway.callTool("notion-query-data-sources", { database_id: id }); }
  getTransactions() { return this.gateway.getTransactions(); }
}
