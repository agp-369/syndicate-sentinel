# NOTION OAUTH SETUP GUIDE

## What You Need

To make Lumina work, you need a **Notion OAuth Integration** (not just an internal token).

---

## Step 1: Create Notion OAuth Integration

1. Go to: https://www.notion.so/my-integrations
2. Click **"New integration"**
3. Select your workspace
4. **IMPORTANT**: Choose **"Public"** integration type (not "Internal")

### Integration Settings:
- **Name**: Lumina Career OS
- **Type**: Public
- **Redirect URI**: `https://syndicate-sentinel.vercel.app/api/notion/callback`

5. Copy your:
   - **Client ID**
   - **Client Secret**

---

## Step 2: Update Vercel Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables:

```env
# Notion OAuth (NEW - for user connections)
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret

# App URL
NEXT_PUBLIC_APP_URL=https://syndicate-sentinel.vercel.app

# Keep your existing keys
GEMINI_API_KEY=your_gemini_key
NOTION_TOKEN=ntn_... (keep this for server operations)
```

---

## Step 3: Understanding the Two Types

### Internal Integration (Server-to-server)
```env
NOTION_TOKEN=ntn_...  # Your integration token
```
- Used by your app to write to YOUR Notion workspace
- User doesn't connect their own Notion

### OAuth Integration (For users)
```env
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
```
- Users can connect THEIR OWN Notion workspace
- Full user delegation flow

---

## For the Hackathon Demo

If you just want to demo and don't need users to connect their own Notion:

### Option A: Use Internal Token Directly

1. Share a Notion page with your integration
2. The app will use your `NOTION_TOKEN` to read/write

### Option B: Mock the OAuth Flow

I'll update the code to allow direct token entry for demo purposes.

---

## Which Approach Do You Want?

1. **Full OAuth** - Users connect their own Notion (requires Notion approval)
2. **Direct Token** - Just use your integration token for demo
3. **Hybrid** - Both work

Which one should I implement for you?
