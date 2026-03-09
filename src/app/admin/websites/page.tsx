"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Globe,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  ChevronDown,
  ExternalLink,
  FolderOpen,
  RefreshCw,
  Rocket,
  FileCode,
  Server,
  MapPin,
  Info,
  Users,
} from "lucide-react";
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
import { formatDate, statusColor } from "@/lib/utils";

interface Owner {
  id: string;
  name: string;
  email: string;
}

interface Website {
  domain: string;
  subdomain?: string;
  type?: string;
  vhost_type?: string;
  status?: string;
  is_enabled?: boolean;
  parent_domain?: string;
  root_directory?: string;
  rootDirectory?: string;
  order_id?: number;
  username?: string;
  client_id?: number;
  created_at?: string;
  localId?: string;
  owner?: Owner | null;
  userId?: string | null;
  localCreatedAt?: string;
}

interface Stats {
  total: number;
  active: number;
  subdomains: number;
  addon: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface Datacenter {
  title: string;
  code: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

function SkeletonRow() {
  return (
    <TableRow>
      {[...Array(9)].map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full max-w-[120px]" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// Region color mapping for datacenter badges
function regionColor(code: string): string {
  const map: Record<string, string> = {
    mumbai: "bg-orange-100 text-orange-800",
    singapore: "bg-pink-100 text-pink-800",
    "sao-paulo": "bg-green-100 text-green-800",
    london: "bg-blue-100 text-blue-800",
    amsterdam: "bg-indigo-100 text-indigo-800",
    frankfurt: "bg-yellow-100 text-yellow-800",
    vilnius: "bg-emerald-100 text-emerald-800",
    "new-york": "bg-red-100 text-red-800",
    dallas: "bg-amber-100 text-amber-800",
    "los-angeles": "bg-violet-100 text-violet-800",
    sydney: "bg-teal-100 text-teal-800",
  };
  return map[code] || "bg-gray-100 text-gray-800";
}

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    subdomains: 0,
    addon: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deployMenu, setDeployMenu] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState<Website | null>(null);
  const [assignCustomer, setAssignCustomer] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Datacenter state
  const [datacenters, setDatacenters] = useState<Datacenter[]>([]);
  const [datacentersLoading, setDatacentersLoading] = useState(false);
  const [datacentersLoaded, setDatacentersLoaded] = useState(false);
  const [datacenterModalOpen, setDatacenterModalOpen] = useState(false);

  // Form state
  const [formDomain, setFormDomain] = useState("");
  const [formCustomer, setFormCustomer] = useState("");
  const [formOrderId, setFormOrderId] = useState("1005560611");
  const [formDatacenter, setFormDatacenter] = useState("");

  const fetchWebsites = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/websites");
      if (res.ok) {
        const data = await res.json();
        setWebsites(data.websites || []);
        setStats(
          data.stats || { total: 0, active: 0, subdomains: 0, addon: 0 }
        );
      }
    } catch {
      // Network error
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/customers?limit=100");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch {
      // Network error
    }
  }, []);

  const fetchDatacenters = useCallback(async () => {
    if (datacentersLoaded) return;
    setDatacentersLoading(true);
    try {
      const res = await fetch("/api/admin/websites/datacenters");
      if (res.ok) {
        const data = await res.json();
        setDatacenters(data.datacenters || []);
        setDatacentersLoaded(true);
      }
    } catch {
      // Network error
    } finally {
      setDatacentersLoading(false);
    }
  }, [datacentersLoaded]);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  useEffect(() => {
    if (modalOpen || assignModal) {
      fetchCustomers();
    }
    if (modalOpen) {
      fetchDatacenters();
    }
  }, [modalOpen, assignModal, fetchCustomers, fetchDatacenters]);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignModal) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/admin/websites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: assignModal.domain,
          userId: assignCustomer || null,
          order_id: assignModal.order_id,
        }),
      });
      if (res.ok) {
        setAssignModal(null);
        setAssignCustomer("");
        fetchWebsites();
      }
    } catch {
      // error
    } finally {
      setAssigning(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: formDomain,
          order_id: Number(formOrderId),
          userId: formCustomer || undefined,
          datacenter_code: formDatacenter || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create website");
        return;
      }

      setModalOpen(false);
      setFormDomain("");
      setFormCustomer("");
      setFormOrderId("1005560611");
      setFormDatacenter("");
      fetchWebsites();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeploy(domain: string, type: string) {
    setDeployMenu(null);
    // In a real app, this would trigger a deploy action
    alert(`Deploying ${type} to ${domain}. This would call the deploy API.`);
  }

  const filtered = websites.filter(
    (w) =>
      !search ||
      w.domain?.toLowerCase().includes(search.toLowerCase()) ||
      w.owner?.name?.toLowerCase().includes(search.toLowerCase()) ||
      w.owner?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const statCards = [
    {
      label: "Total Websites",
      value: stats.total,
      icon: Globe,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Active",
      value: stats.active,
      icon: Globe,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Subdomains",
      value: stats.subdomains,
      icon: FolderOpen,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Addon Domains",
      value: stats.addon,
      icon: ExternalLink,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Websites</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all hosted websites and deployments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              fetchDatacenters();
              setDatacenterModalOpen(true);
            }}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Datacenters
          </Button>
          <Button variant="outline" onClick={fetchWebsites} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Website
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? (
                      <span className="inline-block h-7 w-12 bg-gray-200 rounded animate-pulse" />
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by domain, owner name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Websites Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Parent Domain</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Root Directory</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="text-center py-12">
                      <Globe className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900">
                        {search
                          ? "No websites found"
                          : "No websites yet"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {search
                          ? "Try adjusting your search terms"
                          : "Add your first website to get started"}
                      </p>
                      {!search && (
                        <Button
                          size="sm"
                          className="mt-4"
                          onClick={() => setModalOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Website
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((website, idx) => {
                  const wType = (website.type || "main").toLowerCase();
                  const typeBadge =
                    wType === "subdomain"
                      ? "bg-blue-100 text-blue-800"
                      : wType === "addon"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800";

                  return (
                    <TableRow key={`${website.domain}-${idx}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900">
                            {website.domain}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="custom" className={typeBadge}>
                          {wType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {website.parent_domain || (
                          <span className="text-gray-300">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {website.owner ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {website.owner.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {website.owner.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-300">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                          {website.rootDirectory ||
                            website.root_directory ||
                            "/public_html"}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="custom"
                          className={statusColor(
                            website.status || "active"
                          )}
                        >
                          {website.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {website.created_at || website.localCreatedAt
                          ? formatDate(
                              website.created_at ||
                                website.localCreatedAt ||
                                ""
                            )
                          : "--"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 relative">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAssignModal(website);
                              setAssignCustomer(website.userId || "");
                            }}
                            title="Assign to customer"
                          >
                            <Users className="h-3.5 w-3.5 mr-1" />
                            {website.owner ? "Reassign" : "Assign"}
                          </Button>
                          <a
                            href={`https://${website.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Visit Site"
                            >
                              <ExternalLink className="h-4 w-4 text-gray-500" />
                            </Button>
                          </a>

                          {/* Deploy Dropdown */}
                          <div className="relative">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setDeployMenu(
                                  deployMenu === website.domain
                                    ? null
                                    : website.domain
                                )
                              }
                            >
                              <Rocket className="h-3.5 w-3.5 mr-1" />
                              Deploy
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>

                            {deployMenu === website.domain && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setDeployMenu(null)}
                                />
                                <div className="absolute right-0 top-full mt-1 z-20 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    onClick={() =>
                                      handleDeploy(
                                        website.domain,
                                        "WordPress"
                                      )
                                    }
                                  >
                                    <Globe className="h-4 w-4 text-blue-500" />
                                    Deploy WordPress
                                  </button>
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    onClick={() =>
                                      handleDeploy(
                                        website.domain,
                                        "Static Site"
                                      )
                                    }
                                  >
                                    <FileCode className="h-4 w-4 text-emerald-500" />
                                    Deploy Static Site
                                  </button>
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    onClick={() =>
                                      handleDeploy(
                                        website.domain,
                                        "Node.js App"
                                      )
                                    }
                                  >
                                    <Server className="h-4 w-4 text-green-500" />
                                    Deploy Node.js App
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
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

      {/* Add Website Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setFormDomain("");
          setFormCustomer("");
          setFormOrderId("1005560611");
          setFormDatacenter("");
          setError(null);
        }}
        title="Add Website"
        description="Create a new website on Hostinger and assign it to a customer"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Domain <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="example.com"
              value={formDomain}
              onChange={(e) => setFormDomain(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Assign to Customer
            </label>
            <select
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={formCustomer}
              onChange={(e) => setFormCustomer(e.target.value)}
            >
              <option value="">-- Select Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Datacenter
            </label>
            {datacentersLoading ? (
              <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-gray-300 bg-gray-50">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">Loading datacenters...</span>
              </div>
            ) : (
              <select
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={formDatacenter}
                onChange={(e) => setFormDatacenter(e.target.value)}
              >
                <option value="">-- Auto (nearest) --</option>
                {datacenters.map((dc) => (
                  <option key={dc.code} value={dc.code}>
                    {dc.title} ({dc.code})
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Choose a datacenter location for the website. Leave empty for automatic selection.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Order ID <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="1005560611"
              value={formOrderId}
              onChange={(e) => setFormOrderId(e.target.value)}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Hostinger hosting order ID
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setFormDomain("");
                setFormCustomer("");
                setFormOrderId("1005560611");
                setFormDatacenter("");
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Website
            </Button>
          </div>
        </form>
      </Modal>

      {/* Datacenters Modal */}
      <Modal
        open={datacenterModalOpen}
        onClose={() => setDatacenterModalOpen(false)}
        title="Hosting Datacenters"
        description="Available datacenter locations for hosting deployments"
        className="max-w-2xl"
      >
        {datacentersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-3" />
            <span className="text-sm text-gray-500">Loading datacenters...</span>
          </div>
        ) : datacenters.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">
              No datacenters available
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Datacenter information could not be loaded.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                {datacenters.length} datacenter locations available worldwide.
                Select a datacenter closest to your target audience for best performance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {datacenters.map((dc) => (
                <div
                  key={dc.code}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
                >
                  <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                    <MapPin className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {dc.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant="custom"
                        className={`text-[10px] px-1.5 py-0 ${regionColor(dc.code)}`}
                      >
                        {dc.code}
                      </Badge>
                      {dc.coordinates && (
                        <span className="text-[10px] text-gray-400">
                          {dc.coordinates.latitude.toFixed(2)}, {dc.coordinates.longitude.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Assign Customer Modal */}
      <Modal
        open={!!assignModal}
        onClose={() => {
          setAssignModal(null);
          setAssignCustomer("");
        }}
        title={`Assign Website — ${assignModal?.domain || ""}`}
        description="Assign this website to a customer so it appears in their dashboard"
      >
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Customer
            </label>
            <select
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={assignCustomer}
              onChange={(e) => setAssignCustomer(e.target.value)}
            >
              <option value="">-- Unassigned --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Select a customer to assign this website to, or leave empty to unassign.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAssignModal(null);
                setAssignCustomer("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={assigning}>
              {assigning && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {assignCustomer ? "Assign" : "Unassign"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
