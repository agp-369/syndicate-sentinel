import { NextResponse } from "next/server";

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
      
      const talent = searchData.results?.find((d: any) => d.title?.[0]?.plain_text?.toLowerCase().includes("talent"));
      const manifolds = searchData.results?.find((d: any) => d.title?.[0]?.plain_text?.toLowerCase().includes("manifold"));

      return NextResponse.json({ 
        success: true, 
        talentId: talent?.id, 
        manifoldId: manifolds?.id,
        connected: !!(talent && manifolds)
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

    // 🚀 SYNC: The "Agentic" action - Creating a Career Strategy
    if (mode === "GENERATE_STRATEGY" && payload.manifoldId) {
      const res = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers,
        body: JSON.stringify({
          parent: { database_id: payload.manifoldId },
          properties: {
            "Name": { title: [{ text: { content: `Sentinel Strategy: ${payload.targetName}` } }] },
            "Status": { select: { name: "Draft" } }
          },
          children: [
            { object: "block", type: "heading_1", heading_1: { rich_text: [{ text: { content: "Autonomous Career Manifold" } }] } },
            { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: `Strategic roadmap generated for ${payload.targetName} by Syndicate Sentinel MCP.` } }] } }
          ]
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
