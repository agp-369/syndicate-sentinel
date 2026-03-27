---
title: Forensic Career OS - AI-Powered Career Intelligence with Notion MCP
published: false
tags: devchallenge, notionchallenge, mcp, ai
---

*This is a submission for the [Notion MCP Challenge](https://dev.to/challenges/notion-2026-03-04)*

## What I Built

**Forensic Career OS** is a complete career intelligence platform that transforms job hunting from chaotic to systematic. It uses Notion MCP as its core infrastructure layer to create, read, and manage career data.

### Key Features:
- 🔍 **Forensic Job Analysis** - Detects scam jobs by analyzing URLs, company reputation, and red flags
- 🧬 **Skill DNA Mapping** - Analyzes your skills and identifies gaps with market demand
- 💼 **AI Job Matching** - Matches jobs to your profile based on skills and experience
- 🎮 **Gamification** - XP, badges, and progress tracking for career milestones
- 📊 **Notion-Powered** - All data stored in your Notion workspace via MCP

## Video Demo

[Embed your video here - upload to YouTube/Vimeo or loom]

**Quick Demo (2 min):** https://loom.com/share/...

## Show us the code

**GitHub Repository:** https://github.com/agp-369/syndicate-sentinel

**Live Demo:** https://syndicate-sentinel.vercel.app

## How I Used Notion MCP

### Architecture

Our app connects to the **official Notion MCP server** at `https://mcp.notion.com/mcp` using the Model Context Protocol SDK:

```typescript
// In notion-mcp-gateway.ts
const transport = new StreamableHTTPClientTransport(
  new URL("https://mcp.notion.com/mcp"),
  {
    requestInit: {
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
      },
    },
  }
);
```

### MCP Operations We Perform:

1. **notion_search** - Discover user's workspace pages
2. **notion_create_page** - Create career infrastructure pages
3. **notion_create_database** - Build job tracking databases
4. **notion_append_block** - Add content to pages
5. **notion_get_block_children** - Read page content

### Transaction Monitor

We built a live MCP transaction monitor that shows:
- Real-time MCP calls being made
- Method names and parameters
- Response times and status
- Error handling

This proves we're using MCP correctly and gives users transparency into what's happening.

### User Flow:

```
1. User authenticates via Notion OAuth
2. App discovers user's existing Notion pages (resume, skills, goals)
3. App creates "Forensic Career OS" page infrastructure via MCP
4. App reads user's profile data
5. AI generates job recommendations and forensic analysis
6. Results stored back in Notion via MCP
```

### Why Notion MCP?

Notion MCP enables:
- **Zero data storage** - All user data stays in their Notion
- **Real-time sync** - Changes in Notion reflect immediately
- **Portability** - Users own their data
- **Security** - OAuth-based access, revocable anytime

### Technical Highlights:

- **OAuth 2.0** - Proper Notion OAuth flow with httpOnly cookies
- **MCP Gateway** - Wrapper around official Notion MCP server
- **Transaction Logging** - Every MCP call is logged for transparency
- **Error Handling** - Graceful degradation when MCP calls fail
- **One-time Setup** - Infrastructure created once, never recreated

### Differentiation from Claude Desktop

While Claude Desktop has a built-in Notion connector for general queries, Forensic Career OS is a **domain-specific application** that:
- Solves the specific problem of career management
- Provides AI-powered job scam detection
- Includes gamification for engagement
- Offers one-click automated setup

---

## Submission Checklist

- [x] Project uses Notion MCP as core functionality
- [x] Video demo attached
- [x] Code repository public
- [x] Explains how MCP is integrated
- [ ] Cover image attached
- [ ] Posted on DEV Community

---

*Thanks for reviewing my submission! Built with ❤️ and Notion MCP*
