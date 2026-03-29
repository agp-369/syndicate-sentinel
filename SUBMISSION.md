# 🌌 Lumina: Career Intelligence OS

**Notion MCP Challenge Submission**

**Live Demo:** [https://syndicate-sentinel.vercel.app](https://syndicate-sentinel.vercel.app)

## What I Built

**Lumina** is an autonomous career intelligence system that transforms job searching from chaotic spreadsheets into a forensic, AI-powered experience. Built specifically for the Notion MCP Challenge, it showcases true agentic workflows with real-time visualization.

### The Core Innovation

Unlike simple dashboard wrappers, Lumina demonstrates **real Model Context Protocol integration** through:

1. **Forensic Sentinel Engine** - AI-powered job legitimacy analysis that scrapes, cross-references, and detects:
   - Ghost Jobs (vague "evergreen" postings)
   - Scam Indicators (Telegram contacts, money requests, poor grammar)
   - Cultural Mismatch between job description and company tone
   - Trust Scoring (0-100%)

2. **Human-in-the-Loop Workflow** - Every AI action requires explicit human approval before Notion sync, ensuring:
   - Transparent decision-making
   - Audit-ready trails
   - No autonomous "hallucinations" reaching your workspace

3. **Real-Time Agent Visualization** - Watch the AI think in real-time as it:
   - Scrapes job postings
   - Calls Gemini 2.5 Flash for analysis
   - Logs transactions to the terminal
   - Syncs structured data to Notion

### Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    LUMINA ARCHITECTURE                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────┐ │
│  │   Next.js    │────▶│   Notion     │────▶│  Notion  │ │
│  │  Dashboard   │     │    MCP       │     │   API    │ │
│  │  (Clerk Auth)│     │   Client     │     │          │ │
│  └──────────────┘     └──────────────┘     └──────────┘ │
│         │                    │                    │      │
│         │              JSON-RPC 2.0              │      │
│         │                    │                    │      │
│         ▼                    ▼                    ▼      │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Notion Workspace (Blackboard)           │   │
│  │  • Career Ledger    • Talent Pool    • Roadmaps   │   │
│  │  • Agent Audit Log  • Strategy Pages             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  AI Engine: Google Gemini 2.5 Flash                     │
│  Scraping: Cheerio + Axios with User-Agent rotation    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Video Demo

[Video demonstration showing the full workflow]

## Show us the code

**Repository:** [GitHub Link]

### Key Files

- `src/lib/notion-mcp.ts` - Notion MCP client with transaction logging
- `src/app/api/sentinel/route.ts` - API routes for forensic analysis
- `src/app/page.tsx` - Main dashboard with real-time visualization
- `src/mcp-server.ts` - Standalone MCP server for Claude Desktop

## How I Used Notion MCP

### 1. Workspace Auto-Provisioning

Lumina doesn't just read/write to existing databases - it **creates** the entire workspace structure on first run:

```typescript
await mcp.initializeWorkspace(parentPageId, onLog);
```

This creates:
- **Career Ledger** - Full-featured job tracking with Trust Score, Status, Location, Salary
- **Talent Pool** - Candidate profiles with skills and match scoring
- **Career Roadmaps** - Milestone tracking with phases
- **Agent Audit Log** - Complete AI action history

### 2. Transaction Streaming

Every MCP call is logged with full audit trail:

```typescript
const tx: MCPTransaction = {
  id: `tx_${Date.now()}`,
  timestamp: new Date().toISOString(),
  method: "notion.create_page",
  params: { ledgerId, analysis },
  thinking: [
    "MCP call: notion.create_page",
    "Building structured page with forensic evidence..."
  ]
};
```

### 3. Human-in-the-Loop Guardrails

The critical approval step before any Notion write:

```typescript
// Phase 1: AI Analysis (no Notion write)
const analysis = await runForensicAudit(url);

// Phase 2: Human Approval (UI blocks)
setPendingApproval(analysis);

// Phase 3: Only after approval, sync to Notion
await mcp.logForensicAudit(ledgerId, analysis, url);
```

## Features

### 🕵️ Forensic Job Analysis
- Deep scraping with cross-reference to company domain
- Ghost Job detection (old dates, pooling language)
- Scam flagging (Telegram, WhatsApp, money requests)
- Trust Score generation (0-100%)
- Culture match analysis

### 🤝 Talent Intelligence
- Career ledger with full job tracking
- Multi-stage interview pipeline
- Skills matching
- Progress visualization

### 🗺️ Strategic Roadmaps
- 90-day milestone planning
- Phase-based progress tracking
- Goal-oriented career paths

### 📊 Agent Audit Trail
- Complete AI action logging
- Real-time terminal visualization
- Transparent decision reasoning

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS, Framer Motion
- **Authentication**: Clerk (OAuth + Notion OAuth)
- **AI**: Google Gemini 2.5 Flash
- **Protocol**: Notion Model Context Protocol (MCP)
- **Scraping**: Cheerio + Axios
- **Deployment**: Vercel

## Getting Started

```bash
# Clone and install
npm install

# Configure environment
cp .env.example .env.local
# Add your keys to .env.local

# Run development
npm run dev
```

## Environment Variables

```env
# Google Gemini
GEMINI_API_KEY=your_gemini_key

# Notion (Internal Integration)
NOTION_TOKEN=ntn_xxx

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx
```

---

*Built with intentionality for the DEV.to + Notion MCP Challenge*
