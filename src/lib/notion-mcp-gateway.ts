import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * Every MCP tool call is captured as a transaction for real-time UI display.
 */
export interface MCPTransaction {
  id: string;
  timestamp: string;
  /** The MCP tool name, e.g. "notion_create_page" */
  method: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  duration?: number;
  /** Human-readable trace lines shown in the live monitor */
  thinking?: string[];
}

/**
 * NotionMCPGateway — connects to the official Notion MCP server at
 * https://mcp.notion.com/mcp using the Model Context Protocol
 * StreamableHTTP transport (POST + Server-Sent Events).
 *
 * Every tool call is:
 *   1. Logged as a pending MCPTransaction (onLog called immediately)
 *   2. Sent via JSON-RPC 2.0 through the SDK Client
 *   3. Response parsed and logged with duration (onLog called again)
 */
export class NotionMCPGateway {
  private client: Client;
  private token: string;
  private transactions: MCPTransaction[] = [];
  private connected = false;

  constructor(token: string) {
    this.token = token;
    this.client = new Client(
      { name: "lumina-sentinel", version: "2.0.0" },
      { capabilities: {} }
    );
  }

  /** Lazily opens the MCP session on first use. */
  private async ensureConnected(): Promise<void> {
    if (this.connected) return;
    const transport = new StreamableHTTPClientTransport(
      new URL("https://mcp.notion.com/mcp"),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Notion-Version": "2022-06-28",
          },
        },
      }
    );
    await this.client.connect(transport);
    this.connected = true;
  }

  /**
   * Perform MCP capability handshake — lists available Notion tools.
   * Call once at the start of each workspace operation to show the
   * handshake in the live monitor.
   */
  async listTools(onLog?: (tx: MCPTransaction) => void) {
    await this.ensureConnected();

    const tx: MCPTransaction = {
      id: `tx_handshake_${Date.now()}`,
      timestamp: new Date().toISOString(),
      method: "tools/list",
      thinking: [
        "⟶ MCP HANDSHAKE → mcp.notion.com",
        "  method: tools/list",
        "  Transport: StreamableHTTP (POST + SSE)",
        "  Negotiating available Notion tools...",
      ],
    };
    if (onLog) onLog(tx);

    const start = Date.now();
    try {
      const result = await this.client.listTools();
      tx.duration = Date.now() - start;
      tx.result = { toolCount: result.tools.length };
      tx.thinking!.push(
        `⟵ ${result.tools.length} tools negotiated (${tx.duration}ms) ✅`
      );
      this.transactions.push({ ...tx });
      if (onLog) onLog({ ...tx });
      return result;
    } catch (e: any) {
      tx.duration = Date.now() - start;
      tx.error = e.message;
      tx.thinking!.push(`⟵ Handshake failed: ${e.message} ❌`);
      this.transactions.push({ ...tx });
      if (onLog) onLog({ ...tx });
      throw e;
    }
  }

  /**
   * Call a Notion MCP tool by name.
   * The result's `content[0].text` is parsed as JSON and returned.
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    onLog?: (tx: MCPTransaction) => void,
    extraThinking?: string[]
  ): Promise<any> {
    await this.ensureConnected();

    const tx: MCPTransaction = {
      id: `tx_${toolName.replace("notion_", "")}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      method: toolName,
      params: args,
      thinking: [
        `⟶ MCP: tools/call`,
        `  name: "${toolName}"`,
        ...(extraThinking ?? []),
        `  Sending to mcp.notion.com...`,
      ],
    };
    if (onLog) onLog({ ...tx });

    const start = Date.now();
    try {
      const raw = await this.client.callTool({ name: toolName, arguments: args });
      tx.duration = Date.now() - start;

      // Notion MCP returns results as JSON text in content[0].text
      let parsed: any = {};
      const content = (raw as any).content;
      if (Array.isArray(content) && content[0]?.type === "text") {
        try {
          parsed = JSON.parse(content[0].text);
        } catch {
          parsed = { text: content[0].text };
        }
      }

      tx.result = parsed;
      tx.thinking!.push(
        `⟵ ${toolName} → ${parsed?.id ? `id: ${String(parsed.id).substring(0, 8)}...` : "ok"} (${tx.duration}ms) ✅`
      );
      this.transactions.push({ ...tx });
      if (onLog) onLog({ ...tx });
      return parsed;
    } catch (e: any) {
      tx.duration = Date.now() - start;
      tx.error = e.message;
      tx.thinking!.push(`⟵ ${toolName} failed: ${e.message} ❌`);
      this.transactions.push({ ...tx });
      if (onLog) onLog({ ...tx });
      throw e;
    }
  }

  async close(): Promise<void> {
    if (this.connected) {
      try {
        await this.client.close();
      } catch {
        // ignore close errors
      }
      this.connected = false;
    }
  }

  getTransactions(): MCPTransaction[] {
    return [...this.transactions];
  }
}
