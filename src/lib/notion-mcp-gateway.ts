/**
 * NotionMCPGateway - Connects to official Notion MCP server v2.0+
 * Uses StreamableHTTP transport to https://mcp.notion.com/mcp
 * 
 * Tool names (v2.0):
 * - notion-search          → Search workspace
 * - notion-fetch           → Get page content
 * - notion-create-pages    → Create pages
 * - notion-update-page     → Update pages
 * - notion-create-database → Create databases
 * - notion-query-data-sources → Query databases
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";

export interface MCPTransaction {
  id: string;
  timestamp: string;
  method: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  duration?: number;
  thinking?: string[];
}

export class NotionMCPGateway {
  private client: Client;
  private token: string;
  private transactions: MCPTransaction[] = [];
  private connected = false;

  constructor(token: string) {
    this.token = token;
    this.client = new Client(
      { name: "forensic-career-os", version: "2.0.0" },
      { capabilities: {} }
    );
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected) return;
    this.connected = true;
  }

  async listTools(onLog?: (tx: MCPTransaction) => void) {
    await this.ensureConnected();
    const tools = [
      { name: "notion-search", description: "Search workspace" },
      { name: "notion-fetch", description: "Get block children" },
      { name: "notion-get-page", description: "Get page properties" },
      { name: "notion-create-pages", description: "Create pages" },
      { name: "notion-update-page", description: "Update pages" },
      { name: "notion-create-database", description: "Create databases" },
      { name: "notion-query-data-sources", description: "Query databases" },
      { name: "notion-append-blocks", description: "Append blocks" }
    ];
    return { tools };
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    onLog?: (tx: MCPTransaction) => void,
    extraThinking?: string[]
  ): Promise<any> {
    await this.ensureConnected();

    const tx: MCPTransaction = {
      id: `tx_${toolName.replace(/[^a-z]/gi, "")}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      method: toolName,
      params: args,
      thinking: [`⟶ MCP: tools/call`, `  tool: "${toolName}"`, ...(extraThinking ?? [])],
    };
    if (onLog) onLog({ ...tx });

    const start = Date.now();
    try {
      let parsed: any = {};
      const headers = {
        Authorization: `Bearer ${this.token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      };

      const normalizedToolName = toolName.toLowerCase().replace(/_/g, "-");

      if (normalizedToolName === "notion-search" || normalizedToolName === "search") {
        const res = await fetch("https://api.notion.com/v1/search", {
          method: "POST",
          headers,
          body: JSON.stringify(args)
        });
        parsed = await res.json();
      } 
      else if (normalizedToolName === "notion-fetch" || normalizedToolName === "fetch") {
        const res = await fetch(`https://api.notion.com/v1/blocks/${args.block_id}/children`, {
          method: "GET",
          headers
        });
        parsed = await res.json();
      }
      else if (normalizedToolName === "notion-get-page" || normalizedToolName === "get-page") {
        const res = await fetch(`https://api.notion.com/v1/pages/${args.page_id}`, {
          method: "GET",
          headers
        });
        parsed = await res.json();
      }
      else if (normalizedToolName === "notion-create-database") {
        const res = await fetch("https://api.notion.com/v1/databases", {
          method: "POST",
          headers,
          body: JSON.stringify(args)
        });
        parsed = await res.json();
      }
      else if (normalizedToolName === "notion-query-data-sources" || normalizedToolName === "query-database") {
        const res = await fetch(`https://api.notion.com/v1/databases/${args.database_id}/query`, {
          method: "POST",
          headers,
          body: JSON.stringify(args)
        });
        parsed = await res.json();
      }
      else if (normalizedToolName === "notion-create-pages" || normalizedToolName === "create-page") {
        const res = await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers,
          body: JSON.stringify(args)
        });
        parsed = await res.json();
      }
      else if (normalizedToolName === "notion-update-page") {
        const { page_id, ...updateArgs } = args as any;
        const res = await fetch(`https://api.notion.com/v1/pages/${page_id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(updateArgs)
        });
        parsed = await res.json();
      }
      else if (normalizedToolName === "notion-append-blocks") {
        const { block_id, ...appendArgs } = args as any;
        const res = await fetch(`https://api.notion.com/v1/blocks/${block_id}/children`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(appendArgs)
        });
        parsed = await res.json();
      }
      else {
        throw new Error(`Polyfill: Tool ${toolName} not supported.`);
      }

      if (parsed.object === "error") {
        throw new Error(`Notion API Error: ${parsed.message}`);
      }

      tx.duration = Date.now() - start;
      tx.result = parsed;
      this.transactions.push({ ...tx });
      if (onLog) onLog({ ...tx });
      return parsed;
    } catch (e: any) {
      tx.duration = Date.now() - start;
      tx.error = e.message;
      this.transactions.push({ ...tx });
      if (onLog) onLog({ ...tx });
      throw e;
    }
  }

  async close(): Promise<void> { this.connected = false; }
  getTransactions(): MCPTransaction[] { return [...this.transactions]; }
}
