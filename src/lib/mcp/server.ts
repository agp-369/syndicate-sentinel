import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@notionhq/client";

/**
 * SOVEREIGN_NOTION_MCP_SERVER
 * This is the "Engine" that the AI Brain controls.
 */
const notion = new Client({ auth: process.env.NOTION_TOKEN });

const server = new Server(
  { name: "notion-forensic-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// 1. DEFINE TOOLS
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "query_directory",
      description: "Queries the Notion Employee/Job database for real rows.",
      inputSchema: { type: "object", properties: { databaseId: { type: "string" } } }
    },
    {
      name: "create_mentorship_workspace",
      description: "Spawns a brand new, shared mentorship page in Notion.",
      inputSchema: { 
        type: "object", 
        properties: { 
          parentDbId: { type: "string" },
          title: { type: "string" },
          syllabus: { type: "string" }
        } 
      }
    }
  ]
}));

// 2. TOOL EXECUTION LOGIC
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "query_directory") {
      const res = await notion.databases.query({ database_id: args?.databaseId as string });
      return { content: [{ type: "text", text: JSON.stringify(res.results) }] };
    }

    if (name === "create_mentorship_workspace") {
      const res = await notion.pages.create({
        parent: { database_id: args?.parentDbId as string },
        properties: { "Name": { title: [{ text: { content: args?.title as string } }] } },
        children: [
          { object: "block", type: "heading_1", heading_1: { rich_text: [{ type: "text", text: { content: "🚀 90-Day Learning Path" } }] } },
          { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: args?.syllabus as string } }] } }
        ]
      });
      return { content: [{ type: "text", text: `Workspace Created: ${res.url}` }] };
    }

    throw new Error(`Tool ${name} not found`);
  } catch (error: any) {
    return { isError: true, content: [{ type: "text", text: error.message }] };
  }
});

// BOOT SERVER
const transport = new StdioServerTransport();
await server.connect(transport);
