# 🌌 Lumina: Career Intelligence OS

<div align="center">
  <h1>Project Lumina</h1>
  <p><strong>Autonomous Career Intelligence via Notion MCP</strong></p>
  
  ![Notion MCP](https://img.shields.io/badge/Notion-MCP-black?logo=notion)
  ![Gemini](https://img.shields.io/badge/Powered%20By-Gemini%202.5%20Flash-blue)
  ![Next.js](https://img.shields.io/badge/Framework-Next.js%2016-emerald)
  ![Clerk](https://img.shields.io/badge/Auth-Clerk-purple)
</div>

---

## 🚀 What is Lumina?

**Lumina** is an autonomous career intelligence system that transforms job searching into a forensic, AI-powered experience. Built for the **Notion MCP Challenge**, it demonstrates true Model Context Protocol integration with real-time agent visualization.

### Key Innovation: Real Agentic Workflows

Unlike simple dashboard wrappers, Lumina showcases **actual MCP integration**:

1. **Forensic Sentinel** - AI analyzes job postings for legitimacy
2. **Human-in-the-Loop** - Every action requires explicit approval
3. **Real-Time Visualization** - Watch the AI think in real-time
4. **Complete Audit Trail** - Every decision logged to Notion

---

## 🎯 Features

### 🕵️ Forensic Job Analysis
- Deep scraping with company cross-reference
- Ghost Job detection (vague postings, old dates)
- Scam flagging (Telegram, money requests, poor grammar)
- Trust Score (0-100%)
- Culture match analysis

### 🤝 Human-in-the-Loop Workflow
```
[AI Analysis] → [Show Verdict] → [Human Approves] → [Sync to Notion]
```
- Transparent decision-making
- No autonomous "hallucinations"
- Audit-ready trails

### 📊 Real-Time Agent Visualization
Watch the AI think:
- Scraping job postings
- Calling Gemini 2.5 Flash
- Logging MCP transactions
- Syncing structured data

### 🗄️ Auto-Provisioned Workspace
Lumina creates its own Notion structure:
- **Career Ledger** - Full job tracking with Trust Score
- **Talent Pool** - Candidate profiles
- **Career Roadmaps** - Milestone planning
- **Agent Audit Log** - Complete AI history

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, TypeScript, Tailwind, Framer Motion |
| Auth | Clerk (OAuth + Notion OAuth) |
| AI | Google Gemini 2.5 Flash |
| Protocol | Notion Model Context Protocol (MCP) |
| Scraper | Cheerio + Axios |
| Database | Notion API |

---

## 📦 Installation

```bash
# Clone the repo
git clone https://github.com/your-username/syndicate-sentinel.git
cd syndicate-sentinel

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your keys

# Run development
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 Environment Variables

Create `.env.local` with:

```env
# Google Gemini
GEMINI_API_KEY=AIza...

# Notion Internal Integration
NOTION_TOKEN=ntn_...

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Getting Your Keys

**Notion Integration:**
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create new integration
3. Copy the Internal Integration Token

**Gemini API:**
1. Visit [aistudio.google.com](https://aistudio.google.com)
2. Get API Key
3. Copy the key

**Clerk:**
1. Create app at [clerk.com](https://clerk.com)
2. Copy Publishable Key and Secret Key

---

## 🎮 How to Use

### 1. Initial Setup
1. Sign in with Clerk (any email)
2. Connect Notion via OAuth
3. Click **"Provision Workspace"** to auto-create databases
4. Share the created pages with your Notion integration

### 2. Run Forensic Analysis
1. Paste any job URL
2. Click **"Analyze"**
3. Watch the AI think in real-time
4. Review the Trust Score and flags
5. Click **"Approve & Sync to Notion"**

### 3. Track Your Career
- View all analyzed jobs in the Career Ledger
- Track interview stages
- Monitor Trust Scores over time

---

## 🏗️ Architecture

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
│  Scraper: Cheerio + Axios                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── notion/
│   │   │   ├── auth/route.ts    # OAuth flow
│   │   │   └── callback/route.ts
│   │   └── sentinel/
│   │       └── route.ts        # Main API
│   ├── page.tsx                # Main dashboard
│   └── layout.tsx
├── lib/
│   └── notion-mcp.ts           # MCP client + AI
└── mcp-server.ts               # Claude Desktop integration
```

---

## 🎥 Demo

[Insert demo video showing the full workflow]

### What to Show

1. **0:00-0:20** - Sign in, connect Notion
2. **0:20-0:40** - Provision workspace
3. **0:40-1:00** - Paste job URL, analyze
4. **1:00-1:20** - Watch AI think (real-time)
5. **1:20-1:40** - Approve, sync to Notion
6. **1:40-2:00** - Open Notion, show structured data

---

## 🏆 Why This Wins

### 1. Originality & Creativity
- **Forensic job analysis** with Trust Scores
- **Real-time agent visualization** - show the AI thinking
- **Human-in-the-loop** - enterprise-ready safety

### 2. Technical Complexity
- **True MCP integration** (not just API wrapper)
- **Transaction logging** with full audit trail
- **Workspace auto-provisioning** - creates databases dynamically
- **Real-time streaming** of agent actions

### 3. Practical Implementation
- **Works out of the box** - one-click setup
- **Production-ready UI** - Glassmorphism design
- **Actual use case** - helps job seekers avoid scams
- **Complete flow** - from analysis to Notion sync

---

## 🤝 Contributing

Contributions welcome! Please read the setup guide and open issues for bugs or features.

---

## 📄 License

MIT - Built for the DEV.to Notion MCP Challenge

---

<div align="center">
  <p><strong>Built with intentionality for the Notion MCP Challenge</strong></p>
  <p>Deadline: March 29, 2026</p>
</div>
