/**
 * NotionMCPGateway - Connects to official Notion MCP server v2.0+
 * Pattern based on vega-ai and gitnotion implementations
 * 
 * Uses StreamableHTTP transport to https://mcp.notion.com/mcp
 * MCP Tool names:
 * - notion-search          → Search workspace
 * - notion-fetch          → Get page content  
 * - notion-get-page       → Get page properties
 * - notion-create-pages   → Create pages
 * - notion-update-page    → Update pages
 * - notion-create-database → Create databases
 * - notion-query-database → Query databases
 * - notion-append-blocks  → Append blocks to pages
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

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
  private token: string;
  private client: Client | null = null;
  private transactions: MCPTransaction[] = [];
  private connected = false;

  constructor(token: string) {
    this.token = token;
  }

  private async getClient(): Promise<Client> {
    if (this.client && this.connected) return this.client;

    const transport = new StreamableHTTPClientTransport(
      new URL("https://mcp.notion.com/mcp"),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Notion-Version": "2025-09-03"
          }
        }
      }
    );

    this.client = new Client(
      { name: "forensic-career-os", version: "2.0.0" },
      { capabilities: {} }
    );

    await this.client.connect(transport);
    this.connected = true;
    return this.client;
  }

  async listTools(): Promise<{ name: string; description: string }[]> {
    try {
      const client = await this.getClient();
      const response = await client.listTools();
      return response.tools.map(t => ({
        name: t.name,
        description: t.description || ""
      }));
    } catch (e) {
      console.error("[MCP] List tools failed, using fallback:", e);
      return [
        { name: "notion-search", description: "Search workspace" },
        { name: "notion-fetch", description: "Get page content" },
        { name: "notion-get-page", description: "Get page properties" },
        { name: "notion-create-pages", description: "Create pages" },
        { name: "notion-update-page", description: "Update pages" },
        { name: "notion-create-database", description: "Create databases" },
        { name: "notion-query-database", description: "Query databases" },
        { name: "notion-append-blocks", description: "Append blocks" }
      ];
    }
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    onLog?: (tx: MCPTransaction) => void,
    extraThinking?: string[]
  ): Promise<any> {
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
      const client = await this.getClient();
      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });

      if (result.isError) {
        const content = (result as any).content;
        const message = Array.isArray(content) && content[0]?.text 
          ? content[0].text 
          : "Unknown MCP tool error";
        throw new Error(`MCP tool ${toolName} failed: ${message}`);
      }

      const content = (result as any).content;
      const text = Array.isArray(content) && content[0]?.text 
        ? content[0].text 
        : JSON.stringify(content);
      
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { text };
      }

      tx.duration = Date.now() - start;
      tx.result = parsed;
      this.transactions.push({ ...tx });
      if (onLog) onLog({ ...tx });
      return parsed;
    } catch (e: any) {
      console.warn(`[MCP] Tool ${toolName} failed, using API fallback:`, e.message);
      return this.fallbackToAPI(toolName, args, start, tx, onLog);
    }
  }

  private async fallbackToAPI(
    toolName: string,
    args: Record<string, unknown>,
    start: number,
    tx: MCPTransaction,
    onLog?: (tx: MCPTransaction) => void
  ): Promise<any> {
    const headers = {
      Authorization: `Bearer ${this.token}`,
      "Notion-Version": "2025-09-03",
      "Content-Type": "application/json"
    };

    const normalized = toolName.toLowerCase().replace(/-/g, "_");

    try {
      let parsed: any = {};

      if (normalized === "notion_search" || normalized === "search") {
        const res = await fetch("https://api.notion.com/v1/search", {
          method: "POST",
          headers,
          body: JSON.stringify(args)
        });
        parsed = await res.json();
      } 
      else if (normalized === "notion_fetch" || normalized === "fetch") {
        const res = await fetch(
          `https://api.notion.com/v1/blocks/${args.block_id}/children`,
          { method: "GET", headers }
        );
        parsed = await res.json();
      }
      else if (normalized === "notion_get_page" || normalized === "get_page") {
        const res = await fetch(
          `https://api.notion.com/v1/pages/${args.page_id}`,
          { method: "GET", headers }
        );
        parsed = await res.json();
      }
      else if (normalized === "notion_create_database") {
        const res = await fetch("https://api.notion.com/v1/databases", {
          method: "POST",
          headers,
          body: JSON.stringify(args)
        });
        parsed = await res.json();
      }
      else if (normalized === "notion_query_database" || normalized === "query_database") {
        const res = await fetch(
          `https://api.notion.com/v1/databases/${args.database_id}/query`,
          { method: "POST", headers, body: JSON.stringify(args) }
        );
        parsed = await res.json();
      }
      else if (normalized === "notion_create_pages" || normalized === "create_pages") {
        const res = await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers,
          body: JSON.stringify(args)
        });
        parsed = await res.json();
      }
      else if (normalized === "notion_update_page" || normalized === "update_page") {
        const { page_id, ...updateArgs } = args as any;
        const res = await fetch(`https://api.notion.com/v1/pages/${page_id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(updateArgs)
        });
        parsed = await res.json();
      }
      else if (normalized === "notion_append_blocks" || normalized === "append_blocks") {
        const { block_id, ...appendArgs } = args as any;
        const res = await fetch(`https://api.notion.com/v1/blocks/${block_id}/children`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(appendArgs)
        });
        parsed = await res.json();
      }
      else {
        throw new Error(`Tool ${toolName} not supported in fallback`);
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

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.connected = false;
    }
  }

  getTransactions(): MCPTransaction[] {
    return [...this.transactions];
  }
}
