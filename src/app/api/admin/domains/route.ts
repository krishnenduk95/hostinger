import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { domains } from "@/lib/hostinger";

export async function GET() {
  try {
    await requireAdmin();

    // Fetch from both Hostinger API and local DB in parallel
    const [hostingerDomains, localDomains] = await Promise.all([
      domains.listPortfolio().catch(() => []),
      prisma.domain.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Handle both {data: [...]} envelope and plain array responses
    const hDomains = Array.isArray(hostingerDomains)
      ? hostingerDomains
      : Array.isArray((hostingerDomains as Record<string, unknown>)?.data)
        ? ((hostingerDomains as Record<string, unknown>).data as Record<string, unknown>[])
        : [];

    // Build a map of local domains keyed by domain name
    const localMap = new Map(
      localDomains.map((d) => [d.domain, d])
    );

    // Auto-sync: create local records for any Hostinger domains not yet in DB
    const newDomains: { domain: string; type: string; status: string; registeredAt?: Date; expiresAt?: Date; autoRenew?: boolean; privacyEnabled?: boolean; lockEnabled?: boolean }[] = [];
    for (const hd of hDomains) {
      const domainName = (hd as Record<string, unknown>).domain as string;
      if (domainName && !localMap.has(domainName)) {
        newDomains.push({
          domain: domainName,
          type: ((hd as Record<string, unknown>).type as string) || "domain",
          status: ((hd as Record<string, unknown>).status as string) || "active",
          registeredAt: (hd as Record<string, unknown>).registered_at ? new Date((hd as Record<string, unknown>).registered_at as string) : undefined,
          expiresAt: (hd as Record<string, unknown>).expires_at ? new Date((hd as Record<string, unknown>).expires_at as string) : undefined,
          autoRenew: ((hd as Record<string, unknown>).auto_renew as boolean) ?? true,
          privacyEnabled: ((hd as Record<string, unknown>).privacy_protection as boolean) ?? false,
          lockEnabled: ((hd as Record<string, unknown>).domain_lock as boolean) ?? false,
        });
      }
    }
    if (newDomains.length > 0) {
      await Promise.all(
        newDomains.map((nd) =>
          prisma.domain.create({ data: nd }).catch(() => null)
        )
      );
      // Re-fetch local domains to get the newly created ones
      const refreshed = await prisma.domain.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      });
      localMap.clear();
      for (const d of refreshed) localMap.set(d.domain, d);
    }

    // Merge: enrich Hostinger data with local DB owner info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merged: any[] = hDomains.map((hd: Record<string, unknown>) => {
      const domainName = (hd.domain as string) || "";
      const localMatch = localMap.get(domainName);
      return {
        ...hd,
        localId: localMatch?.id || null,
        owner: localMatch?.user || null,
        userId: localMatch?.userId || null,
        autoRenew: localMatch?.autoRenew ?? hd.auto_renew ?? false,
        privacyEnabled: localMatch?.privacyEnabled ?? hd.privacy_protection ?? false,
        lockEnabled: localMatch?.lockEnabled ?? hd.domain_lock ?? false,
        localType: localMatch?.type || null,
        localStatus: localMatch?.status || null,
      };
    });

    // Include any local-only domains not found in Hostinger
    for (const [, ld] of localMap) {
      const exists = hDomains.some(
        (hd: Record<string, unknown>) => hd.domain === ld.domain
      );
      if (!exists) {
        merged.push({
          domain: ld.domain,
          type: ld.type,
          status: ld.status,
          registered_at: ld.registeredAt,
          expires_at: ld.expiresAt,
          auto_renew: ld.autoRenew,
          privacy_protection: ld.privacyEnabled,
          domain_lock: ld.lockEnabled,
          localId: ld.id,
          owner: ld.user,
          userId: ld.userId,
          autoRenew: ld.autoRenew,
          privacyEnabled: ld.privacyEnabled,
          lockEnabled: ld.lockEnabled,
          localType: ld.type,
          localStatus: ld.status,
        });
      }
    }

    // Compute stats
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    const stats = {
      total: merged.length,
      active: merged.filter(
        (d: Record<string, unknown>) =>
          ((d.status as string) || "").toLowerCase() === "active"
      ).length,
      expiringSoon: merged.filter((d: Record<string, unknown>) => {
        const exp = d.expires_at as string | undefined;
        if (!exp) return false;
        const expDate = new Date(exp);
        return expDate > now && expDate <= thirtyDaysFromNow;
      }).length,
      expired: merged.filter(
        (d: Record<string, unknown>) =>
          ((d.status as string) || "").toLowerCase() === "expired"
      ).length,
    };

    return NextResponse.json({ domains: merged, stats });
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
    const { domain: domainName, userId } = body;

    if (!domainName) {
      return NextResponse.json(
        { error: "Domain name is required" },
        { status: 400 }
      );
    }

    // Find or create local record
    let localDomain = await prisma.domain.findFirst({
      where: { domain: domainName },
    });

    if (localDomain) {
      localDomain = await prisma.domain.update({
        where: { id: localDomain.id },
        data: { userId: userId || null },
      });
    } else {
      if (!userId) {
        return NextResponse.json(
          { error: "userId is required for new assignment" },
          { status: 400 }
        );
      }
      localDomain = await prisma.domain.create({
        data: {
          domain: domainName,
          userId,
          type: "domain",
          status: "active",
        },
      });
    }

    return NextResponse.json({ domain: localDomain });
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
    const { action } = body;

    // Check domain availability
    if (action === "check") {
      const { domain: domainName, tlds } = body;
      if (!domainName) {
        return NextResponse.json(
          { error: "Domain name is required" },
          { status: 400 }
        );
      }

      const result = await domains.checkAvailability({
        domain: domainName,
        tlds: tlds || [".com", ".net", ".org", ".io", ".dev", ".in"],
      });

      return NextResponse.json({ results: result });
    }

    // Register domain
    if (action === "register") {
      const { domain: domainName, whois_id, payment_method_id, userId } = body;
      if (!domainName || !whois_id || !payment_method_id) {
        return NextResponse.json(
          {
            error:
              "Domain name, whois_id, and payment_method_id are required",
          },
          { status: 400 }
        );
      }

      const hostingerResult = await domains.registerDomain({
        domain: domainName,
        whois_id: Number(whois_id),
        payment_method_id: Number(payment_method_id),
      });

      // Save to local DB
      const localDomain = await prisma.domain.create({
        data: {
          domain: domainName,
          userId: userId || undefined,
          type: "domain",
          status: "active",
          registeredAt: new Date(),
          autoRenew: true,
          hostingerId:
            (hostingerResult as Record<string, unknown>)?.id as
              | number
              | undefined,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return NextResponse.json(
        { domain: localDomain, hostinger: hostingerResult },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'check' or 'register'." },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
