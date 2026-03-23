import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";

/**
 * MASTER_AGENTIC_PROTOCOL
 * This is the "Brain" that orchestrates the Notion MCP Server tools.
 */
export async function runAgenticWorkflow(userPrompt: string, dbIds: any) {
  const serverPath = path.join(process.cwd(), "src/lib/mcp/server.ts");
  const transport = new StdioClientTransport({ command: "npx", args: ["tsx", serverPath] });
  const client = new Client({ name: "nca-master-agent", version: "1.0.0" }, { capabilities: {} });

  await client.connect(transport);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // 1. AI DECIDES TO QUERY DIRECTORY
  const firstStep = await model.generateContent(`
    USER_REQUEST: ${userPrompt}
    AVAILABLE_DBS: ${JSON.stringify(dbIds)}
    
    TASK: To fulfill this, what tool should I call first to see the employees? 
    Call query_directory with the talent database ID.
  `);

  // (Standardizing tool calling for MVP simplicity while keeping the SDK logic)
  const directoryData = await client.callTool({
    name: "query_directory",
    arguments: { databaseId: dbIds.talent }
  });

  // 2. AI REASONS & CREATES WORKSPACE
  const finalDecision = await model.generateContent(`
    CONTEXT: ${JSON.stringify(directoryData)}
    TASK: Based on these employees, generate a 90-day React learning syllabus for the junior.
  `);

  const syllabus = finalDecision.response.text();

  const syncResult = await client.callTool({
    name: "create_mentorship_workspace",
    arguments: {
      parentDbId: dbIds.mentorship,
      title: "🤝 Agent-Generated React Workspace",
      syllabus: syllabus
    }
  });

  return { success: true, syllabus, result: syncResult };
}
