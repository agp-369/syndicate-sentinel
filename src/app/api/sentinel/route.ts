import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let stage = "INIT";
  try {
    const { pageId, notionToken, userProfileId } = await req.json();
    
    stage = "UPLINK_SETUP";
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY_NOT_FOUND");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 2. QUERY DATABASE
    stage = "DATABASE_QUERY";
    const dbResponse = await fetch(`https://api.notion.com/v1/databases/${pageId}/query`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({ filter: { property: "Status", select: { is_empty: true } }, page_size: 1 })
    });
    const dbData = await dbResponse.json();
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

    // 3. DEEP IDENTITY PROBE (Fetching real context)
    stage = "IDENTITY_PROBE";
    let profileContext = "User is a tech enthusiast.";
    if (userProfileId) {
      const profileRes = await fetch(`https://api.notion.com/v1/pages/${userProfileId}`, {
        headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28" }
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        profileContext = JSON.stringify(profileData.properties);
      }
    }

    // 4. MASTER AGENT REASONING
    stage = "AI_SYNTHESIS";
    const prompt = `
      ROLE: Master Recruiter & Career Strategist.
      CONTEXT: ${profileContext}
      TARGET_JOB: ${JSON.stringify(props)}
      
      TASK:
      1. FORENSICS: Perform deep scam analysis. Check domain logic.
      2. VOICE CLONING: Analyze the user's skills and projects. 
      3. HIGH-CONVERSION PITCH: Write a 3-sentence tailored pitch. 
         - Sentence 1: Connect a specific skill from the user profile to the job.
         - Sentence 2: Mention a relevant project if found in context.
         - Sentence 3: Direct call to action.
      
      RETURN RAW JSON ONLY:
      {
        "tag": "🔴 SCAM RISK | 🟢 VERIFIED",
        "score": 85,
        "draft": "A professional, personalized pitch that sounds like a human wrote it."
      }
    `;

    const aiResult = await model.generateContent(prompt);
    const text = aiResult.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const intel = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    // 5. WORKSPACE SYNC
    stage = "NOTION_WRITEBACK";
    const updatePayload: any = { properties: {} };
    const findKey = (name: string) => Object.keys(props).find(k => k.toLowerCase().includes(name.toLowerCase()));

    const statusKey = findKey("Status");
    const scoreKey = findKey("Match Score");
    const pitchKey = findKey("Tailored Pitch");

    if (statusKey) updatePayload.properties[statusKey] = { select: { name: intel.tag || "🟢 VERIFIED" } };
    if (scoreKey) updatePayload.properties[scoreKey] = { number: (intel.score || 85) / 100 };
    if (pitchKey) updatePayload.properties[pitchKey] = { rich_text: [{ text: { content: intel.draft } }] };

    await fetch(`https://api.notion.com/v1/pages/${targetPageId}`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload)
    });

    const titleKey = Object.keys(props).find(k => props[k].type === 'title') || "Name";
    const rowName = props[titleKey]?.title?.[0]?.plain_text || "Untitled Lead";

    return NextResponse.json({ success: true, rowName, intel });

  } catch (error: any) {
    return NextResponse.json({ error: error.message, failed_at: stage }, { status: 500 });
  }
}
