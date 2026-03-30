import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { JobRecommendationEngine } from "./lib/job-engine";
import { NotionMCPClient } from "./lib/notion-mcp";
import dotenv from "dotenv";

dotenv.config();

const server = new Server(
  {
    name: "lumina-forensic-career-os",
    version: "3.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

const engine = new JobRecommendationEngine();

// 1. Define Resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "lumina://profile/dna",
        name: "User Career DNA Profile",
        mimeType: "application/json",
        description: "Extracted career profile, skills, and experience from Notion",
      },
      {
        uri: "lumina://jobs/forensic-ledger",
        name: "Forensic Job Ledger",
        mimeType: "application/json",
        description: "List of tracked jobs and their forensic audit status",
      }
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN not set");
  const mcp = new NotionMCPClient(token);

  if (request.params.uri === "lumina://profile/dna") {
    const profile = await mcp.discoverAndReadProfile();
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(profile, null, 2),
        },
      ],
    };
  }

  if (request.params.uri === "lumina://jobs/forensic-ledger") {
    const setup = await mcp.recoverInfrastructure();
    if (!setup.jobsDbId) return { contents: [{ uri: request.params.uri, text: "No job ledger found." }] };
    
    const jobs = await mcp.queryDataSource(setup.jobsDbId);
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(jobs, null, 2),
        },
      ],
    };
  }

  throw new Error(`Resource not found: ${request.params.uri}`);
});

// 2. Define Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "forensic_audit",
        description: "Perform a deep cyber-forensic analysis of a job posting URL",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "The URL of the job posting" },
          },
          required: ["url"],
        },
      },
      {
        name: "match_score",
        description: "Calculate match percentage between user profile and a job description",
        inputSchema: {
          type: "object",
          properties: {
            job_description: { type: "string", description: "The text of the job description" },
          },
          required: ["job_description"],
        },
      },
      {
        name: "generate_pitch",
        description: "Generate a human-tone personalized outreach pitch for a job",
        inputSchema: {
          type: "object",
          properties: {
            company: { type: "string" },
            role: { type: "string" },
          },
          required: ["company", "role"],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN not set");

  switch (request.params.name) {
    case "forensic_audit": {
      const url = String(request.params.arguments?.url);
      const analysis = await engine.forensicAnalysis(url);
      return {
        content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }],
      };
    }
    case "match_score": {
      const jd = String(request.params.arguments?.job_description);
      const mcp = new NotionMCPClient(token);
      const profile = await mcp.discoverAndReadProfile();
      const match = await engine.generateRecommendations(profile, 1); // Mocking match logic
      return {
        content: [{ type: "text", text: `Match Score: ${match[0]?.matchScore || 0}%` }],
      };
    }
    case "generate_pitch": {
      const company = String(request.params.arguments?.company);
      const role = String(request.params.arguments?.role);
      const mcp = new NotionMCPClient(token);
      const profile = await mcp.discoverAndReadProfile();
      const pitch = await engine.generateEmailPitch(profile, company, role, "cold");
      return {
        content: [{ type: "text", text: pitch.body }],
      };
    }
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Lumina Forensic MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
