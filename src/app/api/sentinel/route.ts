import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let stage = "INIT";
  try {
    const { pageId, notionToken, userProfileId } = await req.json();
    
    stage = "UPLINK_SETUP";
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 2. QUERY DATABASE
    const dbRes = await fetch(`https://api.notion.com/v1/databases/${pageId}/query`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({ filter: { property: "Status", select: { is_empty: true } }, page_size: 1 })
    });
    const dbData = await dbRes.json();
    let targetPage = dbData.results?.[0];

    if (!targetPage) {
      const fallback = await fetch(`https://api.notion.com/v1/databases/${pageId}/query`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify({ page_size: 1 })
      });
      const fallbackData = await fallback.json();
      targetPage = fallbackData.results?.[0];
    }

    if (!targetPage) throw new Error("DATABASE_EMPTY");

    const targetPageId = targetPage.id;
    const props = targetPage.properties;

    // 3. IDENTITY PROBE
    let profileContext = "User: Abhishek, Full-Stack Dev.";
    if (userProfileId) {
      const profileRes = await fetch(`https://api.notion.com/v1/pages/${userProfileId}`, {
        headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28" }
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        profileContext = JSON.stringify(profileData.properties);
      }
    }

    // 4. DISPATCH REASONING
    stage = "AI_DISPATCH_SYNTHESIS";
    const prompt = `
      ROLE: Master Dispatch Agent.
      CONTEXT: ${profileContext}
      TARGET_JOB: ${JSON.stringify(props)}
      
      TASK:
      1. FORENSICS: Is it a scam?
      2. PITCH: Write a high-conversion 3-sentence tailored pitch.
      3. DISPATCH: Draft a full professional email to the recruiter.
         - Subject: High-impact line.
         - Body: Connect user skills to job requirements.
      
      RETURN RAW JSON ONLY:
      {
        "tag": "🟢 VERIFIED",
        "score": 92,
        "pitch": "Brief tailored pitch for Notion row.",
        "email_subject": "Application: [Job Title] - Abhishek",
        "email_body": "Full professional email content..."
      }
    `;

    const aiResult = await model.generateContent(prompt);
    const intel = JSON.parse(aiResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

    // 5. WORKSPACE HARDENING
    stage = "NOTION_WRITEBACK";
    const updatePayload: any = { properties: {} };
    const findKey = (name: string) => Object.keys(props).find(k => k.toLowerCase().includes(name.toLowerCase()));

    const statusKey = findKey("Status");
    const scoreKey = findKey("Match Score");
    const pitchKey = findKey("Tailored Pitch");

    if (statusKey) updatePayload.properties[statusKey] = { select: { name: intel.tag || "🟢 VERIFIED" } };
    if (scoreKey) updatePayload.properties[scoreKey] = { number: (intel.score || 85) / 100 };
    if (pitchKey) updatePayload.properties[pitchKey] = { rich_text: [{ text: { content: intel.pitch } }] };

    // Update the row
    await fetch(`https://api.notion.com/v1/pages/${targetPageId}`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload)
    });

    // APPEND FULL EMAIL DRAFT TO PAGE CONTENT
    await fetch(`https://api.notion.com/v1/blocks/${targetPageId}/children`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({
        children: [
          { object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: "📫 Professional Dispatch Draft" } }] } },
          { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: `Subject: ${intel.email_subject}` } }] } },
          { object: "block", type: "callout", callout: { icon: { emoji: "✍️" }, rich_text: [{ type: "text", text: { content: intel.email_body } }] } }
        ]
      })
    });

    return NextResponse.json({ success: true, rowName: "Updated", intel });

  } catch (error: any) {
    return NextResponse.json({ error: error.message, failed_at: stage }, { status: 500 });
  }
}
