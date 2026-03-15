import { NextResponse } from "next/server";
import { SentinelWatchdog } from "@/lib/watchdog";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { notionToken, databaseId, profileId } = await req.json();
    
    if (!notionToken || !databaseId) {
      return NextResponse.json({ error: "UPLINK_CONFIG_MISSING" }, { status: 400 });
    }

    const watchdog = new SentinelWatchdog(notionToken);

    // 1. SCAN FOR NEW LEADS (Status is Empty)
    console.log("WATCHDOG_POLL: Checking for new leads...");
    const newLeads = await watchdog.checkForNewLeads(databaseId);
    for (const lead of newLeads) {
      await watchdog.processLead(lead.id, profileId);
    }

    // 2. SCAN FOR APPROVALS (Approved is checked)
    console.log("WATCHDOG_POLL: Checking for approvals...");
    const approvedLeads = await watchdog.checkForApprovals(databaseId);
    for (const lead of approvedLeads) {
      await watchdog.finalizeLead(lead.id);
    }

    return NextResponse.json({ 
      timestamp: new Date().toISOString(),
      processed: newLeads.length, 
      finalized: approvedLeads.length 
    });

  } catch (error: any) {
    console.error("WATCHDOG_CRITICAL_FAILURE:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
