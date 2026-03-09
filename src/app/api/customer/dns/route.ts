import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dns } from "@/lib/hostinger";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    if (!domain) {
      return NextResponse.json(
        { error: "Domain parameter is required" },
        { status: 400 }
      );
    }

    // Verify this domain belongs to the user
    const userDomain = await prisma.domain.findFirst({
      where: { domain, userId: session.id },
    });

    if (!userDomain) {
      return NextResponse.json(
        { error: "Domain not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch DNS records from Hostinger
    const zone = await dns.getZone(domain);

    return NextResponse.json({ domain, zone });
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
    const session = await requireAuth();
    const body = await request.json();
    const { domain, records } = body;

    if (!domain || !records) {
      return NextResponse.json(
        { error: "Domain and records are required" },
        { status: 400 }
      );
    }

    // Verify this domain belongs to the user
    const userDomain = await prisma.domain.findFirst({
      where: { domain, userId: session.id },
    });

    if (!userDomain) {
      return NextResponse.json(
        { error: "Domain not found or access denied" },
        { status: 404 }
      );
    }

    // Validate records before updating
    await dns.validateRecords(domain, records);

    // Update DNS records on Hostinger
    const result = await dns.updateZone(domain, records);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
