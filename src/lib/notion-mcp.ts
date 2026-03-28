/**
 * Forensic Career OS - Notion MCP Client
 * Compatible with Notion MCP v2.0 / API 2025-09-03
 * 
 * Tool Names (v2.0):
 * - notion-search             → Search workspace
 * - notion-fetch             → Get page content  
 * - notion-create-pages      → Create pages
 * - notion-update-page        → Update pages
 * - notion-create-database    → Create databases
 * - notion-query-data-sources → Query data sources
 */

import { NotionMCPGateway, MCPTransaction } from "./notion-mcp-gateway";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

export interface WorkspaceSetup {
  careerPageId?: string;
  jobsDataSourceId?: string;
  skillsDataSourceId?: string;
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
  experience: { role: string; company: string; duration: string }[];
  education: { school: string; degree: string; year: string }[];
  goals: string[];
  preferences: Record<string, any>;
}

export class NotionMCPClient {
  public gateway: NotionMCPGateway;

  constructor(token: string) {
    this.gateway = new NotionMCPGateway(token);
  }

  /**
   * Search Notion workspace using MCP v2.0 tool
   */
  async searchWorkspace(query: string, onLog?: (tx: MCPTransaction) => void) {
    return this.gateway.callTool("notion-search", {
      query,
      filter: { property: "object", value: "page" },
      page_size: 50
    }, onLog, ["Searching Notion workspace..."]);
  }

  /**
   * Fetch page content using MCP v2.0 tool
   */
  async fetchPage(pageId: string, onLog?: (tx: MCPTransaction) => void) {
    return this.gateway.callTool("notion-fetch", {
      page_id: pageId
    }, onLog, ["Fetching page content..."]);
  }

  /**
   * Create pages using MCP v2.0 tool
   */
  async createPage(parentId: string, title: string, properties?: Record<string, any>, children?: any[], onLog?: (tx: MCPTransaction) => void) {
    const pageProps: Record<string, any> = {
      title: [{ text: { content: title } }]
    };
    
    if (properties) {
      Object.assign(pageProps, properties);
    }

    return this.gateway.callTool("notion-create-pages", {
      parent: { page_id: parentId },
      properties: pageProps,
      children: children || []
    }, onLog, [`Creating page: ${title}`]);
  }

  /**
   * Create database using MCP v2.0 tool
   */
  async createDatabase(parentId: string, name: string, schema: Record<string, any>, onLog?: (tx: MCPTransaction) => void) {
    return this.gateway.callTool("notion-create-database", {
      parent: { page_id: parentId },
      name,
      schema
    }, onLog, [`Creating database: ${name}`]);
  }

  /**
   * Query data source using MCP v2.0 tool
   */
  async queryDataSource(dataSourceId: string, pageSize: number = 50, onLog?: (tx: MCPTransaction) => void) {
    return this.gateway.callTool("notion-query-data-sources", {
      data_source_id: dataSourceId,
      page_size: pageSize
    }, onLog, ["Querying data source..."]);
  }

  /**
   * Initialize Forensic Career OS workspace
   */
  async initializeWorkspace(parentPageId: string, onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const setup: WorkspaceSetup = {};

    try {
      // Step 1: Handshake - discover available tools
      await this.gateway.listTools(onLog);

      // Step 2: Create Jobs tracking database
      const jobsDb = await this.gateway.callTool("notion-create-database", {
        parent: { page_id: parentPageId },
        name: "🎯 Job Tracker",
        schema: {
          "Job Title": { type: "title" },
          "Status": { type: "select", options: [
            { name: "🔍 Researching", color: "yellow" },
            { name: "📤 Applied", color: "blue" },
            { name: "📞 Interview", color: "purple" },
            { name: "✅ Offer", color: "green" },
            { name: "❌ Rejected", color: "red" }
          ]},
          "Company": { type: "rich_text" },
          "Trust Score": { type: "number", format: "percent" },
          "Match %": { type: "number", format: "percent" }
        }
      }, onLog, ["Creating Jobs database..."]);
      setup.jobsDataSourceId = jobsDb?.id;

      // Step 3: Create Skills database
      const skillsDb = await this.gateway.callTool("notion-create-database", {
        parent: { page_id: parentPageId },
        name: "🧬 Skill DNA",
        schema: {
          "Skill": { type: "title" },
          "Category": { type: "select", options: [
            { name: "Frontend", color: "blue" },
            { name: "Backend", color: "green" },
            { name: "DevOps", color: "purple" },
            { name: "Soft Skill", color: "yellow" }
          ]},
          "Demand": { type: "number", format: "percent" },
          "Level": { type: "select", options: [
            { name: "Beginner", color: "gray" },
            { name: "Intermediate", color: "blue" },
            { name: "Expert", color: "green" }
          ]}
        }
      }, onLog, ["Creating Skills database..."]);
      setup.skillsDataSourceId = skillsDb?.id;

      // Step 4: Create welcome page
      await this.gateway.callTool("notion-create-pages", {
        parent: { page_id: parentPageId },
        properties: {
          title: [{ text: { content: "🚀 Forensic Career OS Ready!" } }]
        },
        children: [
          {
            object: "block",
            type: "callout",
            callout: {
              rich_text: [{ type: "text", text: { content: "🎯 Forensic Career OS v2.0 initialized! Built with Notion MCP v2.0 (API 2025-09-03)" } }],
              icon: { emoji: "🚀" },
              color: "blue_background"
            }
          },
          {
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [{ type: "text", text: { content: "🎯 Track job applications with trust scoring" } }]
            }
          },
          {
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [{ type: "text", text: { content: "🧬 Map your skills with DNA analysis" } }]
            }
          },
          {
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [{ type: "text", text: { content: "🔍 Detect job scams with forensic analysis" } }]
            }
          }
        ]
      }, onLog, ["Creating welcome page..."]);

    } finally {
      await this.gateway.close();
    }

    return setup;
  }

  /**
   * Discover and read user profile from Notion workspace
   */
  async discoverAndReadProfile(onLog?: (tx: MCPTransaction) => void): Promise<UserProfile> {
    const profile: UserProfile = {
      name: "", email: "", headline: "", summary: "", skills: [], techStack: [],
      yearsOfExperience: 0, currentRole: "", currentCompany: "", experience: [],
      education: [], goals: [], preferences: {},
    };

    try {
      // Search for profile pages
      const searchResult = await this.gateway.callTool("notion-search", {
        query: "resume profile skills goals",
        filter: { property: "object", value: "page" },
        page_size: 20
      }, onLog, ["Discovering profile pages..."]);

      const targetPages: string[] = [];
      for (const page of (searchResult?.results ?? []) as any[]) {
        const title = (
          page.properties?.title?.title?.[0]?.plain_text ??
          page.properties?.Name?.title?.[0]?.plain_text ??
          ""
        ).toLowerCase();
        
        if (title.includes("resume") || title.includes("profile") || title.includes("about")) {
          targetPages.push(page.id);
        }
      }

      // Fetch content from found pages
      const fullText: string[] = [];
      for (const pageId of targetPages.slice(0, 3)) {
        try {
          const pageData = await this.gateway.callTool("notion-fetch", { page_id: pageId }, onLog);
          const content = (pageData as any).content || "";
          if (typeof content === "string") fullText.push(content);
        } catch {}
      }

      if (fullText.length > 0) {
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const prompt = `You are a strict data extraction agent. Extract professional profile data from the provided Notion content.
RULES:
1. ONLY extract information explicitly stated in the text.
2. DO NOT hallucinate, guess, or infer skills, roles, or experience.
3. If a field is not found, leave it as an empty string ("") or empty array ([]).
4. For yearsOfExperience, only output a number if explicitly stated, otherwise 0.
5. Return ONLY a valid JSON object matching this schema exactly, with no markdown formatting or extra text:
{
  "name": "string",
  "email": "string",
  "headline": "string",
  "summary": "string",
  "skills": ["string"],
  "yearsOfExperience": number,
  "currentRole": "string",
  "currentCompany": "string"
}

CONTENT TO ANALYZE:
${fullText.join("\n").substring(0, 5000)}`;

          const aiRes = await model.generateContent(prompt);
          const extracted = JSON.parse(aiRes.response.text().replace(/```json/g, "").replace(/```/g, "").trim());
          Object.assign(profile, extracted);
        } catch (e) {
          console.error("Failed to extract profile:", e);
        }
      }
    } finally {
      await this.gateway.close();
    }

    return profile;
  }

  /**
   * Log forensic analysis result to Notion
   */
  async logForensicAudit(dataSourceId: string, analysis: ForensicReport, url: string, onLog?: (tx: MCPTransaction) => void): Promise<string> {
    // Human-in-the-loop: All forensic reports go to AWAITING_REVIEW first for user approval.
    const statusName = "🟡 AWAITING_REVIEW";
    
    try {
      const result = await this.gateway.callTool("notion-create-pages", {
        parent: { data_source_id: dataSourceId },
        properties: {
          "Job Title": { title: [{ text: { content: `${analysis.jobDetails.company}: ${analysis.jobDetails.title}` } }] },
          "Status": { select: { name: statusName } },
          "Trust Score": { number: (analysis.score || 50) / 100 },
          "Company": { rich_text: [{ text: { content: analysis.jobDetails.company } }] },
          "Job URL": { url: url }
        },
        children: [
          {
            object: "block",
            type: "callout",
            callout: {
              rich_text: [{ type: "text", text: { content: `FORENSIC VERDICT: ${analysis.verdict} (${analysis.score}%)\n\nPlease review and approve this verdict in the Lumina dashboard.` } }],
              icon: { emoji: analysis.verdict.includes("LEGITIMATE") ? "✅" : "🚨" },
              color: analysis.verdict.includes("LEGITIMATE") ? "green_background" : "red_background"
            }
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [{ type: "text", text: { content: analysis.jobDetails.summary || "No summary provided." } }]
            }
          },
          ...analysis.analysis.flags.map((flag: string) => ({
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [{ type: "text", text: { content: `🚩 ${flag}` } }]
            }
          }))
        ]
      }, onLog, [`Logging forensic analysis for ${analysis.jobDetails.company}...`]);

      const pageId = result?.id || "";
      return `https://notion.so/${pageId.replace(/-/g, "")}`;
    } finally {
      await this.gateway.close();
    }
  }

  getTransactions(): MCPTransaction[] {
    return this.gateway.getTransactions();
  }
}
