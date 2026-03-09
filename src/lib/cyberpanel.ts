// ---------------------------------------------------------------------------
// CyberPanel API Client
// ---------------------------------------------------------------------------
// CyberPanel runs on port 8090. Every API call is a POST request that
// includes admin credentials in the JSON body.
//
// Required environment variables:
//   CYBERPANEL_URL          - e.g. "https://your-vps-ip:8090" (no trailing slash)
//   CYBERPANEL_ADMIN_USER   - usually "admin"
//   CYBERPANEL_ADMIN_PASS   - the admin password
// ---------------------------------------------------------------------------

const CYBERPANEL_URL = process.env.CYBERPANEL_URL || "";
const ADMIN_USER = process.env.CYBERPANEL_ADMIN_USER || "admin";
const ADMIN_PASS = process.env.CYBERPANEL_ADMIN_PASS || "";

// ---- Types ----------------------------------------------------------------

interface CyberPanelResponse {
  status?: number;
  fetchStatus?: string;
  error_message?: string;
  errorMessage?: string;
  [key: string]: unknown;
}

interface WebsiteCreateInput {
  domainName: string;
  package: string;
  email: string;
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

// ---- Base helper ----------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cpRequest(
  endpoint: string,
  data: Record<string, any> = {},
): Promise<CyberPanelResponse> {
  if (!CYBERPANEL_URL) {
    throw new Error("CyberPanel URL not configured");
  }

  const res = await fetch(`${CYBERPANEL_URL}/api/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminUser: ADMIN_USER,
      adminPass: ADMIN_PASS,
      ...data,
    }),
    // CyberPanel often uses self-signed SSL certificates
    // @ts-expect-error -- Node fetch supports this
    rejectUnauthorized: false,
  });

  if (!res.ok) {
    throw new Error(`CyberPanel API error: ${res.status} ${res.statusText}`);
  }

  const result: CyberPanelResponse = await res.json();

  if (result.status === 0 || result.fetchStatus === "failure") {
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

  list(page?: number) {
    return cpRequest("fetchWebsites", { page: page || 1 });
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
    return cpRequest("changePackageForWebsite", {
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

  list(domainName: string) {
    return cpRequest("fetchDatabases", { databaseWebsite: domainName });
  },
} as const;

export const email = {
  create(data: EmailCreateInput) {
    return cpRequest("submitEmailCreation", data);
  },

  delete(emailAddress: string) {
    return cpRequest("submitEmailDeletion", { emailAddress });
  },

  list(domainName: string) {
    return cpRequest("getEmailsForDomain", { domainName });
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

  list(domainName: string) {
    return cpRequest("getAllFTPAccounts", { domainName });
  },

  changePassword(data: FtpChangePasswordInput) {
    return cpRequest("changeFTPAccountPassword", data);
  },
} as const;

export const ssl = {
  issue(domainName: string) {
    return cpRequest("issueSSL", { domainName });
  },

  status(domainName: string) {
    return cpRequest("getSSLStatus", { domainName });
  },
} as const;

export const packages = {
  create(data: PackageCreateInput) {
    return cpRequest("submitPackageCreation", data);
  },

  delete(packageName: string) {
    return cpRequest("submitPackageDeletion", { packageName });
  },

  list() {
    return cpRequest("getPackages");
  },
} as const;

export const dns = {
  add(data: DnsAddInput) {
    return cpRequest("addDNSRecord", data);
  },

  delete(data: DnsDeleteInput) {
    return cpRequest("deleteDNSRecord", data);
  },

  list(domainName: string) {
    return cpRequest("getCurrentRecordsForDomain", {
      currentSelection: domainName,
      selectedRecordType: "",
    });
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
 * Tests connectivity to the CyberPanel instance by calling `getPackages`.
 * Returns `true` if the API responds successfully, `false` otherwise.
 */
export async function testConnection(): Promise<boolean> {
  try {
    await packages.list();
    return true;
  } catch {
    return false;
  }
}
