"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import {
  HardDrive,
  Database,
  Mail,
  Plus,
  Search,
  Loader2,
  RefreshCw,
  Trash2,
  Globe,
  Package,
  Shield,
  Lock,
  Users,
  Play,
  Pause,
  Key,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────

interface CyberPanelWebsite {
  domain: string;
  adminEmail?: string;
  ipAddress?: string;
  admin?: string;
  package?: string;
  state?: string;
  diskUsed?: string;
}

interface CyberPanelPackage {
  packageName: string;
  diskSpace?: number;
  bandwidth?: number;
  emailAccounts?: number;
  dataBases?: number;
  ftpAccounts?: number;
  allowedDomains?: number;
}

interface HostingAccount {
  id: string;
  userId?: string | null;
  domain?: string;
  status?: string;
  user?: { id: string; name: string; email: string } | null;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface DatabaseEntry {
  dbName: string;
  dbUser?: string;
}

interface EmailAccount {
  email: string;
  userName?: string;
}

type TabId = "websites" | "packages" | "databases" | "email";

// ── Helpers ─────────────────────────────────────────────────

function generatePassword(length = 16): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
  let pw = "";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  for (let i = 0; i < length; i++) {
    pw += charset[values[i] % charset.length];
  }
  return pw;
}

async function apiPost(body: Record<string, unknown>): Promise<{
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
  redirect?: boolean;
}> {
  try {
    const res = await fetch("/api/admin/hosting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, redirect: true };
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || "Request failed" };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

function handleApiResult(result: Awaited<ReturnType<typeof apiPost>>): boolean {
  if (result.redirect) {
    window.location.href = "/login";
    return false;
  }
  if (!result.ok) {
    alert(result.error);
    return false;
  }
  return true;
}

function SkeletonRows({ cols, rows = 4 }: { cols: number; rows?: number }) {
  return (
    <>
      {[...Array(rows)].map((_, i) => (
        <TableRow key={i}>
          {[...Array(cols)].map((_, j) => (
            <TableCell key={j}>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-full max-w-[120px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ── Main Page ───────────────────────────────────────────────

export default function HostingManagementPage() {
  const [activeTab, setActiveTab] = useState<TabId>("websites");
  const [websites, setWebsites] = useState<CyberPanelWebsite[]>([]);
  const [packages, setPackages] = useState<CyberPanelPackage[]>([]);
  const [accounts, setAccounts] = useState<HostingAccount[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/hosting");
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to load hosting data");
        return;
      }
      const data = await res.json();
      setWebsites(Array.isArray(data.websites) ? data.websites : []);
      setPackages(Array.isArray(data.packages) ? data.packages : []);
      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      setCustomers(Array.isArray(data.customers) ? data.customers : []);
    } catch {
      alert("Network error loading hosting data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "websites", label: "Websites", icon: Globe },
    { id: "packages", label: "Packages", icon: Package },
    { id: "databases", label: "Databases", icon: Database },
    { id: "email", label: "Email", icon: Mail },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hosting Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage CyberPanel websites, packages, databases, and email accounts
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Websites</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {loading ? (
                    <span className="inline-block h-7 w-8 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    websites.length
                  )}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                <Globe className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Packages</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {loading ? (
                    <span className="inline-block h-7 w-8 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    packages.length
                  )}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Databases</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  --
                </p>
                <p className="text-xs text-gray-400 mt-1">Select a website to view</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                <Database className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Email Accounts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  --
                </p>
                <p className="text-xs text-gray-400 mt-1">Select a domain to view</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                <Mail className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={
              activeTab === t.id
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }
            variant={activeTab === t.id ? "default" : "outline"}
          >
            <t.icon className="h-4 w-4 mr-2" />
            {t.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "websites" && (
        <WebsitesTab
          websites={websites}
          packages={packages}
          accounts={accounts}
          customers={customers}
          loading={loading}
          onRefresh={fetchData}
        />
      )}
      {activeTab === "packages" && (
        <PackagesTab
          packages={packages}
          loading={loading}
          onRefresh={fetchData}
        />
      )}
      {activeTab === "databases" && (
        <DatabasesTab
          websites={websites}
          loading={loading}
          onRefresh={fetchData}
        />
      )}
      {activeTab === "email" && (
        <EmailTab
          websites={websites}
          loading={loading}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// WEBSITES TAB
// ══════════════════════════════════════════════════════════════

function WebsitesTab({
  websites,
  packages,
  accounts,
  customers,
  loading,
  onRefresh,
}: {
  websites: CyberPanelWebsite[];
  packages: CyberPanelPackage[];
  accounts: HostingAccount[];
  customers: Customer[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create form
  const [formDomain, setFormDomain] = useState("");
  const [formPackage, setFormPackage] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formUserId, setFormUserId] = useState("");

  function resetForm() {
    setFormDomain("");
    setFormPackage(packages.length > 0 ? packages[0].packageName : "");
    setFormEmail("");
    setFormUserId("");
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formDomain || !formPackage || !formEmail) return;
    setSubmitting(true);

    const result = await apiPost({
      action: "createWebsite",
      domainName: formDomain,
      package: formPackage,
      email: formEmail,
      userId: formUserId || undefined,
    });

    setSubmitting(false);
    if (handleApiResult(result)) {
      closeModal();
      onRefresh();
    }
  }

  async function handleDelete(domain: string) {
    if (
      !confirm(
        `Are you sure you want to delete the website "${domain}"? This will permanently remove all associated files and data.`
      )
    )
      return;

    setActionLoading(`delete-${domain}`);
    const result = await apiPost({ action: "deleteWebsite", domainName: domain });
    setActionLoading(null);
    if (handleApiResult(result)) {
      onRefresh();
    }
  }

  async function handleSuspend(domain: string) {
    if (!confirm(`Suspend website "${domain}"?`)) return;
    setActionLoading(`suspend-${domain}`);
    const result = await apiPost({ action: "suspendWebsite", domainName: domain });
    setActionLoading(null);
    if (handleApiResult(result)) {
      onRefresh();
    }
  }

  async function handleUnsuspend(domain: string) {
    setActionLoading(`unsuspend-${domain}`);
    const result = await apiPost({
      action: "unsuspendWebsite",
      domainName: domain,
    });
    setActionLoading(null);
    if (handleApiResult(result)) {
      onRefresh();
    }
  }

  async function handleIssueSSL(domain: string) {
    setActionLoading(`ssl-${domain}`);
    const result = await apiPost({ action: "issueSSL", domainName: domain });
    setActionLoading(null);
    if (handleApiResult(result)) {
      alert(`SSL certificate issued successfully for ${domain}`);
    }
  }

  // Build a lookup from domain -> account to show assigned customer
  const accountByDomain = new Map<string, HostingAccount>();
  for (const acc of accounts) {
    if (acc.domain) {
      accountByDomain.set(acc.domain, acc);
    }
  }

  const filtered = websites.filter(
    (w) =>
      !search ||
      w.domain?.toLowerCase().includes(search.toLowerCase()) ||
      w.package?.toLowerCase().includes(search.toLowerCase()) ||
      w.adminEmail?.toLowerCase().includes(search.toLowerCase()) ||
      accountByDomain
        .get(w.domain)
        ?.user?.name?.toLowerCase()
        .includes(search.toLowerCase()) ||
      accountByDomain
        .get(w.domain)
        ?.user?.email?.toLowerCase()
        .includes(search.toLowerCase())
  );

  function statusBadge(state?: string) {
    const s = (state || "").toLowerCase();
    if (s === "suspended")
      return (
        <Badge variant="custom" className="bg-red-100 text-red-800">
          Suspended
        </Badge>
      );
    return (
      <Badge variant="custom" className="bg-emerald-100 text-emerald-800">
        Active
      </Badge>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search websites by domain, package, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Website
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Customer</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <SkeletonRows cols={5} />
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="text-center py-12">
                      <Globe className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900">
                        No websites found
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {search
                          ? "Try adjusting your search terms"
                          : "Create a website on CyberPanel to get started"}
                      </p>
                      {!search && (
                        <Button size="sm" className="mt-4" onClick={openCreate}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Website
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((site) => {
                  const account = accountByDomain.get(site.domain);
                  const isSuspended =
                    (site.state || "").toLowerCase() === "suspended";
                  const domainKey = site.domain;

                  return (
                    <TableRow key={domainKey}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {site.domain}
                            </p>
                            {site.adminEmail && (
                              <p className="text-xs text-gray-500">
                                {site.adminEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="custom"
                          className="bg-blue-100 text-blue-800"
                        >
                          {site.package || "--"}
                        </Badge>
                      </TableCell>
                      <TableCell>{statusBadge(site.state)}</TableCell>
                      <TableCell>
                        {account?.user ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {account.user.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {account.user.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Issue SSL certificate"
                            disabled={actionLoading === `ssl-${domainKey}`}
                            onClick={() => handleIssueSSL(domainKey)}
                          >
                            {actionLoading === `ssl-${domainKey}` ? (
                              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            ) : (
                              <Lock className="h-4 w-4 text-emerald-500" />
                            )}
                          </Button>
                          {isSuspended ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Unsuspend website"
                              disabled={
                                actionLoading === `unsuspend-${domainKey}`
                              }
                              onClick={() => handleUnsuspend(domainKey)}
                            >
                              {actionLoading ===
                              `unsuspend-${domainKey}` ? (
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              ) : (
                                <Play className="h-4 w-4 text-blue-500" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Suspend website"
                              disabled={
                                actionLoading === `suspend-${domainKey}`
                              }
                              onClick={() => handleSuspend(domainKey)}
                            >
                              {actionLoading ===
                              `suspend-${domainKey}` ? (
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              ) : (
                                <Pause className="h-4 w-4 text-amber-500" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete website"
                            disabled={actionLoading === `delete-${domainKey}`}
                            onClick={() => handleDelete(domainKey)}
                          >
                            {actionLoading === `delete-${domainKey}` ? (
                              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-500" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Website Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Create Website"
        description="Create a new website on CyberPanel"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Domain Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. example.com"
              value={formDomain}
              onChange={(e) => setFormDomain(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Package <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formPackage}
              onChange={(e) => setFormPackage(e.target.value)}
              required
            >
              <option value="">-- Select Package --</option>
              {packages.map((p) => (
                <option key={p.packageName} value={p.packageName}>
                  {p.packageName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Admin Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Assign to Customer (optional)
            </label>
            <select
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formUserId}
              onChange={(e) => setFormUserId(e.target.value)}
            >
              <option value="">-- None --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formDomain || !formPackage || !formEmail}
            >
              {submitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Website
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PACKAGES TAB
// ══════════════════════════════════════════════════════════════

function PackagesTab({
  packages,
  loading,
  onRefresh,
}: {
  packages: CyberPanelPackage[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingPkg, setDeletingPkg] = useState<string | null>(null);

  // Create form with defaults
  const [formName, setFormName] = useState("");
  const [formDisk, setFormDisk] = useState("5120");
  const [formBandwidth, setFormBandwidth] = useState("102400");
  const [formEmails, setFormEmails] = useState("10");
  const [formDatabases, setFormDatabases] = useState("5");
  const [formFtp, setFormFtp] = useState("5");
  const [formDomains, setFormDomains] = useState("1");

  function resetForm() {
    setFormName("");
    setFormDisk("5120");
    setFormBandwidth("102400");
    setFormEmails("10");
    setFormDatabases("5");
    setFormFtp("5");
    setFormDomains("1");
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName) return;
    setSubmitting(true);

    const result = await apiPost({
      action: "createPackage",
      packageName: formName,
      diskSpace: Number(formDisk),
      bandwidth: Number(formBandwidth),
      emailAccounts: Number(formEmails),
      dataBases: Number(formDatabases),
      ftpAccounts: Number(formFtp),
      allowedDomains: Number(formDomains),
    });

    setSubmitting(false);
    if (handleApiResult(result)) {
      closeModal();
      onRefresh();
    }
  }

  async function handleDelete(packageName: string) {
    if (
      !confirm(
        `Are you sure you want to delete the package "${packageName}"? Websites using this package may be affected.`
      )
    )
      return;

    setDeletingPkg(packageName);
    const result = await apiPost({
      action: "deletePackage",
      packageName,
    });
    setDeletingPkg(null);
    if (handleApiResult(result)) {
      onRefresh();
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Package
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package Name</TableHead>
                <TableHead>Disk Space (MB)</TableHead>
                <TableHead>Bandwidth (MB)</TableHead>
                <TableHead>Email Accounts</TableHead>
                <TableHead>Databases</TableHead>
                <TableHead>FTP Accounts</TableHead>
                <TableHead>Domains</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <SkeletonRows cols={8} rows={3} />
              ) : packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900">
                        No packages found
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Create a hosting package to assign to websites
                      </p>
                      <Button size="sm" className="mt-4" onClick={openCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Package
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((pkg) => (
                  <TableRow key={pkg.packageName}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900">
                          {pkg.packageName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-700">
                        {pkg.diskSpace ?? "--"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-700">
                        {pkg.bandwidth ?? "--"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="custom"
                        className="bg-amber-100 text-amber-800"
                      >
                        {pkg.emailAccounts ?? "--"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="custom"
                        className="bg-purple-100 text-purple-800"
                      >
                        {pkg.dataBases ?? "--"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-700">
                        {pkg.ftpAccounts ?? "--"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-700">
                        {pkg.allowedDomains ?? "--"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete package"
                          disabled={deletingPkg === pkg.packageName}
                          onClick={() => handleDelete(pkg.packageName)}
                        >
                          {deletingPkg === pkg.packageName ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Package Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Create Package"
        description="Create a new hosting package on CyberPanel"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Package Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. basic-plan"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Disk Space (MB)
              </label>
              <Input
                type="number"
                min="0"
                value={formDisk}
                onChange={(e) => setFormDisk(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Bandwidth (MB)
              </label>
              <Input
                type="number"
                min="0"
                value={formBandwidth}
                onChange={(e) => setFormBandwidth(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Email Accounts
              </label>
              <Input
                type="number"
                min="0"
                value={formEmails}
                onChange={(e) => setFormEmails(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Databases
              </label>
              <Input
                type="number"
                min="0"
                value={formDatabases}
                onChange={(e) => setFormDatabases(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                FTP Accounts
              </label>
              <Input
                type="number"
                min="0"
                value={formFtp}
                onChange={(e) => setFormFtp(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Allowed Domains
              </label>
              <Input
                type="number"
                min="0"
                value={formDomains}
                onChange={(e) => setFormDomains(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !formName}>
              {submitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Package
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DATABASES TAB
// ══════════════════════════════════════════════════════════════

function DatabasesTab({
  websites,
  loading: parentLoading,
  onRefresh,
}: {
  websites: CyberPanelWebsite[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [selectedWebsite, setSelectedWebsite] = useState("");
  const [databases, setDatabases] = useState<DatabaseEntry[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingDb, setDeletingDb] = useState<string | null>(null);

  // Create form
  const [formWebsite, setFormWebsite] = useState("");
  const [formDbName, setFormDbName] = useState("");
  const [formDbUser, setFormDbUser] = useState("");
  const [formDbPassword, setFormDbPassword] = useState("");

  // Fetch databases when a website is selected
  const fetchDatabases = useCallback(async (domain: string) => {
    if (!domain) {
      setDatabases([]);
      return;
    }
    setDbLoading(true);
    try {
      const res = await fetch(
        `/api/admin/hosting?databases=${encodeURIComponent(domain)}`
      );
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to load databases");
        setDatabases([]);
        return;
      }
      const data = await res.json();
      setDatabases(Array.isArray(data.databases) ? data.databases : []);
    } catch {
      alert("Network error loading databases");
      setDatabases([]);
    } finally {
      setDbLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWebsite) {
      fetchDatabases(selectedWebsite);
    } else {
      setDatabases([]);
    }
  }, [selectedWebsite, fetchDatabases]);

  function resetForm() {
    setFormWebsite(selectedWebsite || "");
    setFormDbName("");
    setFormDbUser("");
    setFormDbPassword("");
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formWebsite || !formDbName || !formDbUser || !formDbPassword) return;
    setSubmitting(true);

    const result = await apiPost({
      action: "createDatabase",
      databaseWebsite: formWebsite,
      dbName: formDbName,
      dbUsername: formDbUser,
      dbPassword: formDbPassword,
    });

    setSubmitting(false);
    if (handleApiResult(result)) {
      closeModal();
      if (selectedWebsite === formWebsite) {
        fetchDatabases(selectedWebsite);
      }
      onRefresh();
    }
  }

  async function handleDelete(dbName: string) {
    if (
      !confirm(
        `Are you sure you want to delete database "${dbName}"? This action cannot be undone.`
      )
    )
      return;

    setDeletingDb(dbName);
    const result = await apiPost({ action: "deleteDatabase", dbName });
    setDeletingDb(null);
    if (handleApiResult(result)) {
      if (selectedWebsite) {
        fetchDatabases(selectedWebsite);
      }
      onRefresh();
    }
  }

  return (
    <div className="space-y-4">
      {/* Website selector + toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <select
            className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedWebsite}
            onChange={(e) => setSelectedWebsite(e.target.value)}
          >
            <option value="">-- Select Website --</option>
            {websites.map((w) => (
              <option key={w.domain} value={w.domain}>
                {w.domain}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={openCreate} disabled={websites.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Create Database
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Database Name</TableHead>
                <TableHead>Database User</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedWebsite ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <div className="text-center py-12">
                      <Database className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900">
                        Select a website
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Choose a website from the dropdown above to view its
                        databases
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : dbLoading ? (
                <SkeletonRows cols={3} rows={3} />
              ) : databases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <div className="text-center py-12">
                      <Database className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900">
                        No databases found
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Create a database for {selectedWebsite}
                      </p>
                      <Button size="sm" className="mt-4" onClick={openCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Database
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                databases.map((db) => (
                  <TableRow key={db.dbName}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-purple-500 flex-shrink-0" />
                        <code className="text-sm font-medium text-gray-900">
                          {db.dbName}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                        {db.dbUser || "--"}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete database"
                          disabled={deletingDb === db.dbName}
                          onClick={() => handleDelete(db.dbName)}
                        >
                          {deletingDb === db.dbName ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Database Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Create Database"
        description="Create a new MySQL database on CyberPanel"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Website <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formWebsite}
              onChange={(e) => setFormWebsite(e.target.value)}
              required
            >
              <option value="">-- Select Website --</option>
              {websites.map((w) => (
                <option key={w.domain} value={w.domain}>
                  {w.domain}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Database Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. myapp_db"
              value={formDbName}
              onChange={(e) => setFormDbName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Database Username <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. myapp_user"
              value={formDbUser}
              onChange={(e) => setFormDbUser(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Database Password <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter a strong password"
                value={formDbPassword}
                onChange={(e) => setFormDbPassword(e.target.value)}
                className="flex-1"
                required
              />
              <Button
                type="button"
                variant="outline"
                title="Generate random password"
                onClick={() => setFormDbPassword(generatePassword())}
              >
                <Key className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                !formWebsite ||
                !formDbName ||
                !formDbUser ||
                !formDbPassword
              }
            >
              {submitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Database
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// EMAIL TAB
// ══════════════════════════════════════════════════════════════

function EmailTab({
  websites,
  loading: parentLoading,
  onRefresh,
}: {
  websites: CyberPanelWebsite[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [selectedDomain, setSelectedDomain] = useState("");
  const [emails, setEmails] = useState<EmailAccount[]>([]);
  const [emailLoading, setEmailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

  // Create form
  const [formDomain, setFormDomain] = useState("");
  const [formUserName, setFormUserName] = useState("");
  const [formPassword, setFormPassword] = useState("");

  // Fetch email accounts when a domain is selected
  const fetchEmails = useCallback(async (domain: string) => {
    if (!domain) {
      setEmails([]);
      return;
    }
    setEmailLoading(true);
    try {
      const res = await fetch(
        `/api/admin/hosting?emails=${encodeURIComponent(domain)}`
      );
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to load email accounts");
        setEmails([]);
        return;
      }
      const data = await res.json();
      setEmails(Array.isArray(data.emails) ? data.emails : []);
    } catch {
      alert("Network error loading email accounts");
      setEmails([]);
    } finally {
      setEmailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      fetchEmails(selectedDomain);
    } else {
      setEmails([]);
    }
  }, [selectedDomain, fetchEmails]);

  function resetForm() {
    setFormDomain(selectedDomain || "");
    setFormUserName("");
    setFormPassword("");
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formDomain || !formUserName || !formPassword) return;
    setSubmitting(true);

    const result = await apiPost({
      action: "createEmail",
      domainName: formDomain,
      userName: formUserName,
      password: formPassword,
    });

    setSubmitting(false);
    if (handleApiResult(result)) {
      closeModal();
      if (selectedDomain === formDomain) {
        fetchEmails(selectedDomain);
      }
      onRefresh();
    }
  }

  async function handleDelete(email: string) {
    if (
      !confirm(
        `Are you sure you want to delete the email account "${email}"? This action cannot be undone.`
      )
    )
      return;

    setDeletingEmail(email);
    const result = await apiPost({ action: "deleteEmail", email });
    setDeletingEmail(null);
    if (handleApiResult(result)) {
      if (selectedDomain) {
        fetchEmails(selectedDomain);
      }
      onRefresh();
    }
  }

  return (
    <div className="space-y-4">
      {/* Domain selector + toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <select
            className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
          >
            <option value="">-- Select Domain --</option>
            {websites.map((w) => (
              <option key={w.domain} value={w.domain}>
                {w.domain}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={openCreate} disabled={websites.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Create Email
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedDomain ? (
                <TableRow>
                  <TableCell colSpan={2}>
                    <div className="text-center py-12">
                      <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900">
                        Select a domain
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Choose a domain from the dropdown above to view its
                        email accounts
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : emailLoading ? (
                <SkeletonRows cols={2} rows={3} />
              ) : emails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2}>
                    <div className="text-center py-12">
                      <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900">
                        No email accounts found
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Create an email account for {selectedDomain}
                      </p>
                      <Button size="sm" className="mt-4" onClick={openCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Email
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                emails.map((em) => (
                  <TableRow key={em.email}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900">
                          {em.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete email account"
                          disabled={deletingEmail === em.email}
                          onClick={() => handleDelete(em.email)}
                        >
                          {deletingEmail === em.email ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Email Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Create Email Account"
        description="Create a new email account on CyberPanel"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Domain <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formDomain}
              onChange={(e) => setFormDomain(e.target.value)}
              required
            >
              <option value="">-- Select Domain --</option>
              {websites.map((w) => (
                <option key={w.domain} value={w.domain}>
                  {w.domain}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="e.g. info"
                value={formUserName}
                onChange={(e) => setFormUserName(e.target.value)}
                className="flex-1"
                required
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">
                @{formDomain || "domain.com"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter a strong password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                className="flex-1"
                required
              />
              <Button
                type="button"
                variant="outline"
                title="Generate random password"
                onClick={() => setFormPassword(generatePassword())}
              >
                <Key className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                submitting || !formDomain || !formUserName || !formPassword
              }
            >
              {submitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Email
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
