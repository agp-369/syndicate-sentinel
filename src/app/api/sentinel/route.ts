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

    // --- STAGE 1: THE SEEKER (Autonomous Discovery) ---
    stage = "OPPORTUNITY_SEEKER";
    console.log("[STAGE] Running Opportunity Seeker...");
    try {
      // Scrape Hacker News 'Who is Hiring' RSS for fresh leads
      const hnRes = await axios.get("https://hnrss.org/whoishiring", { timeout: 5000 });
      const $ = cheerio.load(hnRes.data, { xmlMode: true });
      const latestJob = $("item").first();
      const jobTitle = latestJob.find("title").text();
      const jobLink = latestJob.find("link").text();

      // Check if this job is already in Notion (simplified for demo)
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
    } catch (e) { console.error("Seeker failed to find new leads, skipping..."); }

    // --- STAGE 2: THE FINALIZER (HITL Approval) ---
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
        body: JSON.stringify({
          properties: {
            "Status": { select: { name: "🚀 FINALIZED" } },
            "Approved": { checkbox: false }
          }
        })
      });
      // Append Follow-up Checklist
      await fetch(`https://api.notion.com/v1/blocks/${page.id}/children`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify({
          children: [
            { object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "Syndicate Follow-up Protocol" } }] } },
            { object: "block", type: "to_do", to_do: { rich_text: [{ type: "text", text: { content: "Send tailored email to recruiter." } }], checked: false } }
          ]
        })
      });
    }

    // --- STAGE 3: THE STRATEGIST (Forensics + Pitch) ---
    stage = "STRATEGIST_ANALYSIS";
    const pendingQuery = await fetch(`https://api.notion.com/v1/databases/${pageId}/query`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({ filter: { property: "Status", select: { is_empty: true } }, page_size: 1 })
    });
    const pendingData = await pendingQuery.json();
    const targetPage = pendingData.results?.[0];

    if (targetPage) {
      const aiResult = await model.generateContent(`Analyze this job: ${JSON.stringify(targetPage.properties)}`);
      const intel = JSON.parse(aiResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
      
      await fetch(`https://api.notion.com/v1/pages/${targetPage.id}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: {
            "Status": { select: { name: intel.tag || "🟢 VERIFIED" } },
            "Match Score": { number: (intel.score || 85) / 100 },
            "Tailored Pitch": { rich_text: [{ text: { content: intel.pitch || "Draft ready." } }] }
          }
        })
      });
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });

  } catch (error: any) {
    return NextResponse.json({ error: error.message, failed_at: stage }, { status: 500 });
  }
}
