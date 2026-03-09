import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dns } from "@/lib/hostinger";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    const snapshotId = searchParams.get("snapshotId");

    if (!domain) {
      return NextResponse.json(
        { error: "Domain parameter is required" },
        { status: 400 }
      );
    }

    if (snapshotId) {
      // Fetch specific snapshot details
      const snapshot = await dns.getSnapshot(domain, snapshotId);
      return NextResponse.json({ snapshot });
    }

    // Fetch all snapshots for the domain
    const snapshots = await dns.listSnapshots(domain);
    return NextResponse.json({
      snapshots: Array.isArray(snapshots) ? snapshots : [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
