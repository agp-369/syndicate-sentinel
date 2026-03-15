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

    // 2. QUERY FOR UNPROCESSED ROWS
    stage = "DATABASE_QUERY";
    const dbResponse = await fetch(`https://api.notion.com/v1/databases/${pageId}/query`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({ filter: { property: "Status", select: { is_empty: true } }, page_size: 1 })
    });

    const dbData = await dbResponse.json();
    let targetPage = dbData.results?.[0];

    // --- AUTO-SEED LOGIC: IF EMPTY, CREATE A REAL DISCOVERY ---
    if (!targetPage) {
      stage = "AUTO_SEED_PROTOCOL";
      console.log("No empty rows found. Generating autonomous discovery...");
      
      const seedPrompt = "Generate 1 high-growth tech internship lead (e.g. Google, Meta). Return RAW JSON only: { \"role\": \"string\", \"company\": \"string\", \"url\": \"string\" }";
      const seedResult = await model.generateContent(seedPrompt);
      const lead = JSON.parse(seedResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

      const createResponse = await fetch(`https://api.notion.com/v1/pages`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify({
          parent: { database_id: pageId },
          properties: {
            "Name": { title: [{ text: { content: `${lead.role} at ${lead.company}` } }] },
            "Job Link": { url: lead.url },
            "Status": { select: { name: "🟡 PENDING_APPROVAL" } }
          }
        })
      });

      if (!createResponse.ok) throw new Error("AUTO_SEED_FAILED: Ensure your database has 'Name', 'Job Link', and 'Status' columns.");
      const newPage = await createResponse.json();
      targetPage = newPage;
    }

    const targetPageId = targetPage.id;
    const props = targetPage.properties;

    // 3. PROFILE EXTRACTION (Fetching Real Context)
    stage = "IDENTITY_PROBE";
    let profileContext = "User: Technology Expert.";
    if (userProfileId) {
      const profileRes = await fetch(`https://api.notion.com/v1/pages/${userProfileId}`, {
        headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28" }
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        profileContext = JSON.stringify(profileData.properties);
      }
    }

    // 4. AGENTIC ANALYSIS
    stage = "AI_GUARDIAN_SYNTHESIS";
    const prompt = `
      ROLE: Notion Career Agent (NCA).
      CONTEXT: ${profileContext}
      TARGET_JOB: ${JSON.stringify(props)}
      TASK: Perform Forensics, Match Skills, and Draft a Pitch. 
      RETURN RAW JSON ONLY: { "tag": "🟢 VERIFIED | 🔴 SCAM RISK", "score": 92, "pitch": "3 high-conversion sentences." }
    `;

    const aiResult = await model.generateContent(prompt);
    const intel = JSON.parse(aiResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

    // 5. FINAL WORKSPACE SYNC
    stage = "NOTION_WRITEBACK";
    const updatePayload: any = { properties: {} };
    const findKey = (name: string) => Object.keys(props).find(k => k.toLowerCase().includes(name.toLowerCase()));

    const statusKey = findKey("Status");
    const scoreKey = findKey("Match Score");
    const pitchKey = findKey("Tailored Pitch");

    if (statusKey) updatePayload.properties[statusKey] = { select: { name: intel.tag } };
    if (scoreKey) updatePayload.properties[scoreKey] = { number: (intel.score || 85) / 100 };
    if (pitchKey) updatePayload.properties[pitchKey] = { rich_text: [{ text: { content: intel.pitch } }] };

    await fetch(`https://api.notion.com/v1/pages/${targetPageId}`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload)
    });

    const titleKey = Object.keys(props).find(k => props[k].type === 'title') || "Name";
    const rowName = props[titleKey]?.title?.[0]?.plain_text || "Autonomous Lead";

    return NextResponse.json({ success: true, rowName, intel });

  } catch (error: any) {
    return NextResponse.json({ error: error.message, failed_at: stage }, { status: 500 });
  }
}
