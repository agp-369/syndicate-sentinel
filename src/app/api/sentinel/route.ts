import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

/**
 * 💎 PROJECT LUMINA: THE AUTONOMOUS CAREER OS
 * Forensics // Strategy // HITL Workflow
 */

export async function POST(req: Request) {
  let stage = "INIT";
  try {
    const { pageId, notionToken, userProfileId } = await req.json();
    
    stage = "UPLINK_SETUP";
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 1. QUERY DATABASE FOR WORK
    stage = "DATABASE_QUERY";
    const dbRes = await fetch(`https://api.notion.com/v1/databases/${pageId}/query`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({ 
        filter: {
          and: [
            { property: "Status", select: { is_empty: true } },
            { property: "Approved", checkbox: { equals: false } }
          ]
        },
        page_size: 1 
      })
    });
    const dbData = await dbRes.json();
    let targetPage = dbData.results?.[0];

    if (!targetPage) throw new Error("NO_NEW_LEADS_FOR_ANALYSIS");

    const props = targetPage.properties;
    const jobUrl = props["Job Link"]?.url || "";

    // 2. FETCH PROFILE & HISTORY (FOR THE ORACLE)
    stage = "CONTEXT_GATHERING";
    const [profileRes, historyRes] = await Promise.all([
      fetch(`https://api.notion.com/v1/pages/${userProfileId}`, { headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28" } }),
      fetch(`https://api.notion.com/v1/databases/${pageId}/query`, { 
        method: "POST", 
        headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify({ page_size: 5 }) // Get last 5 for history analysis
      })
    ]);

    const profileData = await profileRes.json();
    const historyData = await historyRes.json();

    // 3. LUMINA MULTI-STAGE REASONING
    stage = "LUMINA_CORE_SYNTHESIS";
    const prompt = `
      You are 'Lumina', the Autonomous Career OS. 
      USER_PROFILE: ${JSON.stringify(profileData.properties)}
      RECENT_HISTORY: ${JSON.stringify(historyData.results.map((r: any) => r.properties.Name))}
      TARGET_JOB: ${JSON.stringify(props)}
      
      TASK 1: FORENSICS (THE SENTINEL)
      - Check URL: ${jobUrl} (Flag .xyz, .top, .pw)
      - Check signals: Urgent, Telegram, PayPal, WhatsApp.
      - Score 0-100 Safety.
      
      TASK 2: STRATEGY (THE ORACLE)
      - Analyze if this job aligns with profile or history. 
      - Give 1 sentence of strategic advice (e.g. "Pivot to ML roles").
      
      TASK 3: HITL DRAFTING (THE ALCHEMIST)
      - Write a high-conversion tailored pitch.
      
      RETURN RAW JSON ONLY:
      {
        "safety_tag": "✅ Verified | ⚠️ Suspicious | ❌ High Risk",
        "match_score": 85,
        "strategy_insight": "...",
        "pitch_draft": "..."
      }
    `;

    const aiResult = await model.generateContent(prompt);
    const intel = JSON.parse(aiResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

    // 4. NOTION WRITEBACK
    stage = "LUMINA_WRITEBACK";
    const updatePayload = {
      properties: {
        "Status": { select: { name: intel.safety_tag } },
        "Match Score": { number: intel.match_score / 100 },
        "Career Insight": { rich_text: [{ text: { content: intel.strategy_insight } }] },
        "Tailored Pitch": { rich_text: [{ text: { content: intel.pitch_draft } }] }
      }
    };

    await fetch(`https://api.notion.com/v1/pages/${targetPage.id}`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload)
    });

    return NextResponse.json({ success: true, rowName: props.Name?.title?.[0]?.plain_text, intel });

  } catch (error: any) {
    return NextResponse.json({ error: error.message, failed_at: stage }, { status: 500 });
  }
}
