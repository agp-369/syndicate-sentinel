import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("No NOTION_TOKEN");
  
  console.log("Connecting via SSE...");
  const transport = new SSEClientTransport(
    new URL("https://mcp.notion.com/sse"),
    {
      requestInit: {
        headers: {
          Authorization: `Bearer ${token}`
        },
      },
    }
  );
  
  const client = new Client(
    { name: "test", version: "1.0.0" },
    { capabilities: {} }
  );
  
  try {
    await client.connect(transport);
    console.log("Connected!");
    
    const tools = await client.listTools();
    console.log("Tools:", tools);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();