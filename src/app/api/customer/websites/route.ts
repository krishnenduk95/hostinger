import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cpWebsites } from "@/lib/cyberpanel";

export async function GET() {
  try {
    const session = await requireAuth();

    // Fetch user's websites from local DB
    const localWebsites = await prisma.website.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
    });

    // Fetch Hostinger data to enrich local records
    const hostingerRes = await cpWebsites
      .list()
      .catch(() => ({ data: [] }));

    // Handle both {data: [...]} envelope and plain array responses
    const hWebsites = Array.isArray(hostingerRes)
      ? hostingerRes
      : Array.isArray((hostingerRes as Record<string, unknown>)?.data)
        ? ((hostingerRes as Record<string, unknown>).data as Record<string, unknown>[])
        : [];

    // Merge Hostinger live data with local records
    const websites = localWebsites.map((lw) => {
      const match = hWebsites.find(
        (hw: Record<string, unknown>) => hw.domain === lw.domain
      );
      const m = match as Record<string, unknown> | undefined;
      return {
        id: lw.id,
        domain: lw.domain,
        subdomain: lw.subdomain,
        hostingerDomain: lw.hostingerDomain,
        orderId: lw.orderId,
        rootDirectory:
          lw.rootDirectory ||
          m?.root_directory ||
          null,
        isActive: lw.isActive,
        status: m
          ? (m.is_enabled === false ? "disabled" : "active")
          : lw.isActive
            ? "active"
            : "inactive",
        type: m
          ? (m.vhost_type || m.type || "main")
          : lw.subdomain
            ? "subdomain"
            : "main",
        hostingerData: match || null,
        createdAt: lw.createdAt,
        updatedAt: lw.updatedAt,
      };
    });

    const stats = {
      total: websites.length,
      active: websites.filter(
        (w) => String(w.status).toLowerCase() === "active"
      ).length,
      subdomains: websites.filter(
        (w) => String(w.type).toLowerCase() === "subdomain"
      ).length,
    };

    return NextResponse.json({ websites, stats });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    // CyberPanel doesn't support subdomain generation
    if (body.action === "generateSubdomain") {
      return NextResponse.json(
        { error: "Use your own domain or subdomain" },
        { status: 400 }
      );
    }

    // Website creation via CyberPanel
    const { domain } = body;

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    // Verify user has at least one hosting account
    const accounts = await prisma.hostingAccount.findMany({
      where: { userId: session.id },
    });

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: "No hosting account found. Contact admin." },
        { status: 403 }
      );
    }

    // Create website via CyberPanel API
    const cpResult = await cpWebsites.create({
      domainName: domain,
      packageName: accounts[0].package || "Default",
      ownerEmail: session.email,
      websiteOwner: "admin",
      ownerPassword: process.env.CYBERPANEL_ADMIN_PASS || "",
    });

    // Create local DB record
    const website = await prisma.website.create({
      data: {
        domain,
        hostingerDomain: domain,
        orderId: 0,
        userId: session.id,
        isActive: true,
      },
    });

    return NextResponse.json({ website, result: cpResult }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
