import { Client } from "@notionhq/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import * as cheerio from "cheerio";

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

export interface MCPTransaction {
  id: string;
  timestamp: string;
  method: string;
  params: any;
  result?: any;
  error?: string;
  duration?: number;
  thinking?: string[];
}

export interface WorkspaceSetup {
  jobLedgerId?: string;
  talentPoolId?: string;
  careerRoadmapId?: string;
  agentLogId?: string;
}

export class NotionMCPClient {
  private notion: Client;
  private token: string;
  private transactions: MCPTransaction[] = [];
  private mcpEndpoint = "https://mcp.notion.com/mcp";

  constructor(token: string) {
    this.token = token;
    this.notion = new Client({ auth: token });
  }

  async logTransaction(tx: MCPTransaction, onLog?: (tx: MCPTransaction) => void) {
    this.transactions.push(tx);
    if (onLog) onLog(tx);
  }

  async initializeWorkspace(
    parentPageId: string,
    onLog?: (tx: MCPTransaction) => void
  ): Promise<WorkspaceSetup> {
    const setup: WorkspaceSetup = {};

    const welcomeTx: MCPTransaction = {
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      method: "workspace.initialize",
      params: { parentPageId },
      thinking: ["Initiating workspace provisioning via Notion MCP..."]
    };
    await this.logTransaction(welcomeTx, onLog);

    const ledgerTx = await this.createDatabase(
      parentPageId,
      "Lumina: Career Ledger",
      "🛰️",
      {
        "Job Title": { title: {} },
        "Status": { select: { options: [
          { name: "🟢 VERIFIED", color: "green" },
          { name: "🟡 AWAITING_REVIEW", color: "yellow" },
          { name: "🔴 SCAM_RISK", color: "red" },
          { name: "⚪ APPLIED", color: "blue" },
          { name: "🏆 OFFER", color: "purple" }
        ] } },
        "Trust Score": { number: { format: "percent" } },
        "Company": { rich_text: {} },
        "Location": { rich_text: {} },
        "Salary Range": { rich_text: {} },
        "Job URL": { url: {} },
        "Applied Date": { date: {} },
        "Interview Stage": { select: { options: [
          { name: "Not Applied", color: "gray" },
          { name: "Applied", color: "blue" },
          { name: "Phone Screen", color: "yellow" },
          { name: "Technical", color: "orange" },
          { name: "Final", color: "purple" },
          { name: "Offer", color: "green" }
        ] } }
      },
      onLog
    );
    setup.jobLedgerId = ledgerTx.result?.id;

    const talentTx = await this.createDatabase(
      parentPageId,
      "Lumina: Talent Pool",
      "👥",
      {
        "Name": { title: {} },
        "Current Role": { rich_text: {} },
        "Target Role": { rich_text: {} },
        "Skills": { multi_select: {} },
        "Match Score": { number: { format: "percent" } },
        "Status": { select: { options: [
          { name: "Active", color: "green" },
          { name: "Exploring", color: "yellow" },
          { name: "Placed", color: "blue" }
        ] } }
      },
      onLog
    );
    setup.talentPoolId = talentTx.result?.id;

    const roadmapTx = await this.createDatabase(
      parentPageId,
      "Lumina: Career Roadmaps",
      "🗺️",
      {
        "Milestone": { title: {} },
        "Phase": { select: { options: [
          { name: "Foundation", color: "blue" },
          { name: "Growth", color: "yellow" },
          { name: "Mastery", color: "green" }
        ] } },
        "Target Date": { date: {} },
        "Progress": { number: { format: "percent" } },
        "Status": { select: { options: [
          { name: "Not Started", color: "gray" },
          { name: "In Progress", color: "blue" },
          { name: "Completed", color: "green" }
        ] } }
      },
      onLog
    );
    setup.careerRoadmapId = roadmapTx.result?.id;

    const logTx = await this.createDatabase(
      parentPageId,
      "Lumina: Agent Audit Log",
      "📊",
      {
        "Event": { title: {} },
        "Timestamp": { date: {} },
        "Agent": { select: { options: [
          { name: "Forensic Sentinel", color: "red" },
          { name: "Strategy Oracle", color: "blue" },
          { name: "Roadmap Architect", color: "green" }
        ] } },
        "Confidence": { number: { format: "percent" } },
        "Verdict": { select: { options: [
          { name: "Success", color: "green" },
          { name: "Warning", color: "yellow" },
          { name: "Error", color: "red" }
        ] } }
      },
      onLog
    );
    setup.agentLogId = logTx.result?.id;

    await this.addWelcomeBlock(parentPageId, onLog);

    return setup;
  }

  private async createDatabase(
    parentId: string,
    title: string,
    icon: string,
    properties: any,
    onLog?: (tx: MCPTransaction) => void
  ): Promise<MCPTransaction> {
    const tx: MCPTransaction = {
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      method: "notion.create_database",
      params: { parentId, title, properties },
      thinking: [
        `MCP call: notion.create_database`,
        `Parent: ${parentId.substring(0, 8)}...`,
        `Creating: ${title}`,
        `Awaiting Notion API response...`
      ]
    };

    const start = Date.now();
    try {
      const result = await this.notion.databases.create({
        parent: { page_id: parentId },
        icon: { emoji: icon as any },
        title: [{ text: { content: title } }],
        properties,
      });
      tx.result = { id: result.id, url: `https://notion.so/${(result as any).id?.replace(/-/g, '')}` };
      tx.duration = Date.now() - start;
      tx.thinking?.push(`✅ Database created: ${result.id.substring(0, 8)}...`);
    } catch (error: any) {
      tx.error = error.message;
      tx.duration = Date.now() - start;
      tx.thinking?.push(`❌ Failed: ${error.message}`);
    }

    await this.logTransaction(tx, onLog);
    return tx;
  }

  private async addWelcomeBlock(pageId: string, onLog?: (tx: MCPTransaction) => void) {
    const tx: MCPTransaction = {
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      method: "notion.append_block_children",
      params: { pageId },
      thinking: ["Appending welcome instructions to workspace..."]
    };

    const start = Date.now();
    try {
      await this.notion.blocks.children.append({
        block_id: pageId,
        children: [
          {
            object: "block",
            type: "callout",
            callout: {
              rich_text: [{ type: "text", text: { content: "🌌 LUMINA CAREER OS ACTIVE. Your autonomous career intelligence system is now operational. This workspace is managed by AI agents via the Notion Model Context Protocol." } }],
              icon: { emoji: "🚀" },
              color: "purple_background"
            }
          },
          {
            object: "block",
            type: "divider",
            divider: {}
          },
          {
            object: "block",
            type: "heading_2",
            heading_2: { rich_text: [{ type: "text", text: { content: "🕵️ Forensic Sentinel" } }] }
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: [{ type: "text", text: { content: "Paste any job URL into the Lumina dashboard to run a deep forensic audit. The AI will cross-reference company reputation, detect ghost jobs, and flag scams." } }] }
          },
          {
            object: "block",
            type: "heading_2",
            heading_2: { rich_text: [{ type: "text", text: { content: "🤝 Talent Intelligence" } }] }
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: [{ type: "text", text: { content: "Track your career journey. Every application, interview, and decision is logged with full audit trail for continuous improvement." } }] }
          }
        ]
      });
      tx.result = { success: true };
      tx.duration = Date.now() - start;
    } catch (error: any) {
      tx.error = error.message;
      tx.duration = Date.now() - start;
    }

    await this.logTransaction(tx, onLog);
  }

  async logForensicAudit(
    ledgerId: string,
    analysis: ForensicReport,
    url: string,
    onLog?: (tx: MCPTransaction) => void
  ): Promise<string> {
    const tx: MCPTransaction = {
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      method: "notion.create_page",
      params: { ledgerId, analysis },
      thinking: [
        "MCP call: notion.create_page",
        `Database: ${ledgerId.substring(0, 8)}...`,
        `Verdict: ${analysis.verdict} (${analysis.score}%)`,
        "Building structured page with forensic evidence..."
      ]
    };

    const start = Date.now();
    try {
      const statusName = analysis.verdict.includes("LEGITIMATE") ? "🟢 VERIFIED" : 
                         analysis.verdict.includes("SCAM") ? "🔴 SCAM_RISK" : "🟡 AWAITING_REVIEW";
      
      const page = await this.notion.pages.create({
        parent: { database_id: ledgerId },
        properties: {
          "Job Title": { title: [{ text: { content: `${analysis.jobDetails.company}: ${analysis.jobDetails.title}` } }] },
          "Company": { rich_text: [{ text: { content: analysis.jobDetails.company } }] },
          "Status": { select: { name: statusName } },
          "Trust Score": { number: analysis.score / 100 },
          "Job URL": { url }
        } as any,
        children: [
          {
            object: "block",
            type: "callout",
            callout: {
              rich_text: [{ type: "text" as const, text: { content: `FORENSIC VERDICT: ${analysis.verdict} | TRUST SCORE: ${analysis.score}%` } }],
              icon: { emoji: analysis.score > 80 ? "🟢" : analysis.score > 50 ? "🟡" : "🔴" },
              color: analysis.score > 80 ? "green_background" as const : analysis.score > 50 ? "yellow_background" as const : "red_background" as const
            }
          },
          {
            object: "block",
            type: "heading_3",
            heading_3: { rich_text: [{ type: "text" as const, text: { content: "📋 Summary" } }] }
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: [{ type: "text" as const, text: { content: analysis.jobDetails.summary } }] }
          },
          {
            object: "block",
            type: "heading_3",
            heading_3: { rich_text: [{ type: "text" as const, text: { content: "🚩 Forensic Flags" } }] }
          },
          ...analysis.analysis.flags.map(flag => ({
            object: "block" as const,
            type: "bulleted_list_item" as const,
            bulleted_list_item: { rich_text: [{ type: "text" as const, text: { content: flag } }] }
          })),
          {
            object: "block",
            type: "heading_3",
            heading_3: { rich_text: [{ type: "text" as const, text: { content: "🕵️ Hidden Signals" } }] }
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: [{ type: "text" as const, text: { content: analysis.analysis.hiddenSignals.join("\n") || "No significant hidden signals detected." } }] }
          },
          {
            object: "block",
            type: "divider",
            divider: {}
          },
          {
            object: "block",
            type: "callout",
            callout: {
              rich_text: [{ type: "text" as const, text: { content: `Culture Match Analysis: ${analysis.analysis.cultureMatch}` } }],
              icon: { emoji: "🎯" },
              color: "blue_background" as const
            }
          }
        ]
      } as any);

      const pageId = (page as any).id;
      tx.result = { id: pageId, url: `https://notion.so/${pageId.replace(/-/g, '')}` };
      tx.duration = Date.now() - start;
      tx.thinking?.push(`✅ Page created: ${tx.result.url}`);
    } catch (error: any) {
      tx.error = error.message;
      tx.duration = Date.now() - start;
      tx.thinking?.push(`❌ Error: ${error.message}`);
    }

    await this.logTransaction(tx, onLog);
    return tx.result?.url || "";
  }

  async searchDatabases(onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    const tx: MCPTransaction = {
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      method: "notion.search",
      params: { filter: { property: "object", value: "database" } },
      thinking: ["Scanning workspace for Lumina databases..."]
    };

    try {
      const search = await this.notion.search({ filter: { property: "object", value: "database" } });
      const setup: WorkspaceSetup = {};

      for (const db of search.results as any[]) {
        const title = db.title?.[0]?.plain_text?.toLowerCase() || "";
        if (title.includes("career ledger") || title.includes("job ledger")) {
          setup.jobLedgerId = db.id;
        } else if (title.includes("talent pool")) {
          setup.talentPoolId = db.id;
        } else if (title.includes("roadmap")) {
          setup.careerRoadmapId = db.id;
        } else if (title.includes("audit log")) {
          setup.agentLogId = db.id;
        }
      }

      tx.result = setup;
      tx.thinking?.push(`Found ${Object.keys(setup).length} Lumina databases`);
    } catch (error: any) {
      tx.error = error.message;
    }

    await this.logTransaction(tx, onLog);
    return tx.result || {};
  }

  getTransactions(): MCPTransaction[] {
    return this.transactions;
  }

  getNotionClient(): Client {
    return this.notion;
  }
}

export async function runForensicAudit(url: string): Promise<ForensicReport> {
  console.log(`[INTELLIGENCE] Initiating Audit: ${url}`);
  
  let jobHtml = "";
  let domainHtml = "";
  let domain = "";
  
  try {
    const jobRes = await axios.get(url, { 
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      timeout: 8000
    });
    jobHtml = jobRes.data;
    domain = new URL(url).hostname;

    try {
        const rootUrl = `${new URL(url).protocol}//${domain}`;
        const domainRes = await axios.get(rootUrl, { timeout: 3000 });
        domainHtml = domainRes.data;
    } catch (e) {
        console.warn("[INTELLIGENCE] Root domain scrape failed.");
    }

  } catch (error) {
    console.error("[INTELLIGENCE] Scrape Failed:", error);
    jobHtml = "";
    domain = new URL(url).hostname; 
  }

  const $job = cheerio.load(jobHtml || "");
  $job("script, style, svg, nav, footer").remove();
  const jobText = $job("body").text().replace(/\s+/g, " ").trim().substring(0, 15000);
  
  const $domain = cheerio.load(domainHtml || "");
  $domain("script, style, svg, nav, footer").remove();
  const domainText = $domain("body").text().replace(/\s+/g, " ").trim().substring(0, 5000);

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
  You are 'Lumina', a forensic career intelligence agent.
  Analyze this job posting for SCAMS, GHOST JOBS, and LEGITIMACY.

  CONTEXT:
  - Job URL: ${url}
  - Domain: ${domain}
  - Job Content Snippet: ${jobText ? jobText : "(Scrape Failed - Use your internal knowledge)"}
  - Company Homepage Snippet: ${domainText ? domainText : "(Scrape Failed)"}

  DETECT THESE SIGNALS:
  1. "Ghost Job" Indicators: Old dates, vague "evergreen" descriptions, "pooling" language.
  2. Scam Indicators: Telegram/WhatsApp contact, immediate money request, poor grammar, "Kindly", non-corporate domains.
  3. Mismatch: Does the job description tone match the company homepage tone?
  4. Reputation: What is the known reputation of ${domain}?

  OUTPUT STRICT JSON:
  {
    "verdict": "🟢 LEGITIMATE" | "🔴 SCAM RISK" | "🟡 GHOST JOB",
    "score": number (0 = Scam, 100 = Perfect),
    "jobTitle": "Extracted Title (or inferred)",
    "company": "Extracted Company (or inferred)",
    "summary": "1 sentence summary",
    "location": "Location if found",
    "salary": "Salary range if found",
    "flags": ["list", "of", "red/yellow", "flags"],
    "hiddenSignals": ["list", "of", "subtle", "insights"],
    "cultureMatch": "High/Medium/Low - reasoning"
  }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(text);

    return {
      verdict: data.verdict,
      score: data.score,
      analysis: {
        flags: data.flags || [],
        hiddenSignals: data.hiddenSignals || [],
        cultureMatch: data.cultureMatch || "Unknown"
      },
      jobDetails: {
        title: data.jobTitle || "Unknown Role",
        company: data.company || "Unknown Co",
        summary: data.summary || "No summary available",
        location: data.location,
        salary: data.salary
      }
    };
  } catch (e) {
    console.error("[INTELLIGENCE] AI Analysis Failed:", e);
    return {
      verdict: "⚪ INCONCLUSIVE",
      score: 50,
      analysis: { flags: ["AI_PARSING_ERROR"], hiddenSignals: [], cultureMatch: "N/A" },
      jobDetails: { title: "Error", company: "Error", summary: "AI failed to parse." }
    };
  }
}
