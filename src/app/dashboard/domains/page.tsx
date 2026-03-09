"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Layers,
  Shield,
  Lock,
  RefreshCw,
  Loader2,
  Settings,
  AlertTriangle,
  CheckCircle,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDate, statusColor } from "@/lib/utils";

interface Domain {
  id: string;
  domain: string;
  type: string;
  status: string;
  registeredAt: string | null;
  expiresAt: string | null;
  autoRenew: boolean;
  privacyEnabled: boolean;
  lockEnabled: boolean;
  createdAt: string;
}

interface DomainStats {
  total: number;
  active: number;
  expiringSoon: number;
}

export default function CustomerDomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [stats, setStats] = useState<DomainStats>({
    total: 0,
    active: 0,
    expiringSoon: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchDomains();
  }, []);

  async function fetchDomains() {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/domains");
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (data.error) {
        console.error("API error:", data.error);
        return;
      }
      setDomains(data.domains || []);
      setStats(data.stats || { total: 0, active: 0, expiringSoon: 0 });
    } catch (error) {
      console.error("Failed to fetch domains:", error);
    } finally {
      setLoading(false);
    }
  }

  function daysUntilExpiry(expiresAt: string | null): number | null {
    if (!expiresAt) return null;
    return Math.ceil(
      (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  }

  const filtered = domains.filter((d) =>
    d.domain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Domains</h1>
          <p className="text-gray-500 mt-1">
            Manage your registered domains and DNS settings.
          </p>
        </div>
        <Button variant="outline" onClick={fetchDomains} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total Domains</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
            <p className="text-xs text-gray-500">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {stats.expiringSoon}
            </p>
            <p className="text-xs text-gray-500">Expiring Soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search domains..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Domains Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            Domain Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                {search ? "No domains match your search" : "No domains yet"}
              </h3>
              <p className="text-gray-500 mt-1 text-sm">
                {search
                  ? "Try a different search term."
                  : "Your domains will appear here once assigned by the admin."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Protection</TableHead>
                  <TableHead>Auto-Renew</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((domain) => {
                  const days = daysUntilExpiry(domain.expiresAt);
                  const isExpiringSoon = days !== null && days > 0 && days <= 30;

                  return (
                    <TableRow key={domain.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                            <Layers className="h-4 w-4 text-violet-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {domain.domain}
                            </p>
                            <p className="text-xs text-gray-400 capitalize">
                              {domain.type.replace("_", " ")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="custom"
                          className={statusColor(domain.status)}
                        >
                          {domain.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {domain.expiresAt ? (
                          <div className="flex items-center gap-1.5">
                            {isExpiringSoon ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5 text-gray-400" />
                            )}
                            <span
                              className={
                                isExpiringSoon
                                  ? "text-amber-600 font-medium"
                                  : "text-gray-600"
                              }
                            >
                              {formatDate(domain.expiresAt)}
                            </span>
                            {isExpiringSoon && (
                              <span className="text-xs text-amber-500">
                                ({days}d)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {domain.privacyEnabled && (
                            <span
                              className="flex items-center gap-1 text-xs text-emerald-600"
                              title="Privacy Protection"
                            >
                              <Shield className="h-3.5 w-3.5" />
                              Privacy
                            </span>
                          )}
                          {domain.lockEnabled && (
                            <span
                              className="flex items-center gap-1 text-xs text-blue-600"
                              title="Domain Lock"
                            >
                              <Lock className="h-3.5 w-3.5" />
                              Locked
                            </span>
                          )}
                          {!domain.privacyEnabled && !domain.lockEnabled && (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={domain.autoRenew ? "success" : "warning"}
                        >
                          {domain.autoRenew ? "On" : "Off"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/dns?domain=${encodeURIComponent(domain.domain)}`}
                        >
                          <Button variant="outline" size="sm">
                            <Settings className="h-3.5 w-3.5 mr-1.5" />
                            DNS
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
