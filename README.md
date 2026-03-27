# Forensic Career OS: Sovereign MCP Node v3.0

The winning submission for the **Notion MCP Challenge**. This isn't just an integration; it's an **Autonomous Career Intelligence Layer** built entirely on the Model Context Protocol.

## 🚀 True MCP Core Power (How it Wins)

### 1. The "MCP-in-MCP" Architecture
Unlike most submissions that are just clients, Lumina is a **Sovereign MCP Node**.
*   **As a Server:** It provides tools (`forensic_audit`) and resources (`lumina://profile/dna`) to other MCP clients like Claude Desktop.
*   **As a Client:** It consumes the official Notion MCP server (`mcp.notion.com`) via `StreamableHTTPClientTransport` for all persistence.
*   **Pure Logic:** We ruthlessly purged the Notion REST API. Every search, page read, and database creation happens via JSON-RPC over MCP.

### 2. Stealth Cyber Forensics
*   **Stealth Scraping:** Uses a customized Jina Reader integration to bypass bot-detection on LinkedIn/Indeed, delivering clean "DNA Markdown" to the AI.
*   **Forensic Audit:** Performs deep analysis of SSL certificates, TLD reputation, and linguistic scam signals (detecting "Kindly", "WhatsApp hiring", and corporate identity theft).

### 3. Total Automation (Zero-Prompting)
*   **The Watchdog:** An autonomous agent that monitors your Notion "Career Ledger". When you drop a link into Notion, the watchdog detects it via MCP, runs a stealth audit, and writes the forensic report back—all without you opening the app.
*   **Blackboard Architecture:** Before any analysis, the agent reads your "Talent Pool" via MCP to contextualize its matching logic.

### 4. Human-in-the-Loop (HITL)
*   **Strategic Approval:** AI generates a personalized pitch, but requires a physical "Send to HR" approval, which then logs the transaction back to the Notion audit log.

## 🛠️ Technical Stack
*   **Framework:** Next.js 15 (App Router)
*   **Protocol:** Model Context Protocol (MCP) SDK v2.0
*   **Intelligence:** Gemini 2.5 Flash (Forensic Specialist mode)
*   **Transport:** StreamableHTTP + SSE (Server-Sent Events)
*   **Persistence:** Notion (Official MCP Server)

## 📦 Setup for Judges
1.  **Clone & Install:** `npm install`
2.  **Environment:** Set `GEMINI_API_KEY`, `CLERK_SECRET_KEY`, and `NOTION_TOKEN` (for server mode).
3.  **Run:** `npm run dev`
4.  **Observe:** Use the "MCP Monitor" tab to see the real-time JSON-RPC handshake with Notion.

---
**Built for the Notion MCP Challenge 2026.**
*A Cyber-Forensic OS for the modern professional.*
