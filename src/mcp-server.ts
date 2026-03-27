import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { NotionMCPClient } from "./lib/notion-mcp.js";
import { runForensicAudit } from "./lib/intelligence.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * 🏛️ LUMINA SOVEREIGN MCP NODE v3.0
 * 
 * This is an MCP Server that acts as a "Career Intelligence Layer".
 * It allows other MCP clients (like Claude Desktop) to:
 * 1. Perform Forensic Job Audits.
 * 2. Access Career DNA (Profile) stored in Notion.
 * 3. Generate autonomous roadmaps.
 * 
 * It consumes the official Notion MCP Server as its persistence layer.
 */

const NOTION_TOKEN = process.env.NOTION_TOKEN || "";

const server = new Server(
  {
    name: "lumina-sovereign-node",
    version: "3.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// ── RESOURCES: Exposing Notion Data as AI Context ──────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "lumina://profile/dna",
        name: "User Career DNA",
        description: "The user's professional profile, skills, and experience extracted from Notion.",
        mimeType: "application/json",
      },
      {
        uri: "lumina://ledger/latest",
        name: "Latest Forensic Audits",
        description: "A summary of the most recent job forensic audits performed.",
        mimeType: "application/json",
      }
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const mcp = new NotionMCPClient(NOTION_TOKEN);
  
  try {
    if (request.params.uri === "lumina://profile/dna") {
      const profile = await mcp.discoverAndReadProfile();
      return {
        contents: [{
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(profile, null, 2),
        }],
      };
    }

    if (request.params.uri === "lumina://ledger/latest") {
      const setup = await mcp.searchDatabases();
      if (!setup.jobLedgerId) throw new Error("Job Ledger not found.");
      
      const entries = await mcp.queryDatabase(setup.jobLedgerId);
      return {
        contents: [{
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(entries, null, 2),
        }],
      };
    }
  } finally {
    // Note: Gateway close happens inside client methods usually, 
    // but we ensure clean state if needed.
  }

  throw new Error("Resource not found");
});

// ── TOOLS: Cyber Forensics & Automation ──────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "forensic_audit",
        description: "Performs a deep stealth forensic audit on a job URL to detect scams and ghost jobs.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "The job posting URL." }
          },
          required: ["url"],
        },
      },
      {
        name: "provision_workspace",
        description: "Automatically creates the Lumina Forensic Career OS infrastructure in a Notion workspace.",
        inputSchema: {
          type: "object",
          properties: {
            parentPageId: { type: "string", description: "The ID of the page to host the OS." }
          },
          required: ["parentPageId"],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const mcp = new NotionMCPClient(NOTION_TOKEN);

  try {
    switch (name) {
      case "forensic_audit": {
        const url = args?.url as string;
        const analysis = await runForensicAudit(url);
        
        // Log to Notion if Ledger exists
        const setup = await mcp.searchDatabases();
        if (setup.jobLedgerId) {
          await mcp.logForensicAudit(setup.jobLedgerId, analysis, url);
        }

        return {
          content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }]
        };
      }

      case "provision_workspace": {
        const parentId = args?.parentPageId as string;
        const setup = await mcp.initializeWorkspace(parentId);
        return {
          content: [{ type: "text", text: `Lumina Workspace Provisioned: ${JSON.stringify(setup)}` }]
        };
      }

      default:
        throw new Error("Tool not found");
    }
  } catch (e: any) {
    return { isError: true, content: [{ type: "text", text: e.message }] };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Lumina Sovereign MCP Node running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
