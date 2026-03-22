import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

/**
 * MASTER_AGENT_PROTOCOL: 
 * Establishes the agentic link between the Vercel app and the Notion MCP server.
 */
export async function initializeMasterAgent() {
  const serverPath = path.join(process.cwd(), "src/lib/mcp/server.ts");
  const transport = new StdioClientTransport({ command: "npx", args: ["tsx", serverPath] });
  
  // Correcting type capability structure
  const mcpClient = new Client(
    { name: "nca-master-agent", version: "2.0.0" },
    { capabilities: { } } 
  );

  try {
    await mcpClient.connect(transport);
    console.log("🔗 MCP_UPLINK: Handshake Complete.");
    return mcpClient;
  } catch (error) {
    console.error("❌ MCP_HANDSHAKE_FAILED:", error);
    return null;
  }
}
