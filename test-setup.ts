import { NotionMCPClient } from './src/lib/notion-mcp';

async function run() {
    const token = "ntn_PLACEHOLDER"; 
    const mcp = new NotionMCPClient(token);
    const parentPageId = "7e016b0e1f364521b3d1da0cc8afdf3c"; // Valid page ID in the test workspace

    console.log("1. Testing searchDatabases...");
    try {
        const setup = await mcp.searchDatabases();
        console.log("DBs found:", setup);
    } catch(e: any) {
        console.error("searchDatabases failed:", e.message);
    }

    console.log("\n2. Testing initializeWorkspace (Database Creation)...");
    try {
        const setup = await mcp.initializeWorkspace(parentPageId);
        console.log("Setup Complete:", setup);
    } catch(e: any) {
        console.error("initializeWorkspace failed:", e.message);
    }

    console.log("\n3. Testing discoverAndReadProfile (Data Extraction)...");
    try {
        const profile = await mcp.discoverAndReadProfile([parentPageId]);
        console.log("Profile Extracted:", JSON.stringify(profile, null, 2));
    } catch(e: any) {
        console.error("discoverAndReadProfile failed:", e.message);
    }
}

run();
