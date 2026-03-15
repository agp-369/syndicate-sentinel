import { Client } from "@notionhq/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

export class SentinelWatchdog {
  private notion: Client;
  private genAI: GoogleGenerativeAI;

  constructor(notionToken: string) {
    this.notion = new Client({ auth: notionToken });
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  async checkForNewLeads(databaseId: string) {
    try {
      const response = await this.notion.databases.query({
        database_id: databaseId,
        filter: { property: "Status", select: { is_empty: true } },
        page_size: 1
      });
      return response.results;
    } catch (e) { return []; }
  }

  async checkForApprovals(databaseId: string) {
    try {
      const response = await this.notion.databases.query({
        database_id: databaseId,
        filter: {
          and: [
            { property: "Approved", checkbox: { equals: true } },
            { property: "Status", select: { equals: "🟢 VERIFIED" } }
          ]
        },
        page_size: 1
      });
      return response.results;
    } catch (e) { return []; }
  }

  async finalizeLead(pageId: string) {
    try {
      // 1. Mark as Finalized
      await this.notion.pages.update({
        page_id: pageId,
        properties: {
          "Status": { select: { name: "🚀 FINALIZED" } },
          "Approved": { checkbox: false } // Uncheck to prevent infinite loop
        }
      });

      // 2. Create Follow-up Block inside the page
      await this.notion.blocks.children.append({
        block_id: pageId,
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
          },
          {
            object: "block",
            type: "to_do",
            to_do: { 
              rich_text: [{ type: "text", text: { content: "Follow up in 3 days if no response." } }],
              checked: false
            }
          }
        ]
      });
      return true;
    } catch (e) {
      console.error("Finalization Error:", e);
      return false;
    }
  }

  async processLead(pageId: string, profileId: string) {
    // Existing logic for forensics and matching
    const [page, profile]: any = await Promise.all([
      this.notion.pages.retrieve({ page_id: pageId }),
      this.notion.pages.retrieve({ page_id: profileId })
    ]);

    const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Perform forensics and matching for: ${JSON.stringify(page.properties)} using user profile: ${JSON.stringify(profile.properties)}. Return valid JSON with verdict, score, pitch, and tag.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const intel = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    await this.notion.pages.update({
      page_id: pageId,
      properties: {
        "Status": { select: { name: intel.tag || "🟢 VERIFIED" } },
        "Match Score": { number: (intel.score || 85) / 100 },
        "Tailored Pitch": { rich_text: [{ text: { content: intel.draft || "Pitch generated." } }] }
      }
    });
  }
}
