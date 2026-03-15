# 🛡️ Syndicate Nexus: The Winning Setup Guide
### *Transforming Notion into an Autonomous Agentic Workspace*

Follow these steps exactly to set up the "Human-in-the-Loop" workflow that will impress the MLH judges.

---

## 🏛️ Phase 1: The Notion Command Center

### 1. Create the Career Database
1.  Open Notion and create a new **Database** (Gallery or Table view).
2.  Add the following **Properties** (Columns) exactly:
    *   `Name` (Title)
    *   `Job Link` (URL)
    *   `Status` (Select) -> Options: `🔴 SCAM RISK`, `🟢 VERIFIED`, `🟡 PENDING_APPROVAL`.
    *   `Match Score` (Number) -> Format as "Percent".
    *   `Tailored Pitch` (Text)
    *   `Approved` (Checkbox)

### 2. Create the Career Profile
1.  Create a separate **Page** in Notion called `My Core Profile`.
2.  In the page body, write your skills (e.g., "Python, Next.js, Kaggle Expert, Cyber-Forensics").
3.  Copy the **Page ID** (The string at the end of the URL).

---

## 🔑 Phase 2: Secure the Handshake (API Keys)

### 1. Create a Notion Integration
1.  Go to [notion.so/my-integrations](https://www.notion.so/my-integrations).
2.  Click **+ New integration**, name it `Syndicate Nexus`.
3.  Copy the **Internal Integration Secret**.

### 2. Connect the Integration
1.  Go back to your **Career Database**.
2.  Click the `...` (top right) -> **Connect to** -> Search for `Syndicate Nexus`.
3.  Do the same for your `My Core Profile` page.

---

## 🛠️ Phase 3: The Intelligence Uplink

### 1. Configure Environment
Create a `.env.local` in your `syndicate-sentinel` folder:
```env
GEMINI_API_KEY=YOUR_GEMINI_KEY
NOTION_TOKEN=YOUR_NOTION_SECRET
```

### 2. Deploy the Node
```bash
cd syndicate-sentinel
npm install
npm run dev
```

---

## 🎬 Phase 4: The Winning Demo Sequence (MLH Strategy)

To maximize your score, record your demo like this:

1.  **Split Screen:** Notion on the left, Syndicate Sentinel UI on the right.
2.  **Trigger:** Add a job link (e.g., a LinkedIn job URL) to your Notion row.
3.  **Uplink:** Enter your IDs into the UI and click **Deploy Agents**.
4.  **The Magic:** Point at the **Telemetry Stream** as the AI moves through "Forensics" and "Skill Matching."
5.  **The Result:** Switch back to Notion and show the **Match Score** and **Tailored Pitch** appearing automatically.
6.  **Human-in-the-Loop:** Check the `Approved` box in Notion to show you are in control of the agent.

---
*Built for the DEV x Notion MCP Challenge 2026. Stay Sovereign.*
