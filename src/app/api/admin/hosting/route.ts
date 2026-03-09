import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  cpWebsites,
  cpDatabases,
  cpEmail,
  cpPackages,
  cpSsl,
} from "@/lib/cyberpanel";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const dbDomain = searchParams.get("databases");
    const emailDomain = searchParams.get("emails");

    // If requesting databases for a specific website
    if (dbDomain) {
      const result = await cpDatabases.list(dbDomain).catch(() => ({}));
      const data = (result as Record<string, unknown>).data;
      return NextResponse.json({
        databases: Array.isArray(data) ? data : [],
      });
    }

    // If requesting emails for a specific domain
    if (emailDomain) {
      const result = await cpEmail.list(emailDomain).catch(() => ({}));
      const data = (result as Record<string, unknown>).data;
      return NextResponse.json({
        emails: Array.isArray(data) ? data : [],
      });
    }

    // Default: fetch websites, packages, accounts, customers
    const [websitesRes, packagesRes, accounts, customers] = await Promise.all([
      cpWebsites.list().catch(() => ({})),
      cpPackages.list().catch(() => ({})),
      prisma.hostingAccount.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { role: "CUSTOMER" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // Normalize CyberPanel responses
    const wRaw = (websitesRes as Record<string, unknown>).data;
    const websites = Array.isArray(wRaw) ? wRaw : [];

    const pRaw = (packagesRes as Record<string, unknown>).data;
    let packagesList: unknown[] = [];
    if (Array.isArray(pRaw)) {
      packagesList = pRaw;
    } else if (pRaw && typeof pRaw === "object") {
      packagesList = Object.entries(pRaw as Record<string, unknown>).map(
        ([name, details]) => ({
          name,
          ...(typeof details === "object" && details !== null ? details : {}),
        })
      );
    }

    // Enrich websites with local account data (customer assignment)
    const accountMap = new Map(accounts.map((a) => [a.domain, a]));
    const enrichedWebsites = websites.map((w: unknown) => {
      const site = w as Record<string, unknown>;
      const domain = (site.domain || site.domainName || "") as string;
      const local = accountMap.get(domain);
      return {
        ...site,
        domain,
        assignedUser: local?.user || null,
        accountId: local?.id || null,
        localStatus: local?.status || null,
      };
    });

    return NextResponse.json({
      websites: enrichedWebsites,
      packages: packagesList,
      accounts,
      customers,
    });
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

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    // ── Website actions ──────────────────────────────────────────

    if (action === "createWebsite") {
      const { domainName, package: pkg, email, userId } = body;
      if (!domainName || !pkg) {
        return NextResponse.json(
          { error: "Domain name and package are required" },
          { status: 400 }
        );
      }

      const result = await cpWebsites.create({
        domainName,
        packageName: pkg,
        ownerEmail: email || `admin@${domainName}`,
        websiteOwner: "admin",
        ownerPassword: process.env.CYBERPANEL_ADMIN_PASS || "",
      });

      // Track locally
      if (userId) {
        await prisma.hostingAccount
          .create({
            data: { userId, domain: domainName, package: pkg },
          })
          .catch(() => null); // ignore duplicate
      }

      return NextResponse.json({ result }, { status: 201 });
    }

    if (action === "deleteWebsite") {
      const { domainName } = body;
      if (!domainName) {
        return NextResponse.json(
          { error: "Domain name is required" },
          { status: 400 }
        );
      }

      const result = await cpWebsites.delete(domainName);

      // Remove local record
      await prisma.hostingAccount
        .delete({ where: { domain: domainName } })
        .catch(() => null);

      return NextResponse.json({ result });
    }

    if (action === "suspendWebsite") {
      const { domainName } = body;
      if (!domainName) {
        return NextResponse.json(
          { error: "Domain name is required" },
          { status: 400 }
        );
      }
      const result = await cpWebsites.suspend(domainName);
      await prisma.hostingAccount
        .update({
          where: { domain: domainName },
          data: { status: "suspended" },
        })
        .catch(() => null);
      return NextResponse.json({ result });
    }

    if (action === "unsuspendWebsite") {
      const { domainName } = body;
      if (!domainName) {
        return NextResponse.json(
          { error: "Domain name is required" },
          { status: 400 }
        );
      }
      const result = await cpWebsites.unsuspend(domainName);
      await prisma.hostingAccount
        .update({
          where: { domain: domainName },
          data: { status: "active" },
        })
        .catch(() => null);
      return NextResponse.json({ result });
    }

    if (action === "assignWebsite") {
      const { domainName, userId, packageName } = body;
      if (!domainName) {
        return NextResponse.json(
          { error: "Domain name is required" },
          { status: 400 }
        );
      }

      const account = await prisma.hostingAccount.upsert({
        where: { domain: domainName },
        create: {
          domain: domainName,
          userId: userId || "",
          package: packageName || "Default",
        },
        update: { userId: userId || undefined },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      return NextResponse.json({ account });
    }

    // ── SSL ──────────────────────────────────────────────────────

    if (action === "issueSSL") {
      const { domainName } = body;
      if (!domainName) {
        return NextResponse.json(
          { error: "Domain name is required" },
          { status: 400 }
        );
      }
      const result = await cpSsl.issue(domainName);
      return NextResponse.json({ result });
    }

    // ── Package actions ──────────────────────────────────────────

    if (action === "createPackage") {
      const {
        packageName,
        diskSpace,
        bandwidth,
        emailAccounts,
        dataBases,
        ftpAccounts,
        allowedDomains,
      } = body;

      if (!packageName) {
        return NextResponse.json(
          { error: "Package name is required" },
          { status: 400 }
        );
      }

      const result = await cpPackages.create({
        packageName,
        diskSpace: Number(diskSpace) || 5120,
        bandwidth: Number(bandwidth) || 102400,
        emailAccounts: Number(emailAccounts) || 10,
        dataBases: Number(dataBases) || 5,
        ftpAccounts: Number(ftpAccounts) || 5,
        allowedDomains: Number(allowedDomains) || 1,
      });

      return NextResponse.json({ result }, { status: 201 });
    }

    if (action === "deletePackage") {
      const { packageName } = body;
      if (!packageName) {
        return NextResponse.json(
          { error: "Package name is required" },
          { status: 400 }
        );
      }
      const result = await cpPackages.delete(packageName);
      return NextResponse.json({ result });
    }

    // ── Database actions ─────────────────────────────────────────

    if (action === "createDatabase") {
      const { databaseWebsite, dbName, dbUsername, dbPassword } = body;
      if (!databaseWebsite || !dbName || !dbUsername || !dbPassword) {
        return NextResponse.json(
          { error: "All database fields are required" },
          { status: 400 }
        );
      }
      const result = await cpDatabases.create({
        databaseWebsite,
        dbName,
        dbUsername,
        dbPassword,
      });
      return NextResponse.json({ result }, { status: 201 });
    }

    if (action === "deleteDatabase") {
      const { dbName } = body;
      if (!dbName) {
        return NextResponse.json(
          { error: "Database name is required" },
          { status: 400 }
        );
      }
      const result = await cpDatabases.delete(dbName);
      return NextResponse.json({ result });
    }

    // ── Email actions ────────────────────────────────────────────

    if (action === "createEmail") {
      const { domainName, userName, password } = body;
      if (!domainName || !userName || !password) {
        return NextResponse.json(
          { error: "Domain, username, and password are required" },
          { status: 400 }
        );
      }
      const result = await cpEmail.create({ domainName, userName, password });
      return NextResponse.json({ result }, { status: 201 });
    }

    if (action === "deleteEmail") {
      const { email: emailAddr } = body;
      if (!emailAddr) {
        return NextResponse.json(
          { error: "Email address is required" },
          { status: 400 }
        );
      }
      const result = await cpEmail.delete(emailAddr);
      return NextResponse.json({ result });
    }

    return NextResponse.json(
      { error: `Invalid action: ${action}` },
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
