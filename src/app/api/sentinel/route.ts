import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export async function POST(req: Request) {
  let stage = "INIT";
  try {
    const { mode, dbIds, payload } = await req.json();
    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    if (mode === "AGENTIC_SYNC") {
      // 1. AUTONOMOUS SEARCH (Querying Notion)
      stage = "AGENTIC_SEARCH";
      const directoryRes = await notion.databases.query({ database_id: dbIds.talent });
      const employees = directoryRes.results;

      // 2. AGENTIC REASONING (The Brain decides the match)
      stage = "AGENTIC_REASONING";
      const decisionPrompt = `
        ROLE: Chief Talent Architect.
        CONTEXT: Employees found in Notion: ${JSON.stringify(employees)}
        TASK: Find the perfect mentor for a junior dev from this list. 
        Then, generate a detailed 90-day React & Next.js syllabus for them.
        
        OUTPUT JSON:
        {
          "match_name": "Senior Developer x Junior React",
          "confidence": 98,
          "syllabus": "Detailed week-by-week learning path content..."
        }
      `;
      const aiResult = await model.generateContent(decisionPrompt);
      const decision = JSON.parse(aiResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

      // 3. AUTONOMOUS WRITE (Creating the Workspace Page)
      stage = "AGENTIC_WRITE";
      const newPage = await notion.pages.create({
        parent: { database_id: dbIds.mentorship },
        properties: { "Name": { title: [{ text: { content: `🤝 Workspace: ${decision.match_name}` } }] } },
        children: [
          { object: "block", type: "heading_1", heading_1: { rich_text: [{ type: "text", text: { content: "🚀 Sovereign 90-Day Learning Path" } }] } },
          { object: "block", type: "callout", callout: { icon: { emoji: "🧠" }, color: "blue_background", rich_text: [{ type: "text", text: { content: `AI Match Confidence: ${decision.confidence}%` } }] } },
          { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: decision.syllabus } }] } }
        ]
      });

      return NextResponse.json({ success: true, pageUrl: (newPage as any).url });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message, failed_at: stage }, { status: 500 });
  }
}
