"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe,
  ExternalLink,
  FolderOpen,
  Calendar,
  Loader2,
  RefreshCw,
  Search,
  Plus,
  Network,
  Database,
  HardDrive,
  Info,
  X,
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatDate, statusColor } from "@/lib/utils";

interface Website {
  id: string;
  domain: string;
  subdomain?: string;
  rootDirectory?: string;
  status: string;
  type: string;
  isActive: boolean;
  createdAt: string;
}

interface WebsiteStats {
  total: number;
  active: number;
  subdomains: number;
}

export default function CustomerWebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [stats, setStats] = useState<WebsiteStats>({
    total: 0,
    active: 0,
    subdomains: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDomain, setCreateDomain] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [detailWebsite, setDetailWebsite] = useState<Website | null>(null);

  useEffect(() => {
    fetchWebsites();
  }, []);

  async function fetchWebsites() {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/websites");
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (data.error) {
        console.error("API error:", data.error);
        return;
      }
      setWebsites(data.websites || []);
      setStats(data.stats || { total: 0, active: 0, subdomains: 0 });
    } catch (error) {
      console.error("Failed to fetch websites:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateWebsite(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/customer/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: createDomain }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create website");
        return;
      }
      setShowCreateModal(false);
      setCreateDomain("");
      fetchWebsites();
    } catch {
      setCreateError("Failed to create website");
    } finally {
      setCreating(false);
    }
  }

  const filtered = websites.filter(
    (w) =>
      w.domain.toLowerCase().includes(search.toLowerCase()) ||
      (w.subdomain && w.subdomain.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Websites</h1>
          <p className="text-gray-500 mt-1">
            View and manage your hosted websites.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchWebsites} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Website
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total Sites</p>
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
            <p className="text-2xl font-bold text-blue-600">{stats.subdomains}</p>
            <p className="text-xs text-gray-500">Subdomains</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search websites..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Website Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Globe className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              {search ? "No websites match your search" : "No websites yet"}
            </h3>
            <p className="text-gray-500 mt-1 text-sm">
              {search
                ? "Try a different search term."
                : "Your websites will appear here once provisioned by the admin."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((website) => (
            <Card
              key={website.id}
              className="hover:shadow-md transition-shadow group"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <Globe className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {website.domain}
                      </h3>
                      {website.subdomain && (
                        <p className="text-xs text-gray-400 truncate">
                          {website.subdomain}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="custom"
                    className={statusColor(String(website.status))}
                  >
                    {String(website.status)}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {website.rootDirectory || "/public_html"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>Created {formatDate(website.createdAt)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      window.open(`https://${website.domain}`, "_blank")
                    }
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Visit Site
                  </Button>
                  <Link href={`/dashboard/dns?domain=${website.domain}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Network className="h-3.5 w-3.5 mr-1.5" />
                      DNS
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setDetailWebsite(website)}
                  >
                    <Info className="h-3.5 w-3.5 mr-1.5" />
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Website Detail Modal */}
      <Modal
        open={!!detailWebsite}
        onClose={() => setDetailWebsite(null)}
        title="Website Details"
        description={detailWebsite?.domain || ""}
      >
        {detailWebsite && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Domain</p>
                <p className="text-sm font-medium text-gray-900">{detailWebsite.domain}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <Badge variant="custom" className={statusColor(String(detailWebsite.status))}>
                  {String(detailWebsite.status)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{detailWebsite.type || "main"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Root Directory</p>
                <p className="text-sm font-mono text-gray-900">{detailWebsite.rootDirectory || "/public_html"}</p>
              </div>
              {detailWebsite.subdomain && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Subdomain</p>
                  <p className="text-sm font-medium text-gray-900">{detailWebsite.subdomain}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm text-gray-900">{formatDate(detailWebsite.createdAt)}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-900 mb-3">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://${detailWebsite.domain}`, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Visit Site
                </Button>
                <Link href={`/dashboard/dns?domain=${detailWebsite.domain}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <Network className="h-3.5 w-3.5 mr-1.5" />
                    DNS Settings
                  </Button>
                </Link>
                <Link href="/dashboard/hosting">
                  <Button variant="outline" size="sm" className="w-full">
                    <HardDrive className="h-3.5 w-3.5 mr-1.5" />
                    Hosting Resources
                  </Button>
                </Link>
                <Link href="/dashboard/domains">
                  <Button variant="outline" size="sm" className="w-full">
                    <Globe className="h-3.5 w-3.5 mr-1.5" />
                    My Domains
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Website Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateError("");
        }}
        title="Create Website"
        description="Create a new website within your hosting allocation."
      >
        <form onSubmit={handleCreateWebsite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Domain Name
            </label>
            <Input
              placeholder="example.com"
              value={createDomain}
              onChange={(e) => setCreateDomain(e.target.value)}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter the domain you want to host. Make sure DNS points to your server.
            </p>
          </div>

          {createError && (
            <p className="text-sm text-red-600">{createError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setCreateError("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Website"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
