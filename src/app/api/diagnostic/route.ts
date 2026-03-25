import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasClientId = !!process.env.NOTION_CLIENT_ID;
  const hasClientSecret = !!process.env.NOTION_CLIENT_SECRET;
  const hasNotionToken = !!process.env.NOTION_TOKEN;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

  return NextResponse.json({
    status: "ok",
    environment: {
      NOTION_CLIENT_ID: hasClientId ? "✅ SET" : "❌ MISSING",
      NOTION_CLIENT_SECRET: hasClientSecret ? "✅ SET" : "❌ MISSING",
      NOTION_TOKEN: hasNotionToken ? "✅ SET" : "❌ MISSING",
      GEMINI_API_KEY: hasGemini ? "✅ SET" : "❌ MISSING",
      APP_URL: appUrl || "❌ MISSING",
    },
    clientIdPreview: hasClientId ? `${process.env.NOTION_CLIENT_ID?.substring(0, 10)}...` : "N/A",
    ready: hasClientId && hasClientSecret && hasGemini,
  });
}
