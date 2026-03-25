import { NextResponse } from "next/server";
import { runForensicAudit } from "@/lib/intelligence";

export async function POST(req: Request) {
  const { mode, accessToken, payload } = await req.json();
  if (!accessToken) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };

  try {
    // 🔍 SCAN: Finds the core Career databases
    if (mode === "SCAN_WORKSPACE") {
      const searchRes = await fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers,
        body: JSON.stringify({ filter: { property: "object", value: "database" } }),
      });
      const searchData = await searchRes.json();
      
      const findDb = (keywords: string[]) => 
        searchData.results?.find((d: any) => {
          const title = d.title?.[0]?.plain_text?.toLowerCase() || "";
          return keywords.some(k => title.includes(k));
        });

      const talent = findDb(["talent", "employee", "pool"]);
      const manifolds = findDb(["manifold", "career", "strategy"]);

      return NextResponse.json({ 
        success: true, 
        talentId: talent?.id, 
        manifoldId: manifolds?.id,
        connected: !!(talent && manifolds)
      });
    }

    // 🏗️ INITIALIZE: Creates the databases in Notion
    if (mode === "INITIALIZE_INFRASTRUCTURE") {
      // 1. Find a parent page to host the databases
      const pageSearch = await fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers,
        body: JSON.stringify({ filter: { property: "object", value: "page" }, page_size: 1 }),
      });
      const pageData = await pageSearch.json();
      const parentId = pageData.results?.[0]?.id;

      if (!parentId) throw new Error("No shared page found. Please ensure you have shared at least one Notion page with 'Syndicate Sentinel'.");

      // 2. Create Talent Pool
      const createTalent = await fetch("https://api.notion.com/v1/databases", {
        method: "POST",
        headers,
        body: JSON.stringify({
          parent: { page_id: parentId },
          title: [{ text: { content: "Talent Pool" } }],
          properties: {
            "Name": { title: {} },
            "Role": { select: { options: [{ name: "Senior Lead", color: "blue" }, { name: "Junior Dev", color: "green" }] } },
            "Skills": { multi_select: { options: [{ name: "React" }, { name: "Node.js" }] } }
          }
        }),
      });
      const talentData = await createTalent.json();

      // 3. Create Career Manifolds
      const createManifolds = await fetch("https://api.notion.com/v1/databases", {
        method: "POST",
        headers,
        body: JSON.stringify({
          parent: { page_id: parentId },
          title: [{ text: { content: "Career Manifolds" } }],
          properties: {
            "Name": { title: {} },
            "Status": { select: { options: [{ name: "Draft", color: "gray" }, { name: "Active", color: "green" }] } }
          }
        }),
      });
      const manifoldData = await createManifolds.json();

      return NextResponse.json({ 
        success: true, 
        talentId: talentData.id, 
        manifoldId: manifoldData.id 
      });
    }

    // 📋 READ: Fetches the Talent Pool
    if (mode === "READ_TALENT" && payload.talentId) {
      const res = await fetch(`https://api.notion.com/v1/databases/${payload.talentId}/query`, {
        method: "POST",
        headers,
      });
      const data = await res.json();
      return NextResponse.json({ success: true, results: data.results });
    }

    // 🛠️ DIAGNOSTICS: Check if keys/access are working
    if (mode === "SYSTEM_DIAGNOSTICS") {
        return NextResponse.json({ 
            success: true, 
            gemini: !!process.env.GEMINI_API_KEY,
            notion: !!process.env.NOTION_TOKEN,
            hasAccessToken: !!accessToken 
        });
    }

    // 🕵️‍♂️ FORENSIC AUDIT: Deep Scan & Log (HITL Phase 1)
    if (mode === "FORENSIC_AUDIT" && payload.url) {
      // 1. Run Intelligence Engine
      const analysis = await runForensicAudit(payload.url);

      // 2. Find Database
      const dbId = payload.dbId; 
      
      if (dbId) {
         // 3. Create Page in Notion with 'Awaiting Review' status (Plan: The Alchemist Stage 1)
         const res = await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers,
          body: JSON.stringify({
            parent: { database_id: dbId },
            properties: {
              "Name": { title: [{ text: { content: `${analysis.jobDetails.company}: ${analysis.jobDetails.title}` } }] },
              "Role": { select: { name: "AWAITING_REVIEW" } }, // Plan: Stage 1 State
              "Skills": { multi_select: analysis.analysis.flags.slice(0, 5).map(f => ({ name: f.substring(0,20).replace(/[^a-zA-Z0-9 ]/g, '') })) } 
            },
            children: [
              {
                object: "block",
                type: "callout",
                callout: {
                  rich_text: [{ type: "text", text: { content: `SENTINEL VERDICT: ${analysis.verdict} (${analysis.score}%) - HUMAN APPROVAL REQUIRED` } }],
                  icon: { emoji: "🛡️" },
                  color: analysis.score > 80 ? "green_background" : "yellow_background"
                }
              },
              {
                object: "block",
                type: "paragraph",
                paragraph: { rich_text: [{ type: "text", text: { content: `FORENSIC_SUMMARY: ${analysis.jobDetails.summary}` } }] }
              }
            ]
          }),
        });
        const data = await res.json();
        
        if (!res.ok) {
            console.error("[NOTION_ERROR]", data);
            throw new Error(`Notion Sync Failed: ${data.message || 'Unknown Error'}`);
        }

        return NextResponse.json({ success: true, analysis, url: data.url });
      }
      
      return NextResponse.json({ success: true, analysis, url: null });
    }

    // 🚀 SYNC: Generate Career Strategy
    if (mode === "GENERATE_STRATEGY" && payload.manifoldId) {
      const res = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers,
        body: JSON.stringify({
          parent: { database_id: payload.manifoldId },
          properties: {
            "Name": { title: [{ text: { content: `Sentinel Strategy: ${payload.targetName}` } }] },
            "Status": { select: { name: "Draft" } }
          }
        }),
      });
      const data = await res.json();
      return NextResponse.json({ success: true, url: data.url });
    }

    return NextResponse.json({ success: false, error: "Invalid Mode" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
