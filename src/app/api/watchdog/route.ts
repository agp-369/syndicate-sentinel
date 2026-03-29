import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SentinelWatchdog } from "@/lib/watchdog";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("notion_token")?.value;

  if (!token) {
    return NextResponse.json({ success: false, error: "Notion not connected" }, { status: 401 });
  }

  try {
    const { careerPageId, profile } = await req.json();
    const watchdog = new SentinelWatchdog(token);
    const results = await watchdog.runFullScan(careerPageId, profile);

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      results,
      transactions: watchdog.mcp?.getTransactions() || []
    });
  } catch (error: any) {
    console.error("[WATCHDOG_API] Error:", error);
    return NextResponse.json({ success: false, error: error.message, transactions: [] }, { status: 500 });
  }
}
