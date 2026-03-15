import { GoogleGenerativeAI } from "@google/generative-ai";

export class SentinelWatchdog {
  private notionToken: string;
  private genAI: GoogleGenerativeAI;

  constructor(notionToken: string) {
    this.notionToken = notionToken;
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  private async notionFetch(endpoint: string, method: string = "GET", body?: any) {
    const res = await fetch(`https://api.notion.com/v1/${endpoint}`, {
      method,
      headers: {
        "Authorization": `Bearer ${this.notionToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`NOTION_ERROR: ${err.message}`);
    }
    return res.json();
  }

  async checkForNewLeads(databaseId: string) {
    try {
      const data = await this.notionFetch(`databases/${databaseId}/query`, "POST", {
        filter: { property: "Status", select: { is_empty: true } },
        page_size: 1
      });
      return data.results || [];
    } catch (e) { return []; }
  }

  async checkForApprovals(databaseId: string) {
    try {
      const data = await this.notionFetch(`databases/${databaseId}/query`, "POST", {
        filter: { property: "Approved", checkbox: { equals: true } },
        page_size: 1
      });
      return data.results || [];
    } catch (e) { return []; }
  }

  async finalizeLead(pageId: string) {
    try {
      // 1. Mark as Finalized
      await this.notionFetch(`pages/${pageId}`, "PATCH", {
        properties: {
          "Status": { select: { name: "🚀 FINALIZED" } },
          "Approved": { checkbox: false }
        }
      });

      // 2. Append Follow-up Block
      await this.notionFetch(`blocks/${pageId}/children`, "PATCH", {
        children: [
          {
            object: "block",
            type: "heading_3",
            heading_3: { rich_text: [{ type: "text", text: { content: "Syndicate Follow-up Protocol" } }] }
          },
          {
            object: "block",
            type: "to_do",
            to_do: { 
              rich_text: [{ type: "text", text: { content: "Send application and pitch to recruiter." } }],
              checked: false
            }
          }
        ]
      });
      return true;
    } catch (e) { return false; }
  }

  async processLead(pageId: string, profileId: string) {
    try {
      const [page, profile] = await Promise.all([
        this.notionFetch(`pages/${pageId}`),
        this.notionFetch(`pages/${profileId}`)
      ]);

      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `Perform forensics and matching for: ${JSON.stringify(page.properties)} using career profile: ${JSON.stringify(profile.properties)}. Return valid JSON with verdict, score, pitch, and tag.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const intel = JSON.parse(jsonMatch ? jsonMatch[0] : text);

      await this.notionFetch(`pages/${pageId}`, "PATCH", {
        properties: {
          "Status": { select: { name: intel.tag || "🟢 VERIFIED" } },
          "Match Score": { number: (intel.score || 85) / 100 },
          "Tailored Pitch": { rich_text: [{ text: { content: intel.draft || "Pitch generated." } }] }
        }
      });
    } catch (e) { console.error("ProcessLead Failure:", e); }
  }
}
