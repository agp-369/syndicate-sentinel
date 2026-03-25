# 🌌 Lumina Career Intelligence OS - Setup Guide

## Quick Start

### 1. Prerequisites

- Node.js 18+
- npm or yarn
- Notion account (Plus plan recommended)
- Google Gemini API key
- Clerk account (free tier)

### 2. Clone & Install

```bash
git clone https://github.com/your-username/syndicate-sentinel.git
cd syndicate-sentinel
npm install
```

### 3. Create Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it "Lumina" (or any name)
4. Select your workspace
5. Copy the **Internal Integration Token** (starts with `ntn_`)

### 4. Create Google Gemini Key

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click "Get API Key"
3. Create a new key
4. Copy the key

### 5. Configure Environment

Create `.env.local` in the root:

```env
# Required
GEMINI_API_KEY=AIza...
NOTION_TOKEN=ntn_your_notion_token_here

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# App URL (for OAuth)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Clerk Setup

1. Go to [clerk.com](https://clerk.com)
2. Create a new application
3. Select "Next.js" as framework
4. Copy the Publishable Key and Secret Key
5. Add `http://localhost:3000` to allowed origins

### 7. Share a Notion Page

Before running, you must share a Notion page with your integration:

1. Open Notion
2. Create or select a page
3. Click the "..." menu → "Add connections"
4. Find and select your "Lumina" integration
5. The integration now has access to that page and its children

### 8. Run

```bash
npm run dev
```

Open http://localhost:3000

## How to Use

### First Time Setup

1. Sign in with Clerk (use any email)
2. Click "Connect" to authorize Notion OAuth
3. Click "Provision Workspace" to auto-create databases
4. Share the created databases with your Notion integration

### Run Forensic Analysis

1. Paste any job URL (LinkedIn, Indeed, etc.)
2. Click "Analyze"
3. Watch the AI think in real-time
4. Review the verdict
5. Click "Approve & Sync to Notion" to log it

### Watch the Agent Work

The "Agent Live Monitor" panel shows:
- MCP method calls
- AI reasoning process
- Transaction timestamps
- Error handling

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                 LUMINA SYSTEM                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────┐     ┌──────────────────────────┐   │
│  │   Next.js  │────▶│   Notion MCP Client      │   │
│  │  Dashboard │     │   (Transaction Logging)   │   │
│  │  + Clerk   │     └──────────────┬───────────┘   │
│  └─────────────┘                  │               │
│                                   │               │
│                                   ▼               │
│                         ┌──────────────────┐       │
│                         │   Notion API     │       │
│                         │   + Gemini AI    │       │
│                         └────────┬─────────┘       │
│                                  │                 │
│                                  ▼                 │
│                         ┌──────────────────┐       │
│                         │ Notion Workspace │       │
│                         │  • Career Ledger │       │
│                         │  • Talent Pool   │       │
│                         │  • Roadmaps      │       │
│                         └──────────────────┘       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Key Features

### Forensic Sentinel
- Scrapes job postings with cross-reference
- Detects ghost jobs and scams
- Trust Score (0-100%)
- Culture match analysis

### Human-in-the-Loop
- AI analysis shown before Notion write
- Explicit approval required
- Full audit trail

### Real-Time Visualization
- Live MCP transaction stream
- AI thinking process visible
- Terminal-style output

## Troubleshooting

### "No shared page found"
- You must share a page with the Notion integration first
- Go to Notion → Page → "..." → Add connections → Select Lumina

### "Gemini API Key missing"
- Ensure `GEMINI_API_KEY` is set in `.env.local`
- Key must start with `AIza`

### Analysis fails
- Some job sites block scraping
- Try a different URL
- Check browser console for errors

## Support

For issues, check:
1. Browser console for errors
2. Server terminal for API logs
3. Notion integration permissions

---

*Built for the DEV.to Notion MCP Challenge*
