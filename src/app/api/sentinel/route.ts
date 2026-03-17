import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

export async function POST(req: Request) {
  let stage = "INIT";
  try {
    const { pageId, notionToken, userProfileId } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // --- STAGE 1: OPPORTUNITY SEEKER (Autonomous Web Probe) ---
    stage = "OPPORTUNITY_SEEKER";
    try {
      const hnRes = await axios.get("https://hnrss.org/whoishiring", { timeout: 5000 });
      const $ = cheerio.load(hnRes.data, { xmlMode: true });
      const latestJob = $("item").first();
      const jobTitle = latestJob.find("title").text();
      const jobLink = latestJob.find("link").text();

      await fetch(`https://api.notion.com/v1/pages`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify({
          parent: { database_id: pageId },
          properties: {
            "Name": { title: [{ text: { content: jobTitle } }] },
            "Job Link": { url: jobLink },
            "Status": { select: { name: "🟡 PENDING_APPROVAL" } }
          }
        })
      });
    } catch (e) { console.warn("Seeker skipped (No new leads)."); }

    // --- STAGE 2: HITL FINALIZER (Execution Loop) ---
    stage = "HITL_FINALIZER";
    const approvedQuery = await fetch(`https://api.notion.com/v1/databases/${pageId}/query`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({ filter: { property: "Approved", checkbox: { equals: true } } })
    });
    const approvedData = await approvedQuery.json();
    for (const page of approvedData.results || []) {
      await fetch(`https://api.notion.com/v1/pages/${page.id}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify({ properties: { "Status": { select: { name: "🚀 FINALIZED" } }, "Approved": { checkbox: false } } })
      });
      await fetch(`https://api.notion.com/v1/blocks/${page.id}/children`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify({
          children: [
            { object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "📫 Syndicate Dispatch Protocol" } }] } },
            { object: "block", type: "to_do", to_do: { rich_text: [{ type: "text", text: { content: "Action: Submit tailored pitch to hiring portal." } }], checked: false } }
          ]
        })
      });
    }

    // --- STAGE 3: FORENSIC STRATEGIST (Deep Intelligence) ---
    stage = "STRATEGIST_ANALYSIS";
    const pendingQuery = await fetch(`https://api.notion.com/v1/databases/${pageId}/query`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({ filter: { property: "Status", select: { is_empty: true } }, page_size: 1 })
    });
    const pendingData = await pendingQuery.json();
    const targetPage = pendingData.results?.[0];

    if (targetPage) {
      const profileRes = await fetch(`https://api.notion.com/v1/pages/${userProfileId}`, { headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28" } });
      const profileData = await profileRes.json();

      const prompt = `You are 'Lumina'. JOB: ${JSON.stringify(targetPage.properties)}. PROFILE: ${JSON.stringify(profileData.properties)}. TASK: Perform Cyber-Forensics, calculate Match Score, and write a Career Insight + Tailored Pitch. RETURN RAW JSON: { "tag": "🟢 VERIFIED | 🔴 SCAM RISK", "score": 85, "insight": "Strategic career fit...", "pitch": "Tailored message..." }`;
      const aiResult = await model.generateContent(prompt);
      const intel = JSON.parse(aiResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

      await fetch(`https://api.notion.com/v1/pages/${targetPage.id}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: {
            "Status": { select: { name: intel.tag } },
            "Match Score": { number: intel.score / 100 },
            "Career Insight": { rich_text: [{ text: { content: intel.insight } }] },
            "Tailored Pitch": { rich_text: [{ text: { content: intel.pitch } }] }
          }
        })
      });
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, failed_at: stage }, { status: 500 });
  }
}
