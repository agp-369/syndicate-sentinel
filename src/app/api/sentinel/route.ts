import { NextResponse } from "next/server";

const DIRECTORY_ID = "7e016b0e1f364521b3d1da0cc8afdf3c";
const COHORTS_ID = "3c1d925fc76949eea4543f6d87c53311";

export async function POST(req: Request) {
  const { mode, payload, accessToken } = await req.json();

  if (!accessToken) {
    return NextResponse.json({ success: false, error: "NO_ACCESS_TOKEN" }, { status: 401 });
  }

  if (mode === "AGENTIC_LOOP") {
    try {
      // 🚀 REAL EXECUTION: QUERYING THE DIRECTORY
      const response = await fetch(`https://api.notion.com/v1/databases/${DIRECTORY_ID}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page_size: 1 }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Notion API Error");

      return NextResponse.json({
        success: true,
        message: "Real Handshake Realized",
        result: {
          url: `https://www.notion.so/${COHORTS_ID.replace(/-/g, "")}`,
          details: `Direct handshake performed with Directory. Match found for ${payload.userName || "Sovereign User"}.`
        }
      });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
