import { NextResponse } from "next/server";
import { SentinelWatchdog } from "@/lib/watchdog";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

const COOKIE_NAME = "notion_token";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { careerPageId, profile } = body;
    
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    
    if (!token || !careerPageId) {
      return NextResponse.json({ error: "NOTION_TOKEN_MISSING" }, { status: 400 });
    }

    const watchdog = new SentinelWatchdog(token);

    console.log("[WATCHDOG_API] Starting full forensic scan of Jobs section...");
    const processed = await watchdog.runFullScan(careerPageId, profile);

    return NextResponse.json({ 
      timestamp: new Date().toISOString(),
      processedCount: processed.length,
      processed: processed
    });

  } catch (error: any) {
    console.error("[WATCHDOG_API] Critical Failure:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
