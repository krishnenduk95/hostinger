import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cpDatabases, cpEmail, cpFtp } from "@/lib/cyberpanel";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);
    const dbDomain = searchParams.get("databases");
    const emailDomain = searchParams.get("emails");
    const ftpDomain = searchParams.get("ftp");

    // Verify the domain belongs to this customer
    async function verifyDomain(domain: string) {
      const account = await prisma.hostingAccount.findUnique({
        where: { domain },
      });
      if (!account || account.userId !== session.id) {
        throw new Error("Forbidden");
      }
      return account;
    }

    // Fetch databases for a specific website
    if (dbDomain) {
      await verifyDomain(dbDomain);
      const result = await cpDatabases.list(dbDomain).catch(() => ({}));
      const data = (result as Record<string, unknown>).data;
      return NextResponse.json({
        databases: Array.isArray(data) ? data : [],
      });
    }

    // Fetch emails for a specific domain
    if (emailDomain) {
      await verifyDomain(emailDomain);
      const result = await cpEmail.list(emailDomain).catch(() => ({}));
      const data = (result as Record<string, unknown>).data;
      return NextResponse.json({
        emails: Array.isArray(data) ? data : [],
      });
    }

    // Fetch FTP accounts for a specific domain
    if (ftpDomain) {
      await verifyDomain(ftpDomain);
      const result = await cpFtp.list(ftpDomain).catch(() => ({}));
      const data = (result as Record<string, unknown>).data;
      return NextResponse.json({
        ftp: Array.isArray(data) ? data : [],
      });
    }

    // Default: return customer's hosting accounts
    const accounts = await prisma.hostingAccount.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ accounts });
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
    const session = await requireAuth();
    const body = await request.json();
    const { action } = body;

    // Verify the domain belongs to this customer
    async function verifyDomain(domain: string) {
      const account = await prisma.hostingAccount.findUnique({
        where: { domain },
      });
      if (!account || account.userId !== session.id) {
        throw new Error("Forbidden");
      }
      return account;
    }

    if (action === "createDatabase") {
      const { domainName, dbName, dbUsername, dbPassword } = body;
      if (!domainName || !dbName || !dbUsername || !dbPassword) {
        return NextResponse.json(
          { error: "All database fields are required" },
          { status: 400 }
        );
      }
      await verifyDomain(domainName);
      const result = await cpDatabases.create({
        databaseWebsite: domainName,
        dbName,
        dbUsername,
        dbPassword,
      });
      return NextResponse.json({ result }, { status: 201 });
    }

    if (action === "deleteDatabase") {
      const { domainName, dbName } = body;
      if (!dbName) {
        return NextResponse.json(
          { error: "Database name is required" },
          { status: 400 }
        );
      }
      if (domainName) await verifyDomain(domainName);
      const result = await cpDatabases.delete(dbName);
      return NextResponse.json({ result });
    }

    if (action === "createEmail") {
      const { domainName, userName, password } = body;
      if (!domainName || !userName || !password) {
        return NextResponse.json(
          { error: "Domain, username, and password are required" },
          { status: 400 }
        );
      }
      await verifyDomain(domainName);
      const result = await cpEmail.create({ domainName, userName, password });
      return NextResponse.json({ result }, { status: 201 });
    }

    if (action === "deleteEmail") {
      const { domainName, email: emailAddr } = body;
      if (!emailAddr) {
        return NextResponse.json(
          { error: "Email address is required" },
          { status: 400 }
        );
      }
      if (domainName) await verifyDomain(domainName);
      const result = await cpEmail.delete(emailAddr);
      return NextResponse.json({ result });
    }

    if (action === "createFtp") {
      const { domainName, userName, password, path } = body;
      if (!domainName || !userName || !password) {
        return NextResponse.json(
          { error: "Domain, username, and password are required" },
          { status: 400 }
        );
      }
      await verifyDomain(domainName);
      const result = await cpFtp.create({ domainName, userName, password, path });
      return NextResponse.json({ result }, { status: 201 });
    }

    if (action === "deleteFtp") {
      const { domainName, ftpUsername } = body;
      if (!ftpUsername) {
        return NextResponse.json(
          { error: "FTP username is required" },
          { status: 400 }
        );
      }
      if (domainName) await verifyDomain(domainName);
      const result = await cpFtp.delete(ftpUsername);
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
