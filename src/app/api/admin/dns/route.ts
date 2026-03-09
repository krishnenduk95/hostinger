import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dns } from "@/lib/hostinger";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    if (!domain) {
      return NextResponse.json(
        { error: "Domain parameter is required" },
        { status: 400 }
      );
    }

    const zone = await dns.getZone(domain);

    // Also fetch snapshots for the domain
    let snapshots: unknown[] = [];
    try {
      const snapshotResult = await dns.listSnapshots(domain);
      snapshots = Array.isArray(snapshotResult) ? snapshotResult : [];
    } catch {
      // Snapshots may not be available
    }

    return NextResponse.json({ zone, snapshots });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { action, domain } = body;

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    // Reset DNS zone
    if (action === "reset") {
      const result = await dns.resetZone(domain);
      return NextResponse.json({ result, message: "DNS zone reset successfully" });
    }

    // Validate DNS records
    if (action === "validate") {
      const { records } = body;
      if (!records || !Array.isArray(records)) {
        return NextResponse.json(
          { error: "Records array is required for validation" },
          { status: 400 }
        );
      }
      const result = await dns.validateRecords(domain, records);
      return NextResponse.json({ result });
    }

    // Restore snapshot
    if (action === "restore_snapshot") {
      const { snapshotId } = body;
      if (!snapshotId) {
        return NextResponse.json(
          { error: "Snapshot ID is required" },
          { status: 400 }
        );
      }
      const result = await dns.restoreSnapshot(domain, snapshotId);
      return NextResponse.json({
        result,
        message: "Snapshot restored successfully",
      });
    }

    // Add new records (default POST action)
    const { records } = body;
    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: "Records array is required" },
        { status: 400 }
      );
    }

    const result = await dns.updateZone(domain, records);
    return NextResponse.json({
      result,
      message: "DNS records added successfully",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { domain, records } = body;

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: "Records array is required" },
        { status: 400 }
      );
    }

    const result = await dns.updateZone(domain, records);
    return NextResponse.json({
      result,
      message: "DNS records updated successfully",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { domain, records } = body;

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: "Records array is required" },
        { status: 400 }
      );
    }

    const result = await dns.deleteRecords(domain, records);
    return NextResponse.json({
      result,
      message: "DNS records deleted successfully",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
