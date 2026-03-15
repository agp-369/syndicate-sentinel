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

    // 2. QUERY FOR THE FIRST EMPTY ROW
    stage = "DATABASE_QUERY";
    console.log(`[${stage}] Querying Database: ${pageId}`);
    
    const dbResponse = await fetch(`https://api.notion.com/v1/databases/${pageId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${notionToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        filter: {
          property: "Status",
          select: { is_empty: true }
        },
        page_size: 1 
      })
    });

    if (!dbResponse.ok) {
      const err = await dbResponse.json();
      throw new Error(`NOTION_QUERY_FAILED: ${err.message}`);
    }

    const dbData = await dbResponse.json();
    let targetPage = dbData.results?.[0];

    // FALLBACK: Target the most recent row if no empty ones exist
    if (!targetPage) {
      console.log("No empty rows found, targeting most recent row.");
      const fallbackResponse = await fetch(`https://api.notion.com/v1/databases/${pageId}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${notionToken}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ page_size: 1 })
      });
      const fallbackData = await fallbackResponse.json();
      targetPage = fallbackData.results?.[0];
    }

    if (!targetPage) throw new Error("DATABASE_IS_TOTALLY_EMPTY");

    const targetPageId = targetPage.id;
    const props = targetPage.properties;

    // SAFE TITLE EXTRACTION
    const titleKey = Object.keys(props).find(k => props[k].type === 'title') || "Name";
    const rowName = props[titleKey]?.title?.[0]?.plain_text || "Untitled Lead";
    console.log(`TARGET_IDENTIFIED: ${rowName} (${targetPageId})`);

    // 3. PROFILE EXTRACTION
    stage = "PROFILE_FETCH";
    let profileText = "No profile provided.";
    if (userProfileId) {
      const profileResponse = await fetch(`https://api.notion.com/v1/pages/${userProfileId}`, {
        headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28" }
      });
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        profileText = JSON.stringify(profileData.properties);
      }
    }

    // 4. AI SYNTHESIS
    stage = "AI_SYNTHESIS";
    const prompt = `
      You are 'Nexus Architect'. Analyze this job lead from Notion.
      JOB_DATA: ${JSON.stringify(props)}
      USER_PROFILE: ${profileText}
      
      TASK:
      1. FORENSICS: Is this a scam? (Check for high pay, Telegram, Zelle).
      2. MATCHING: 0-100 score based on Skills.
      3. DRAFTING: 2-sentence pitch using user's voice.
      
      RETURN RAW JSON ONLY:
      {
        "verdict": "SCAM | CLEAR",
        "tag": "🔴 SCAM RISK | 🟢 VERIFIED",
        "score": 85,
        "draft": "Tailored pitch text..."
      }
    `;

    const aiResult = await model.generateContent(prompt);
    const text = aiResult.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI_SYNTHESIS_CORRUPT: Gemini failed to return valid JSON.");
    const intel = JSON.parse(jsonMatch[0]);

    // 5. WORKSPACE SYNC
    stage = "NOTION_WRITEBACK";
    const updatePayload: any = { properties: {} };
    
    // CASE-INSENSITIVE KEY MATCHING
    const findKey = (name: string) => Object.keys(props).find(k => k.toLowerCase().includes(name.toLowerCase()));

    const statusKey = findKey("Status");
    const scoreKey = findKey("Match Score");
    const pitchKey = findKey("Tailored Pitch");

    // We detect property types to ensure correct formatting
    if (statusKey) {
      const type = props[statusKey].type;
      if (type === 'select') {
        updatePayload.properties[statusKey] = { select: { name: intel.tag || "🟢 VERIFIED" } };
      } else if (type === 'status') {
        updatePayload.properties[statusKey] = { status: { name: intel.tag || "🟢 VERIFIED" } };
      }
    }

    if (scoreKey) updatePayload.properties[scoreKey] = { number: (intel.score || 85) / 100 };
    
    if (pitchKey) {
      updatePayload.properties[pitchKey] = { rich_text: [{ text: { content: intel.draft || "Pitch generated." } }] };
    }

    console.log("DISPATCHING_NOTION_UPDATE:", JSON.stringify(updatePayload));

    const updateResponse = await fetch(`https://api.notion.com/v1/pages/${targetPageId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${notionToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateResponse.ok) {
      const errData = await updateResponse.json();
      throw new Error(`NOTION_PATCH_REJECTED: ${errData.message}`);
    }

    return NextResponse.json({ success: true, rowName, intel });

  } catch (error: any) {
    console.error(`[SENTINEL_FAILURE] Stage: ${stage} | Error:`, error.message);
    return NextResponse.json({ 
      error: error.message || "Internal Dispatch Error", 
      failed_at: stage 
    }, { status: 500 });
  }
}
