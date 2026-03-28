import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { NotionMCPClient } from "@/lib/notion-mcp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function getTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("notion_token")?.value || null;
}

export async function POST(req: NextRequest) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ success: false, error: "Notion not connected" }, { status: 401 });

  const { mode } = await req.json();
  const mcp = new NotionMCPClient(token);

  try {
    if (mode === "SCAN_WORKSPACE" || mode === "SYSTEM_DIAGNOSTICS") {
      const setup = await mcp.searchDatabases();
      return NextResponse.json({
        success: true,
        ...setup,
        connected: true,
        infraCreated: !!setup.jobsDataSourceId
      });
    }
    return NextResponse.json({ success: false, error: "Invalid mode" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ connected: false });

  try {
    const mcp = new NotionMCPClient(token);
    const setup = await mcp.searchDatabases();
    return NextResponse.json({
      connected: true,
      infraCreated: !!setup.jobsDataSourceId,
      ...setup
    });
  } catch (err) {
    return NextResponse.json({ connected: true, infraCreated: false });
  }
}
