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

export interface WorkspaceSetup {
  jobLedgerId?: string;
  talentPoolId?: string;
  careerRoadmapId?: string;
  agentLogId?: string;
}

export class NotionMCPClient {
  private gateway: NotionMCPGateway;

  constructor(token: string) {
    this.gateway = new NotionMCPGateway(token);
  }

  /**
   * Provision a complete Lumina workspace in Notion.
   * Every database creation goes through the real MCP protocol.
   */
  async initializeWorkspace(
    parentPageId: string,
    onLog?: (tx: MCPTransaction) => void
  ): Promise<WorkspaceSetup> {
    const setup: WorkspaceSetup = {};

    try {
      // Step 0 — MCP capability handshake
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
        onLog,
        ["Defining 9 typed properties: title, select, number, rich_text, url, date..."]
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
        onLog,
        ["Building Talent Pool candidate tracker..."]
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
        onLog,
        ["Setting up 90-day milestone tracker..."]
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
        onLog,
        ["Creating MCP action audit trail database..."]
      );
      setup.agentLogId = auditLog?.id;

      // Step 5 — Welcome page content via MCP
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
            {
              object: "block",
              type: "numbered_list_item",
              numbered_list_item: { rich_text: [{ type: "text", text: { content: "Approve the AI verdict — only then does it write to your Career Ledger via MCP" } }] },
            },
            {
              object: "block",
              type: "heading_2",
              heading_2: { rich_text: [{ type: "text", text: { content: "📊 Your Databases" } }] },
            },
            {
              object: "block",
              type: "paragraph",
              paragraph: { rich_text: [{ type: "text", text: { content: "🛰️ Career Ledger  ·  👥 Talent Pool  ·  🗺️ Career Roadmaps  ·  📊 Agent Audit Log" } }] },
            },
          ],
        },
        onLog,
        ["Appending workspace guide and getting-started blocks..."]
      );

      // Step 6 — Seed sample data so the workspace feels alive immediately
      if (setup.jobLedgerId) {
        await this.gateway.callTool(
          "notion_create_page",
          {
            parent: { database_id: setup.jobLedgerId },
            icon: { type: "emoji", emoji: "🟢" },
            properties: {
              "Job Title": { title: [{ text: { content: "Senior Software Engineer @ Vercel" } }] },
              "Status": { select: { name: "🟢 VERIFIED" } },
              "Trust Score": { number: 0.94 },
              "Company": { rich_text: [{ text: { content: "Vercel" } }] },
              "Location": { rich_text: [{ text: { content: "Remote (Global)" } }] },
              "Job URL": { url: "https://vercel.com/careers" },
            },
            children: [
              { object: "block", type: "callout", callout: { rich_text: [{ type: "text", text: { content: "SAMPLE — This is what a Lumina-verified job looks like." } }], icon: { emoji: "✅" }, color: "green_background" } },
            ],
          },
          onLog,
          ["Seeding sample verified job entry..."]
        );

        await this.gateway.callTool(
          "notion_create_page",
          {
            parent: { database_id: setup.jobLedgerId },
            icon: { type: "emoji", emoji: "🔴" },
            properties: {
              "Job Title": { title: [{ text: { content: "Easy Remote Job — Earn $800/Day From Home" } }] },
              "Status": { select: { name: "🔴 SCAM_RISK" } },
              "Trust Score": { number: 0.06 },
              "Company": { rich_text: [{ text: { content: "Unknown" } }] },
            },
            children: [
              { object: "block", type: "callout", callout: { rich_text: [{ type: "text", text: { content: "SAMPLE SCAM — Detected: implausible salary, no company domain, WhatsApp contact." } }], icon: { emoji: "🚨" }, color: "red_background" } },
            ],
          },
          onLog,
          ["Seeding sample scam-flagged entry..."]
        );
      }

      // Step 7 — Seed Career Roadmap entries
      if (setup.careerRoadmapId) {
        const phases = [
          { name: "Days 1-30: Foundation", phase: "Foundation", progress: 0 },
          { name: "Days 31-60: Growth", phase: "Growth", progress: 0 },
          { name: "Days 61-90: Mastery", phase: "Mastery", progress: 0 },
        ];
        for (const p of phases) {
          await this.gateway.callTool(
            "notion_create_page",
            {
              parent: { database_id: setup.careerRoadmapId },
              properties: {
                "Milestone": { title: [{ text: { content: p.name } }] },
                "Phase": { select: { name: p.phase } },
                "Progress": { number: p.progress },
                "Status": { select: { name: "Not Started" } },
              },
            },
            onLog,
            [`Seeding roadmap phase: ${p.phase}...`]
          );
        }
      }
    } finally {
      await this.gateway.close();
    }

    return setup;
  }

  /** Write a forensic audit report as a new Career Ledger page via MCP. */
  async logForensicAudit(
    ledgerId: string,
    analysis: ForensicReport,
    url: string,
    onLog?: (tx: MCPTransaction) => void
  ): Promise<string> {
    const statusName = analysis.verdict.includes("LEGITIMATE")
      ? "🟢 VERIFIED"
      : analysis.verdict.includes("SCAM")
      ? "🔴 SCAM_RISK"
      : "🟡 AWAITING_REVIEW";

    let pageId = "";
    try {
      const result = await this.gateway.callTool(
        "notion_create_page",
        {
          parent: { database_id: ledgerId },
          properties: {
            "Job Title": {
              title: [{ text: { content: `${analysis.jobDetails.company}: ${analysis.jobDetails.title}` } }],
            },
            "Company": { rich_text: [{ text: { content: analysis.jobDetails.company } }] },
            "Status": { select: { name: statusName } },
            "Trust Score": { number: analysis.score / 100 },
            "Job URL": { url },
            ...(analysis.jobDetails.location
              ? { Location: { rich_text: [{ text: { content: analysis.jobDetails.location } }] } }
              : {}),
            ...(analysis.jobDetails.salary
              ? { "Salary Range": { rich_text: [{ text: { content: analysis.jobDetails.salary } }] } }
              : {}),
          },
          children: [
            {
              object: "block",
              type: "callout",
              callout: {
                rich_text: [{ type: "text", text: { content: `FORENSIC VERDICT: ${analysis.verdict}  |  TRUST SCORE: ${analysis.score}%` } }],
                icon: { emoji: analysis.score > 80 ? "🟢" : analysis.score > 50 ? "🟡" : "🔴" },
                color: analysis.score > 80 ? "green_background" : analysis.score > 50 ? "yellow_background" : "red_background",
              },
            },
            { object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "📋 Summary" } }] } },
            { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: analysis.jobDetails.summary } }] } },
            { object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "🚩 Forensic Flags" } }] } },
            ...(analysis.analysis.flags.length > 0
              ? analysis.analysis.flags.map((flag) => ({
                  object: "block" as const,
                  type: "bulleted_list_item" as const,
                  bulleted_list_item: { rich_text: [{ type: "text" as const, text: { content: flag } }] },
                }))
              : [{ object: "block" as const, type: "paragraph" as const, paragraph: { rich_text: [{ type: "text" as const, text: { content: "✅ No red flags detected." } }] } }]),
            { object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "🔍 Hidden Signals" } }] } },
            { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: analysis.analysis.hiddenSignals.join("\n") || "No significant hidden signals." } }] } },
            { object: "block", type: "divider", divider: {} },
            {
              object: "block",
              type: "callout",
              callout: {
                rich_text: [{ type: "text", text: { content: `Culture Match: ${analysis.analysis.cultureMatch}` } }],
                icon: { emoji: "🎯" },
                color: "blue_background",
              },
            },
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [{
                  type: "text",
                  text: { content: `\nAnalyzed by Lumina Forensic Sentinel via Notion MCP · ${new Date().toISOString()}` },
                  annotations: { color: "gray" as const },
                }],
              },
            },
          ],
        },
        onLog,
        [
          `Target ledger: ${ledgerId.substring(0, 8)}...`,
          `Verdict: ${analysis.verdict} | Score: ${analysis.score}%`,
          "Writing structured forensic evidence...",
        ]
      );
      pageId = result?.id || "";
    } finally {
      await this.gateway.close();
    }

    return `https://notion.so/${pageId.replace(/-/g, "")}`;
  }

  /** Search Notion workspace for existing Lumina databases via MCP. */
  async searchDatabases(onLog?: (tx: MCPTransaction) => void): Promise<WorkspaceSetup> {
    let result: any = null;
    try {
      result = await this.gateway.callTool(
        "notion_search",
        { filter: { property: "object", value: "database" } },
        onLog,
        ["Scanning workspace for Lumina databases..."]
      );
    } finally {
      await this.gateway.close();
    }

    const setup: WorkspaceSetup = {};
    for (const db of (result?.results ?? []) as any[]) {
      const title: string =
        (db.title?.[0]?.plain_text ?? db.title?.[0]?.text?.content ?? "").toLowerCase();
      if (title.includes("career ledger")) setup.jobLedgerId = db.id;
      else if (title.includes("talent pool")) setup.talentPoolId = db.id;
      else if (title.includes("roadmap")) setup.careerRoadmapId = db.id;
      else if (title.includes("audit log")) setup.agentLogId = db.id;
    }
    return setup;
  }

  /** Query a database for its entries via MCP. */
  async queryDatabase(databaseId: string, onLog?: (tx: MCPTransaction) => void): Promise<any[]> {
    let result: any = null;
    try {
      result = await this.gateway.callTool(
        "notion_query_database",
        { database_id: databaseId, page_size: 20 },
        onLog,
        ["Reading Career Ledger entries..."]
      );
    } finally {
      await this.gateway.close();
    }
    return result?.results ?? [];
  }

  getTransactions(): MCPTransaction[] {
    return this.gateway.getTransactions();
  }
}

/** @deprecated Import from lib/intelligence instead */
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
