import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cpWebsites } from "@/lib/cyberpanel";

export async function GET() {
  try {
    await requireAdmin();

    // Fetch from both Hostinger API and local DB in parallel
    const [hostingerRes, localWebsites] = await Promise.all([
      cpWebsites.list().catch(() => ({ data: [] })),
      prisma.website.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Handle both {data: [...]} envelope and plain array responses
    const hWebsites = Array.isArray(hostingerRes)
      ? hostingerRes
      : Array.isArray((hostingerRes as Record<string, unknown>)?.data)
        ? ((hostingerRes as Record<string, unknown>).data as Record<string, unknown>[])
        : [];

    // Build a map of local websites keyed by domain for quick lookup
    let localMap = new Map(
      localWebsites.map((w) => [w.domain, w])
    );

    // Auto-sync: create local records for Hostinger websites not yet in DB
    const newSites: { domain: string; hostingerDomain: string; orderId: number; subdomain?: string; rootDirectory?: string }[] = [];
    for (const hw of hWebsites) {
      const h = hw as Record<string, unknown>;
      const domain = (h.domain as string) || "";
      if (domain && !localMap.has(domain)) {
        newSites.push({
          domain,
          hostingerDomain: domain,
          orderId: (h.order_id as number) || 0,
          subdomain: (h.subdomain as string) || undefined,
          rootDirectory: (h.root_directory as string) || undefined,
        });
      }
    }
    if (newSites.length > 0) {
      await Promise.all(
        newSites.map((ns) =>
          prisma.website.create({ data: ns }).catch(() => null)
        )
      );
      // Re-fetch local websites
      const refreshed = await prisma.website.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      });
      localMap = new Map(refreshed.map((w) => [w.domain, w]));
    }

    // Merge: enrich Hostinger data with local DB owner info
    // Normalize field names: vhost_type -> type, is_enabled -> status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merged: any[] = hWebsites.map((hw: Record<string, unknown>) => {
      const domain = (hw.domain as string) || "";
      const localMatch = localMap.get(domain);
      return {
        ...hw,
        type: hw.vhost_type || hw.type || "main",
        status: hw.is_enabled === false ? "disabled" : hw.is_enabled === true ? "active" : (hw.status || "active"),
        root_directory: hw.root_directory || null,
        localId: localMatch?.id || null,
        owner: localMatch?.user || null,
        userId: localMatch?.userId || null,
        rootDirectory: localMatch?.rootDirectory || hw.root_directory || null,
        localCreatedAt: localMatch?.createdAt || null,
      };
    });

    // Also include any local websites not present in Hostinger response
    for (const [, lw] of localMap) {
      const exists = hWebsites.some(
        (hw: Record<string, unknown>) => hw.domain === lw.domain
      );
      if (!exists) {
        merged.push({
          domain: lw.domain,
          subdomain: lw.subdomain,
          type: lw.subdomain ? "subdomain" : "main",
          status: lw.isActive ? "active" : "inactive",
          order_id: lw.orderId,
          localId: lw.id,
          owner: lw.user,
          userId: lw.userId,
          rootDirectory: lw.rootDirectory,
          localCreatedAt: lw.createdAt,
          created_at: lw.createdAt,
        });
      }
    }

    // Compute stats
    const stats = {
      total: merged.length,
      active: merged.filter(
        (w: Record<string, unknown>) =>
          (w.status as string)?.toLowerCase() === "active"
      ).length,
      subdomains: merged.filter(
        (w: Record<string, unknown>) =>
          (w.type as string)?.toLowerCase() === "subdomain"
      ).length,
      addon: merged.filter(
        (w: Record<string, unknown>) =>
          (w.type as string)?.toLowerCase() === "addon"
      ).length,
    };

    return NextResponse.json({ websites: merged, stats });
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
    const { domain, userId, order_id } = body;

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    // Find or create local record for this domain
    let website = await prisma.website.findFirst({ where: { domain } });

    if (website) {
      // Update the assignment
      website = await prisma.website.update({
        where: { id: website.id },
        data: { userId: userId || null },
      });
    } else {
      // Create local record linked to Hostinger website
      website = await prisma.website.create({
        data: {
          domain,
          hostingerDomain: domain,
          orderId: order_id ? Number(order_id) : 1005560611,
          userId: userId || null,
          isActive: true,
        },
      });
    }

    return NextResponse.json({ website });
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
    const { domain, order_id, userId, datacenter_code } = body;

    if (!domain || !order_id) {
      return NextResponse.json(
        { error: "Domain and order_id are required" },
        { status: 400 }
      );
    }

    // Create website on Hostinger
    const hostingerResult = await cpWebsites.create({
      domainName: domain,
      package: body.package || "Default",
      email: body.email || "admin@" + domain,
    });

    // Save to local DB with user assignment
    const website = await prisma.website.create({
      data: {
        domain,
        hostingerDomain: domain,
        orderId: Number(order_id),
        userId: userId || undefined,
        rootDirectory: (hostingerResult as Record<string, unknown>)
          ?.root_directory as string | undefined,
        isActive: true,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(
      { website, hostinger: hostingerResult },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
