# Notion MCP Test Script

## For Claude Desktop Testing

This document shows how to test the Forensic Career OS with Claude Desktop to demonstrate proper Notion MCP usage.

### Test Scenario 1: Create Career Infrastructure

```
You are a Notion MCP test agent. Use the Notion MCP to:

1. Search for a page titled "Test Career Page" in my Notion workspace
2. If found, archive it
3. Create a new page called "Test Career Page" under any accessible parent
4. Add these blocks to the new page:
   - A heading "Career Test"
   - A paragraph "This page was created via Notion MCP"
5. List all tools available in Notion MCP
6. Search for all pages I have access to
```

### Test Scenario 2: Read User Profile

```
You are a Notion MCP agent. Help me set up my career tracking:

1. Search for any pages that might contain my resume or profile info
2. Read the content of any pages containing "resume", "profile", or "about"
3. Extract my name, skills, and experience
4. Create a summary of what you found
```

### Test Scenario 3: Forensics

```
You are a forensic job analyzer using Notion MCP:

1. Create a new Notion database called "Job Analysis" 
2. The database should have properties for:
   - Job Title (title)
   - Company (rich_text)
   - Trust Score (number)
   - Verdict (select: LEGITIMATE, SUSPICIOUS, SCAM)
3. Add a sample entry for testing
```

### Claude Desktop MCP Configuration

To connect Claude Desktop to test Notion MCP:

1. Open Claude Desktop
2. Go to Settings > Developer
3. Edit claude_desktop_config.json:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-notion"],
      "env": {
        "NOTION_API_TOKEN": "your_notion_token"
      }
    }
  }
}
```

### Verification Checklist

After testing, verify these MCP operations worked:

- [ ] `notion_search` - Found pages in workspace
- [ ] `notion_create_page` - Created new page
- [ ] `notion_append_block` - Added content to page
- [ ] `notion_create_database` - Created database
- [ ] `notion_query_database` - Read from database

### Expected MCP Transaction Log

When running through our app, you should see logs like:

```
> MCP HANDSHAKE → mcp.notion.com
> tool: notion_search
> params: {"query": "Forensic Career OS", "filter": {"object": "page"}}
> result: {"results": [...]}
> duration: 234ms
```
