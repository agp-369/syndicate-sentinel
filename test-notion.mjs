// Quick test for Notion API
import { Client } from "@notionhq/client";

const token = process.env.NOTION_TOKEN || "ntn_PLACEHOLDER";
if (!token) {
  console.error("NOTION_TOKEN not found");
  process.exit(1);
}

const notion = new Client({ auth: token });

async function test() {
  console.log("Testing Notion API connection...");
  
  // Test search
  const search = await notion.search({
    filter: { property: "object", value: "database" },
    page_size: 5
  });
  console.log("Search works:", search.results.length, "databases found");
  
  // Test creating a database
  const pageId = search.results[0]?.id || process.env.NOTION_PAGE_ID;
  if (!pageId) {
    console.log("No page ID found to create database under");
    return;
  }
  
  console.log("Creating test database under:", pageId);
  const db = await notion.databases.create({
    parent: { type: "page_id", page_id: pageId },
    title: [{ type: "text", text: { content: "🧪 Test Database" } }],
    properties: {
      "Name": { title: {} },
      "Status": { select: { options: [{ name: "Active", color: "green" }] } }
    }
  });
  console.log("Database created:", db.id);
}

test().catch(console.error);
