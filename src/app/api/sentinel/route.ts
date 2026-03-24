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
    // 🔍 DISCOVERY
    if (mode === "DISCOVER") {
      const searchRes = await fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers,
        body: JSON.stringify({ filter: { property: "object", value: "database" } }),
      });
      const searchData = await searchRes.json();
      
      const directory = searchData.results?.find((d: any) => d.title?.[0]?.plain_text?.includes("Employee Directory"));
      const cohorts = searchData.results?.find((d: any) => d.title?.[0]?.plain_text?.includes("Mentorship Cohorts"));

      return NextResponse.json({ 
        success: true, 
        directoryId: directory?.id, 
        cohortsId: cohorts?.id,
        found: !!(directory && cohorts)
      });
    }

    // 🏗️ ARCHITECT: Create databases if they don't exist
    if (mode === "INITIALIZE_WORKSPACE") {
      // 1. Find a parent page to host the databases
      const pageSearch = await fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers,
        body: JSON.stringify({ filter: { property: "object", value: "page" }, page_size: 1 }),
      });
      const pageData = await pageSearch.json();
      const parentId = pageData.results?.[0]?.id;

      if (!parentId) throw new Error("No shared page found. Please share at least one Notion page with this integration.");

      // 2. Create Employee Directory
      const createDir = await fetch("https://api.notion.com/v1/databases", {
        method: "POST",
        headers,
        body: JSON.stringify({
          parent: { page_id: parentId },
          title: [{ text: { content: "Employee Directory" } }],
          properties: {
            "Name": { title: {} },
            "Role": { select: { options: [{ name: "Senior Lead", color: "blue" }, { name: "Junior Dev", color: "green" }] } },
            "Skills": { multi_select: { options: [{ name: "React" }, { name: "Node.js" }, { name: "TypeScript" }] } }
          }
        }),
      });
      
      // 3. Create Mentorship Cohorts
      const createCohorts = await fetch("https://api.notion.com/v1/databases", {
        method: "POST",
        headers,
        body: JSON.stringify({
          parent: { page_id: parentId },
          title: [{ text: { content: "Mentorship Cohorts" } }],
          properties: {
            "Name": { title: {} },
            "Status": { select: { options: [{ name: "Active", color: "green" }, { name: "Completed", color: "gray" }] } }
          }
        }),
      });

      return NextResponse.json({ success: true, message: "Workspace Initialized" });
    }

    // 📋 FETCH DIRECTORY
    if (mode === "FETCH_DIRECTORY" && payload.directoryId) {
      const queryRes = await fetch(`https://api.notion.com/v1/databases/${payload.directoryId}/query`, {
        method: "POST",
        headers,
      });
      const queryData = await queryRes.json();
      return NextResponse.json({ success: true, results: queryData.results });
    }

    // 🚀 EXECUTE MATCH
    if (mode === "EXECUTE_MATCH" && payload.cohortsId) {
      const createRes = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers,
        body: JSON.stringify({
          parent: { database_id: payload.cohortsId },
          properties: {
            "Name": { title: [{ text: { content: `Sovereign Sync: ${payload.userName || "Admin"}` } }] },
            "Status": { select: { name: "Active" } }
          }
        }),
      });
      const createData = await createRes.json();
      return NextResponse.json({ success: true, url: createData.url });
    }

    return NextResponse.json({ success: false, error: "Invalid Mode" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
