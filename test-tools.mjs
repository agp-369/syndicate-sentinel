import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
  const token = process.env.NOTION_TOKEN; // We need a real token or it will reject.
  console.log("Testing with token:", token ? token.substring(0, 10) + "..." : "NONE");
}

main();
