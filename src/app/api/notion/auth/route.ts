import { NextResponse } from "next/server";

export async function GET() {
  const client_id = process.env.NOTION_CLIENT_ID;
  
  if (!client_id) {
    return NextResponse.json({ 
      error: "CONFIGURATION_REQUIRED", 
      message: "Please add NOTION_CLIENT_ID to your Vercel Environment Variables." 
    }, { status: 500 });
  }

  const redirect_uri = `${process.env.NEXT_PUBLIC_APP_URL}/api/notion/callback`;
  
  // Notion OAuth URL with page access
  // The owner=user parameter allows users to select specific pages to share
  const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${client_id}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirect_uri)}`;
  
  return NextResponse.redirect(authUrl);
}
