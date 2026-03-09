// ---------------------------------------------------------------------------
// CyberPanel API Client + MariaDB Direct Queries
// ---------------------------------------------------------------------------
// CyberPanel's REST API only supports create/delete/status actions.
// For listing websites, packages, databases, emails, etc. we query
// CyberPanel's MariaDB database directly (read-only).
//
// Required environment variables:
//   CYBERPANEL_URL          - e.g. "https://your-vps-ip:8090"
//   CYBERPANEL_ADMIN_USER   - usually "admin"
//   CYBERPANEL_ADMIN_PASS   - the admin password
//   CYBERPANEL_DB_HOST      - MariaDB host (default: 127.0.0.1)
//   CYBERPANEL_DB_USER      - MariaDB user (default: cyberpanel_api)
//   CYBERPANEL_DB_PASS      - MariaDB password
// ---------------------------------------------------------------------------

import mysql from "mysql2/promise";

const CYBERPANEL_URL = process.env.CYBERPANEL_URL || "";
const ADMIN_USER = process.env.CYBERPANEL_ADMIN_USER || "admin";
const ADMIN_PASS = process.env.CYBERPANEL_ADMIN_PASS || "";

// ---- MariaDB connection pool ----------------------------------------------

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.CYBERPANEL_DB_HOST || "127.0.0.1",
      port: Number(process.env.CYBERPANEL_DB_PORT) || 3306,
      user: process.env.CYBERPANEL_DB_USER || "cyberpanel_api",
      password: process.env.CYBERPANEL_DB_PASS || "",
      database: "cyberpanel",
      waitForConnections: true,
      connectionLimit: 5,
    });
  }
  return pool;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function dbQuery(sql: string, params: any[] = []): Promise<any[]> {
  const [rows] = await getPool().execute(sql, params);
  return rows as any[];
}

// ---- Types ----------------------------------------------------------------

interface CyberPanelResponse {
  status?: number;
  createWebSiteStatus?: number;
  fetchStatus?: string;
  error_message?: string;
  errorMessage?: string;
  [key: string]: unknown;
}

interface WebsiteCreateInput {
  domainName: string;
  packageName: string;
  ownerEmail: string;
  websiteOwner: string;
  ownerPassword: string;
  phpSelection?: string;
}

interface DatabaseCreateInput {
  databaseWebsite: string;
  dbName: string;
  dbUsername: string;
  dbPassword: string;
}

interface EmailCreateInput {
  domainName: string;
  userName: string;
  password: string;
}

interface EmailChangePasswordInput {
  email: string;
  password: string;
}

interface FtpCreateInput {
  domainName: string;
  userName: string;
  password: string;
  path?: string;
}

interface FtpChangePasswordInput {
  ftpUsername: string;
  password: string;
}

interface PackageCreateInput {
  packageName: string;
  diskSpace: number;
  bandwidth: number;
  emailAccounts: number;
  dataBases: number;
  ftpAccounts: number;
  allowedDomains: number;
}

interface DnsAddInput {
  zoneName: string;
  recordType: string;
  recordName: string;
  recordValue: string;
  priority?: number;
  ttl?: number;
}

interface DnsDeleteInput {
  zoneName: string;
  recordID: number;
}

interface BackupRestoreInput {
  fileName: string;
  websiteName: string;
}

// ---- API helper (for create/delete/action operations) ---------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cpRequest(
  endpoint: string,
  data: Record<string, any> = {},
): Promise<CyberPanelResponse> {
  if (!CYBERPANEL_URL) {
    throw new Error("CyberPanel URL not configured");
  }

  const agent = new (await import("https")).Agent({
    rejectUnauthorized: false,
  });

  const res = await fetch(`${CYBERPANEL_URL}/api/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminUser: ADMIN_USER,
      adminPass: ADMIN_PASS,
      ...data,
    }),
    // @ts-expect-error -- Node 18+ fetch supports dispatcher/agent
    agent,
  });

  if (!res.ok) {
    throw new Error(`CyberPanel API error: ${res.status} ${res.statusText}`);
  }

  const result: CyberPanelResponse = await res.json();

  if (
    result.status === 0 ||
    result.createWebSiteStatus === 0 ||
    result.fetchStatus === "failure"
  ) {
    throw new Error(
      result.error_message ||
        result.errorMessage ||
        "CyberPanel operation failed",
    );
  }

  return result;
}

// ---- Feature groups -------------------------------------------------------

export const websites = {
  create(data: WebsiteCreateInput) {
    return cpRequest("createWebsite", data);
  },

  delete(domainName: string) {
    return cpRequest("deleteWebsite", { domainName });
  },

  async list() {
    const rows = await dbQuery(`
      SELECT w.id, w.domain, w.adminEmail, w.phpSelection, w.ssl, w.state,
             w.externalApp, p.packageName,
             GROUP_CONCAT(c.domain) as childDomains
      FROM websiteFunctions_websites w
      LEFT JOIN packages_package p ON w.package_id = p.id
      LEFT JOIN websiteFunctions_childdomains c ON c.master_id = w.id
      GROUP BY w.id
      ORDER BY w.id DESC
    `);
    return {
      data: rows.map((r: any) => ({
        id: r.id,
        domain: r.domain,
        adminEmail: r.adminEmail,
        phpVersion: r.phpSelection,
        ssl: r.ssl === 1,
        is_enabled: r.state === 1,
        status: r.state === 1 ? "active" : "suspended",
        package: r.packageName,
        externalApp: r.externalApp,
        childDomains: r.childDomains ? r.childDomains.split(",") : [],
      })),
    };
  },

  suspend(domainName: string) {
    return cpRequest("submitWebsiteStatus", {
      websiteName: domainName,
      state: "Starter",
    });
  },

  unsuspend(domainName: string) {
    return cpRequest("submitWebsiteStatus", {
      websiteName: domainName,
      state: "Starter",
    });
  },

  changePackage(domainName: string, packageName: string) {
    return cpRequest("changePackageAPI", {
      websiteName: domainName,
      packageName,
    });
  },
} as const;

export const databases = {
  create(data: DatabaseCreateInput) {
    return cpRequest("submitDBCreation", data);
  },

  delete(dbName: string) {
    return cpRequest("submitDBDeletion", { dbName });
  },

  async list(domainName: string) {
    const rows = await dbQuery(
      `SELECT d.id, d.dbName, u.user as dbUser
       FROM databases_databases d
       LEFT JOIN databases_databasesusers u ON u.db_id = d.id
       LEFT JOIN websiteFunctions_websites w ON d.website_id = w.id
       WHERE w.domain = ?`,
      [domainName],
    );
    return { data: rows };
  },
} as const;

export const email = {
  create(data: EmailCreateInput) {
    return cpRequest("submitEmailCreation", data);
  },

  delete(emailAddress: string) {
    return cpRequest("submitEmailDeletion", { emailAddress });
  },

  async list(domainName: string) {
    const rows = await dbQuery(
      `SELECT u.id, u.email, u.quota
       FROM e_users u
       LEFT JOIN e_domains d ON u.domain_id = d.id
       WHERE d.domain = ?`,
      [domainName],
    );
    return { data: rows };
  },

  changePassword(data: EmailChangePasswordInput) {
    return cpRequest("changeEmailAccountPassword", data);
  },
} as const;

export const ftp = {
  create(data: FtpCreateInput) {
    return cpRequest("submitFTPCreation", data);
  },

  delete(ftpUsername: string) {
    return cpRequest("submitFTPDeletion", { ftpUsername });
  },

  async list(domainName: string) {
    // Pure-FTPd uses MariaDB for virtual users
    const rows = await dbQuery(
      `SELECT User, Dir FROM ftpd.users WHERE User LIKE ?`,
      [`%_${domainName}`],
    ).catch(() => []);
    return { data: rows };
  },

  changePassword(data: FtpChangePasswordInput) {
    return cpRequest("changeFTPAccountPassword", data);
  },
} as const;

export const ssl = {
  issue(domainName: string) {
    return cpRequest("issueSSL", { domainName });
  },

  async status(domainName: string) {
    const rows = await dbQuery(
      `SELECT ssl FROM websiteFunctions_websites WHERE domain = ?`,
      [domainName],
    );
    return { ssl: rows[0]?.ssl === 1 };
  },
} as const;

export const packages = {
  create(data: PackageCreateInput) {
    return cpRequest("submitPackageCreation", data);
  },

  delete(packageName: string) {
    return cpRequest("submitPackageDeletion", { packageName });
  },

  async list() {
    const rows = await dbQuery(`
      SELECT id, packageName, diskSpace, bandwidth, emailAccounts,
             dataBases, ftpAccounts, allowedDomains
      FROM packages_package
      ORDER BY id
    `);
    return { data: rows };
  },
} as const;

export const dns = {
  add(data: DnsAddInput) {
    return cpRequest("addDNSRecord", data);
  },

  delete(data: DnsDeleteInput) {
    return cpRequest("deleteDNSRecord", data);
  },

  async list(domainName: string) {
    const rows = await dbQuery(
      `SELECT r.id, r.name, r.type, r.content, r.ttl, r.prio as priority
       FROM records r
       LEFT JOIN domains d ON r.domain_id = d.id
       WHERE d.name = ?
       ORDER BY r.type, r.name`,
      [domainName],
    );
    return { data: rows };
  },
} as const;

export const backups = {
  create(domainName: string) {
    return cpRequest("submitBackupCreation", {
      websiteToBeBacked: domainName,
    });
  },

  restore(data: BackupRestoreInput) {
    return cpRequest("submitRestoreBackup", data);
  },
} as const;

// ---- Aliases for clearer imports ------------------------------------------

export {
  websites as cpWebsites,
  databases as cpDatabases,
  email as cpEmail,
  ftp as cpFtp,
  ssl as cpSsl,
  packages as cpPackages,
  dns as cpDns,
  backups as cpBackups,
};

// ---- Utility --------------------------------------------------------------

/**
 * Tests connectivity to the CyberPanel instance by calling `verifyConn`.
 * Returns `true` if the API responds successfully, `false` otherwise.
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await cpRequest("verifyConn");
    return result.verifyConn === 1;
  } catch {
    return false;
  }
}
