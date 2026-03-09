"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  HardDrive,
  Database,
  Mail,
  FolderOpen,
  Globe,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  Key,
  Server,
} from "lucide-react";

interface HostingAccount {
  id: string;
  domain: string;
  package: string;
  status: string;
  createdAt: string;
}

type TabId = "databases" | "email" | "ftp";

function generatePassword() {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

export default function CustomerHostingPage() {
  const [accounts, setAccounts] = useState<HostingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("databases");

  // Sub-resource state
  const [databases, setDatabases] = useState<Record<string, unknown>[]>([]);
  const [emails, setEmails] = useState<Record<string, unknown>[]>([]);
  const [ftpAccounts, setFtpAccounts] = useState<Record<string, unknown>[]>([]);
  const [subLoading, setSubLoading] = useState(false);

  // Modals
  const [showDbModal, setShowDbModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showFtpModal, setShowFtpModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // Form fields
  const [dbName, setDbName] = useState("");
  const [dbUser, setDbUser] = useState("");
  const [dbPass, setDbPass] = useState("");
  const [emailUser, setEmailUser] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [ftpUser, setFtpUser] = useState("");
  const [ftpPass, setFtpPass] = useState("");
  const [ftpPath, setFtpPath] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      fetchSubResources();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDomain, activeTab]);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/hosting");
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      const accts = data.accounts || [];
      setAccounts(accts);
      if (accts.length > 0 && !selectedDomain) {
        setSelectedDomain(accts[0].domain);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function fetchSubResources() {
    if (!selectedDomain) return;
    setSubLoading(true);
    try {
      const param =
        activeTab === "databases"
          ? "databases"
          : activeTab === "email"
            ? "emails"
            : "ftp";
      const res = await fetch(
        `/api/customer/hosting?${param}=${selectedDomain}`
      );
      if (res.ok) {
        const data = await res.json();
        if (activeTab === "databases") setDatabases(data.databases || []);
        else if (activeTab === "email") setEmails(data.emails || []);
        else setFtpAccounts(data.ftp || []);
      }
    } catch {
      // ignore
    } finally {
      setSubLoading(false);
    }
  }

  async function apiAction(body: Record<string, unknown>) {
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch("/api/customer/hosting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Operation failed");
        return false;
      }
      return true;
    } catch {
      setActionError("Network error");
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateDb(e: React.FormEvent) {
    e.preventDefault();
    const ok = await apiAction({
      action: "createDatabase",
      domainName: selectedDomain,
      dbName,
      dbUsername: dbUser,
      dbPassword: dbPass,
    });
    if (ok) {
      setShowDbModal(false);
      setDbName("");
      setDbUser("");
      setDbPass("");
      fetchSubResources();
    }
  }

  async function handleDeleteDb(name: string) {
    if (!confirm(`Delete database "${name}"?`)) return;
    const ok = await apiAction({
      action: "deleteDatabase",
      domainName: selectedDomain,
      dbName: name,
    });
    if (ok) fetchSubResources();
  }

  async function handleCreateEmail(e: React.FormEvent) {
    e.preventDefault();
    const ok = await apiAction({
      action: "createEmail",
      domainName: selectedDomain,
      userName: emailUser,
      password: emailPass,
    });
    if (ok) {
      setShowEmailModal(false);
      setEmailUser("");
      setEmailPass("");
      fetchSubResources();
    }
  }

  async function handleDeleteEmail(addr: string) {
    if (!confirm(`Delete email "${addr}"?`)) return;
    const ok = await apiAction({
      action: "deleteEmail",
      domainName: selectedDomain,
      email: addr,
    });
    if (ok) fetchSubResources();
  }

  async function handleCreateFtp(e: React.FormEvent) {
    e.preventDefault();
    const ok = await apiAction({
      action: "createFtp",
      domainName: selectedDomain,
      userName: ftpUser,
      password: ftpPass,
      path: ftpPath || undefined,
    });
    if (ok) {
      setShowFtpModal(false);
      setFtpUser("");
      setFtpPass("");
      setFtpPath("");
      fetchSubResources();
    }
  }

  async function handleDeleteFtp(username: string) {
    if (!confirm(`Delete FTP account "${username}"?`)) return;
    const ok = await apiAction({
      action: "deleteFtp",
      domainName: selectedDomain,
      ftpUsername: username,
    });
    if (ok) fetchSubResources();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hosting</h1>
          <p className="text-gray-500 mt-1">
            Manage databases, email, and FTP for your websites.
          </p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hosting</h1>
          <p className="text-gray-500 mt-1">
            Manage databases, email, and FTP for your websites.
          </p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Server className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              No hosting accounts
            </h3>
            <p className="text-gray-500 mt-1 text-sm">
              Your hosting accounts will appear here once assigned by the admin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "databases", label: "Databases", icon: Database },
    { id: "email", label: "Email", icon: Mail },
    { id: "ftp", label: "FTP", icon: FolderOpen },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hosting</h1>
          <p className="text-gray-500 mt-1">
            Manage databases, email, and FTP for your websites.
          </p>
        </div>
        <Button variant="outline" onClick={fetchSubResources} disabled={subLoading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${subLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Hosting Accounts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <Card
            key={acc.id}
            className={`cursor-pointer transition-all ${
              selectedDomain === acc.domain
                ? "ring-2 ring-indigo-500 shadow-md"
                : "hover:shadow-md"
            }`}
            onClick={() => setSelectedDomain(acc.domain)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate text-sm">
                      {acc.domain}
                    </p>
                    <p className="text-xs text-gray-500">{acc.package}</p>
                  </div>
                </div>
                <Badge
                  variant="custom"
                  className={
                    acc.status === "active"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800"
                  }
                >
                  {acc.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="outline"
            size="sm"
            className={
              activeTab === tab.id
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="h-4 w-4 mr-1.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "databases" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-5 w-5 text-purple-500" />
              Databases — {selectedDomain}
            </CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setActionError("");
                setShowDbModal(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Database
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {subLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : databases.length === 0 ? (
              <div className="text-center py-12">
                <Database className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No databases yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Database Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {databases.map((db, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <code className="text-sm font-medium">
                          {String(db.dbName || db.name || "")}
                        </code>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {String(db.dbUser || db.username || "")}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() =>
                            handleDeleteDb(
                              String(db.dbName || db.name || "")
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "email" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-5 w-5 text-amber-500" />
              Email Accounts — {selectedDomain}
            </CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setActionError("");
                setShowEmailModal(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Email
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {subLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : emails.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No email accounts yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email Address</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((em, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-medium">
                            {String(em.email || em.address || "")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() =>
                            handleDeleteEmail(
                              String(em.email || em.address || "")
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "ftp" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="h-5 w-5 text-emerald-500" />
              FTP Accounts — {selectedDomain}
            </CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setActionError("");
                setShowFtpModal(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create FTP
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {subLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : ftpAccounts.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No FTP accounts yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ftpAccounts.map((ft, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <code className="text-sm font-medium">
                          {String(ft.username || ft.ftpUser || "")}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {String(ft.path || ft.directory || "/")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() =>
                            handleDeleteFtp(
                              String(ft.username || ft.ftpUser || "")
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Database Modal */}
      <Modal
        open={showDbModal}
        onClose={() => setShowDbModal(false)}
        title="Create Database"
        description={`Create a new MySQL database for ${selectedDomain}`}
      >
        <form onSubmit={handleCreateDb} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Database Name
            </label>
            <Input
              placeholder="mydb"
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <Input
              placeholder="dbuser"
              value={dbUser}
              onChange={(e) => setDbUser(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Strong password"
                value={dbPass}
                onChange={(e) => setDbPass(e.target.value)}
                required
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDbPass(generatePassword())}
              >
                <Key className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {actionError && (
            <p className="text-sm text-red-600">{actionError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDbModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Email Modal */}
      <Modal
        open={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Create Email Account"
        description={`Create a new email account for ${selectedDomain}`}
      >
        <form onSubmit={handleCreateEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="user"
                value={emailUser}
                onChange={(e) => setEmailUser(e.target.value)}
                required
                className="flex-1"
              />
              <span className="text-sm text-gray-500 shrink-0">
                @{selectedDomain}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Strong password"
                value={emailPass}
                onChange={(e) => setEmailPass(e.target.value)}
                required
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEmailPass(generatePassword())}
              >
                <Key className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {actionError && (
            <p className="text-sm text-red-600">{actionError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEmailModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create FTP Modal */}
      <Modal
        open={showFtpModal}
        onClose={() => setShowFtpModal(false)}
        title="Create FTP Account"
        description={`Create a new FTP account for ${selectedDomain}`}
      >
        <form onSubmit={handleCreateFtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <Input
              placeholder="ftpuser"
              value={ftpUser}
              onChange={(e) => setFtpUser(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Strong password"
                value={ftpPass}
                onChange={(e) => setFtpPass(e.target.value)}
                required
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFtpPass(generatePassword())}
              >
                <Key className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Path (optional)
            </label>
            <Input
              placeholder="/home/domain.com/public_html"
              value={ftpPath}
              onChange={(e) => setFtpPath(e.target.value)}
            />
          </div>
          {actionError && (
            <p className="text-sm text-red-600">{actionError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFtpModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
