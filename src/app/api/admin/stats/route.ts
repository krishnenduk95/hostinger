import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { domains, vps, billing } from "@/lib/hostinger";

export async function GET() {
  try {
    await requireAdmin();

    // Fetch all local DB stats in parallel
    const [
      customerCount,
      websiteCount,
      domainCount,
      vpsCount,
      revenueResult,
      openTicketCount,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.website.count(),
      prisma.domain.count(),
      prisma.vPS.count(),
      prisma.invoice.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.ticket.count({ where: { status: "OPEN" } }),
    ]);

    // Fetch Hostinger API data (non-critical, wrapped in try/catch)
    let hostingerData = {
      websites: [] as unknown[],
      domains: [] as unknown[],
      vms: [] as unknown[],
      subscriptions: [] as unknown[],
    };

    try {
      const [hWebsites, hDomains, hVMs, hSubscriptions] = await Promise.all([
        Promise.resolve([]),
        domains.listPortfolio().catch(() => []),
        vps.listVMs().catch(() => []),
        billing.listSubscriptions().catch(() => []),
      ]);

      hostingerData = {
        websites: Array.isArray(hWebsites) ? hWebsites : [],
        domains: Array.isArray(hDomains) ? hDomains : [],
        vms: Array.isArray(hVMs) ? hVMs : [],
        subscriptions: Array.isArray(hSubscriptions) ? hSubscriptions : [],
      };
    } catch {
      // Hostinger API is unavailable - continue with empty data
    }

    return NextResponse.json({
      local: {
        customers: customerCount,
        websites: websiteCount,
        domains: domainCount,
        vps: vpsCount,
        revenue: revenueResult._sum.amount ?? 0,
        openTickets: openTicketCount,
      },
      hostinger: {
        websitesCount: hostingerData.websites.length,
        domainsCount: hostingerData.domains.length,
        vpsCount: hostingerData.vms.length,
        activeSubscriptions: hostingerData.subscriptions.length,
        websites: hostingerData.websites,
        domains: hostingerData.domains,
        vms: hostingerData.vms,
        subscriptions: hostingerData.subscriptions,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
