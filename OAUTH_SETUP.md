# NOTION OAUTH SETUP - STEP BY STEP

## Problem
Your app can't connect to Notion because required environment variables are missing.

---

## What You Need to Do

### Step 1: Get Notion OAuth Credentials

1. Go to: **https://www.notion.so/my-integrations**
2. Find your **Public** integration (OAuth type)
3. Copy the:
   - **Client ID**
   - **Client Secret**

### Step 2: Add Environment Variables to Vercel

1. Go to: **https://vercel.com/agps-projects-d51526b7/syndicate-sentinel/settings/environment-variables**
2. Add these variables:

| Name | Value | Environments |
|------|-------|--------------|
| `NOTION_CLIENT_ID` | Your Notion Client ID | Production, Preview, Development |
| `NOTION_CLIENT_SECRET` | Your Notion Client Secret | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | `https://syndicate-sentinel.vercel.app` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://syndicate-sentinel-git-*.vercel.app` | Preview |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Development |

### Step 3: Update Notion Integration Settings

1. Go to your Notion integration page
2. Under **Redirect URIs**, add:
   - `https://syndicate-sentinel.vercel.app/api/notion/callback`
   - `http://localhost:3000/api/notion/callback` (for local testing)

### Step 4: Redeploy

After adding environment variables, go to Vercel → Deployments → Redeploy

---

## After Setup, This Will Happen:

1. User clicks **"Establish Link"**
2. Redirects to Notion OAuth page
3. User approves access
4. Notion redirects back with code
5. Code exchanged for access token
6. Token stored in browser
7. Workspace scan starts
8. Databases created automatically

---

## Testing the Connection

1. Open: https://syndicate-sentinel.vercel.app
2. Sign in with Clerk
3. Click **"Establish Link"**
4. You should see Notion OAuth consent screen
5. After approving, you should see **"CONNECTED"** status
6. Click **"Provision Workspace"** to create databases

---

## Verify Your .env.local Has These Keys

Your current .env.local should have:
```env
NOTION_CLIENT_ID=your_client_id_here
NOTION_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
GEMINI_API_KEY=AIzaSy...
NOTION_TOKEN=ntn_... (keep this too)
```

---

## Common Issues

### "NOTION_CLIENT_ID is missing"
- You need to add it to Vercel environment variables
- Go to: Vercel → Settings → Environment Variables

### "Redirect URI mismatch"
- Make sure the URI in Notion matches exactly
- Include https:// and no trailing slash

### "No shared page found"
- After connecting, you must share a Notion page with the integration
- Go to Notion → Create a page → Click "..." → Add connections → Select your integration

---

## Next Steps After Environment Variables Are Set

1. Redeploy the project
2. Test the OAuth flow
3. Click "Provision Workspace"
4. Check your Notion workspace - you should see new databases created!
