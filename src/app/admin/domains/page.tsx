"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Globe,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  Lock,
  Unlock,
  Shield,
  ShieldOff,
  Pencil,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Trash2,
  User,
  Building,
  Mail,
  MapPin,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

// ==================== TYPES ====================

interface Owner {
  id: string;
  name: string;
  email: string;
}

interface DomainItem {
  domain: string;
  type?: string;
  status?: string;
  registered_at?: string;
  expires_at?: string;
  auto_renew?: boolean;
  privacy_protection?: boolean;
  domain_lock?: boolean;
  nameservers?: string[];
  localId?: string;
  owner?: Owner | null;
  userId?: string | null;
  autoRenew?: boolean;
  privacyEnabled?: boolean;
  lockEnabled?: boolean;
}

interface Stats {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
}

interface AvailabilityResult {
  domain: string;
  available: boolean;
  price?: number;
  currency?: string;
  tld?: string;
}

interface ForwardingConfig {
  domain: string | null;
  redirect_type: string;
  redirect_url: string;
  created_at: string;
  updated_at: string | null;
}

interface WhoisDetails {
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  address: string;
  city: string;
  state_in: string;
  country_code: string;
  zip_in: string;
  phone_cc: string;
  phone_number: string;
}

interface WhoisProfile {
  id: number;
  tld: string;
  country: string;
  entity_type: string;
  whois_details: WhoisDetails;
  tld_details: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
}

// ==================== SKELETON ====================

function SkeletonRow() {
  return (
    <TableRow>
      {[...Array(10)].map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full max-w-[100px]" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ==================== MAIN PAGE ====================

type PageTab = "domains" | "forwarding" | "whois";

export default function DomainsPage() {
  const [pageTab, setPageTab] = useState<PageTab>("domains");

  // Domain list state
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    expiringSoon: 0,
    expired: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "expired">(
    "all"
  );

  // Register Domain modal
  const [registerOpen, setRegisterOpen] = useState(false);
  const [searchDomain, setSearchDomain] = useState("");
  const [searchingDomain, setSearchingDomain] = useState(false);
  const [availabilityResults, setAvailabilityResults] = useState<
    AvailabilityResult[]
  >([]);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Nameservers modal
  const [nsModalOpen, setNsModalOpen] = useState(false);
  const [nsModalDomain, setNsModalDomain] = useState("");
  const [ns1, setNs1] = useState("");
  const [ns2, setNs2] = useState("");
  const [ns3, setNs3] = useState("");
  const [ns4, setNs4] = useState("");
  const [savingNs, setSavingNs] = useState(false);

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Assign state
  const [assignModal, setAssignModal] = useState<DomainItem | null>(null);
  const [assignCustomer, setAssignCustomer] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string; email: string }[]>([]);

  // ==================== FORWARDING STATE ====================
  const [fwdDomain, setFwdDomain] = useState("");
  const [fwdLoading, setFwdLoading] = useState(false);
  const [fwdConfig, setFwdConfig] = useState<ForwardingConfig | null>(null);
  const [fwdError, setFwdError] = useState<string | null>(null);
  const [fwdUrl, setFwdUrl] = useState("");
  const [fwdType, setFwdType] = useState<"301" | "302">("301");
  const [fwdSaving, setFwdSaving] = useState(false);
  const [fwdDeleting, setFwdDeleting] = useState(false);
  const [fwdSuccess, setFwdSuccess] = useState<string | null>(null);

  // ==================== WHOIS STATE ====================
  const [whoisProfiles, setWhoisProfiles] = useState<WhoisProfile[]>([]);
  const [whoisLoading, setWhoisLoading] = useState(false);
  const [whoisError, setWhoisError] = useState<string | null>(null);
  const [whoisDetailModal, setWhoisDetailModal] = useState(false);
  const [whoisSelectedProfile, setWhoisSelectedProfile] =
    useState<WhoisProfile | null>(null);
  const [whoisUsage, setWhoisUsage] = useState<string[]>([]);
  const [whoisUsageLoading, setWhoisUsageLoading] = useState(false);
  const [whoisCreateModal, setWhoisCreateModal] = useState(false);
  const [whoisDeleting, setWhoisDeleting] = useState<number | null>(null);
  const [whoisCreating, setWhoisCreating] = useState(false);
  const [whoisCreateError, setWhoisCreateError] = useState<string | null>(null);

  // WHOIS create form
  const [whoisForm, setWhoisForm] = useState({
    tld: "",
    entity_type: "individual",
    country: "",
    first_name: "",
    last_name: "",
    email: "",
    company_name: "",
    address: "",
    city: "",
    state_in: "",
    country_code: "",
    zip_in: "",
    phone_cc: "",
    phone_number: "",
  });

  // ==================== DOMAIN FETCHING ====================

  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/domains");
      if (res.ok) {
        const data = await res.json();
        // Deduplicate by domain name (API may return overlapping Hostinger + local entries)
        const raw = data.domains || [];
        const seen = new Set<string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unique = raw.filter((d: any) => {
          if (seen.has(d.domain)) return false;
          seen.add(d.domain);
          return true;
        });
        setDomains(unique);
        setStats(
          data.stats || {
            total: 0,
            active: 0,
            expiringSoon: 0,
            expired: 0,
          }
        );
      }
    } catch {
      // Network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  useEffect(() => {
    if (assignModal) {
      fetch("/api/admin/customers?limit=100")
        .then((r) => r.json())
        .then((d) => setCustomers(d.customers || []))
        .catch(() => {});
    }
  }, [assignModal]);

  async function handleAssignDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!assignModal) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/admin/domains", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: assignModal.domain,
          userId: assignCustomer || null,
        }),
      });
      if (res.ok) {
        setAssignModal(null);
        setAssignCustomer("");
        fetchDomains();
      }
    } catch {
      // error
    } finally {
      setAssigning(false);
    }
  }

  // ==================== FORWARDING FUNCTIONS ====================

  async function handleFetchForwarding() {
    if (!fwdDomain.trim()) return;
    setFwdLoading(true);
    setFwdConfig(null);
    setFwdError(null);
    setFwdSuccess(null);

    try {
      const res = await fetch(
        `/api/admin/domains/forwarding?domain=${encodeURIComponent(fwdDomain.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setFwdError(data.error || "Failed to fetch forwarding config");
        return;
      }
      setFwdConfig(data);
      if (data.redirect_url) {
        setFwdUrl(data.redirect_url);
        setFwdType(data.redirect_type === "302" ? "302" : "301");
      } else {
        setFwdUrl("");
        setFwdType("301");
      }
    } catch {
      setFwdError("Network error. Please try again.");
    } finally {
      setFwdLoading(false);
    }
  }

  async function handleSaveForwarding(e: React.FormEvent) {
    e.preventDefault();
    if (!fwdDomain.trim() || !fwdUrl.trim()) return;
    setFwdSaving(true);
    setFwdError(null);
    setFwdSuccess(null);

    try {
      const res = await fetch("/api/admin/domains/forwarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: fwdDomain.trim(),
          url: fwdUrl.trim(),
          redirect_type: fwdType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFwdError(data.error || "Failed to create forwarding");
        return;
      }
      setFwdSuccess("Forwarding configured successfully");
      // Re-fetch to show updated config
      handleFetchForwarding();
    } catch {
      setFwdError("Network error. Please try again.");
    } finally {
      setFwdSaving(false);
    }
  }

  async function handleDeleteForwarding() {
    if (!fwdDomain.trim()) return;
    setFwdDeleting(true);
    setFwdError(null);
    setFwdSuccess(null);

    try {
      const res = await fetch("/api/admin/domains/forwarding", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: fwdDomain.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFwdError(data.error || "Failed to delete forwarding");
        return;
      }
      setFwdSuccess("Forwarding removed successfully");
      setFwdConfig(null);
      setFwdUrl("");
      setFwdType("301");
    } catch {
      setFwdError("Network error. Please try again.");
    } finally {
      setFwdDeleting(false);
    }
  }

  // ==================== WHOIS FUNCTIONS ====================

  const fetchWhoisProfiles = useCallback(async () => {
    setWhoisLoading(true);
    setWhoisError(null);

    try {
      const res = await fetch("/api/admin/domains/whois");
      const data = await res.json();
      if (!res.ok) {
        setWhoisError(data.error || "Failed to fetch WHOIS profiles");
        return;
      }
      setWhoisProfiles(data.profiles || []);
    } catch {
      setWhoisError("Network error. Please try again.");
    } finally {
      setWhoisLoading(false);
    }
  }, []);

  useEffect(() => {
    if (pageTab === "whois") {
      fetchWhoisProfiles();
    }
  }, [pageTab, fetchWhoisProfiles]);

  async function handleViewWhoisProfile(profile: WhoisProfile) {
    setWhoisSelectedProfile(profile);
    setWhoisUsage([]);
    setWhoisDetailModal(true);
    setWhoisUsageLoading(true);

    try {
      const res = await fetch(
        `/api/admin/domains/whois?whois_id=${profile.id}`
      );
      const data = await res.json();
      if (res.ok && data.usage) {
        const usageList = Array.isArray(data.usage)
          ? data.usage.map((u: Record<string, unknown>) =>
              typeof u === "string" ? u : (u.domain as string) || JSON.stringify(u)
            )
          : [];
        setWhoisUsage(usageList);
      }
    } catch {
      // Usage fetch failed silently
    } finally {
      setWhoisUsageLoading(false);
    }
  }

  async function handleDeleteWhois(id: number) {
    setWhoisDeleting(id);
    setWhoisError(null);

    try {
      const res = await fetch("/api/admin/domains/whois", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWhoisError(data.error || "Failed to delete WHOIS profile");
        return;
      }
      setWhoisProfiles((prev) => prev.filter((p) => p.id !== id));
      if (whoisSelectedProfile?.id === id) {
        setWhoisDetailModal(false);
        setWhoisSelectedProfile(null);
      }
    } catch {
      setWhoisError("Network error. Please try again.");
    } finally {
      setWhoisDeleting(null);
    }
  }

  async function handleCreateWhois(e: React.FormEvent) {
    e.preventDefault();
    setWhoisCreating(true);
    setWhoisCreateError(null);

    try {
      const payload = {
        tld: whoisForm.tld,
        entity_type: whoisForm.entity_type,
        country: whoisForm.country,
        whois_details: {
          first_name: whoisForm.first_name,
          last_name: whoisForm.last_name,
          email: whoisForm.email,
          company_name: whoisForm.company_name,
          address: whoisForm.address,
          city: whoisForm.city,
          state_in: whoisForm.state_in,
          country_code: whoisForm.country_code,
          zip_in: whoisForm.zip_in,
          phone_cc: whoisForm.phone_cc,
          phone_number: whoisForm.phone_number,
        },
      };

      const res = await fetch("/api/admin/domains/whois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setWhoisCreateError(data.error || "Failed to create WHOIS profile");
        return;
      }
      setWhoisCreateModal(false);
      resetWhoisForm();
      fetchWhoisProfiles();
    } catch {
      setWhoisCreateError("Network error. Please try again.");
    } finally {
      setWhoisCreating(false);
    }
  }

  function resetWhoisForm() {
    setWhoisForm({
      tld: "",
      entity_type: "individual",
      country: "",
      first_name: "",
      last_name: "",
      email: "",
      company_name: "",
      address: "",
      city: "",
      state_in: "",
      country_code: "",
      zip_in: "",
      phone_cc: "",
      phone_number: "",
    });
    setWhoisCreateError(null);
  }

  // ==================== DOMAIN ACTION HANDLERS ====================

  async function handleCheckAvailability(e: React.FormEvent) {
    e.preventDefault();
    if (!searchDomain.trim()) return;

    setSearchingDomain(true);
    setAvailabilityResults([]);
    setRegisterError(null);

    try {
      const baseDomain = searchDomain.replace(/\..+$/, "");
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check",
          domain: baseDomain,
          tlds: [".com", ".net", ".org", ".io", ".dev", ".in"],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRegisterError(data.error || "Failed to check availability");
        return;
      }

      const results = Array.isArray(data.results) ? data.results : [];
      setAvailabilityResults(results);
    } catch {
      setRegisterError("Network error. Please try again.");
    } finally {
      setSearchingDomain(false);
    }
  }

  async function handleRegisterDomain(domainName: string) {
    setRegistering(true);
    setRegisterError(null);

    try {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          domain: domainName,
          whois_id: 1,
          payment_method_id: 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRegisterError(data.error || "Failed to register domain");
        return;
      }

      setRegisterOpen(false);
      setSearchDomain("");
      setAvailabilityResults([]);
      fetchDomains();
    } catch {
      setRegisterError("Network error. Please try again.");
    } finally {
      setRegistering(false);
    }
  }

  async function handleToggleLock(domain: string, currentlyLocked: boolean) {
    setActionLoading(`lock-${domain}`);
    try {
      await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: currentlyLocked ? "unlock" : "lock",
          domain,
        }),
      });
      fetchDomains();
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(null);
    }
  }

  async function handleTogglePrivacy(
    domain: string,
    currentlyEnabled: boolean
  ) {
    setActionLoading(`privacy-${domain}`);
    try {
      await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: currentlyEnabled ? "disable_privacy" : "enable_privacy",
          domain,
        }),
      });
      fetchDomains();
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveNameservers(e: React.FormEvent) {
    e.preventDefault();
    setSavingNs(true);
    try {
      await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "nameservers",
          domain: nsModalDomain,
          ns1,
          ns2,
          ns3: ns3 || undefined,
          ns4: ns4 || undefined,
        }),
      });
      setNsModalOpen(false);
      fetchDomains();
    } catch {
      // Error handled silently
    } finally {
      setSavingNs(false);
    }
  }

  function openNsModal(domain: DomainItem) {
    setNsModalDomain(domain.domain);
    const ns = domain.nameservers || [];
    setNs1(ns[0] || "");
    setNs2(ns[1] || "");
    setNs3(ns[2] || "");
    setNs4(ns[3] || "");
    setNsModalOpen(true);
  }

  // ==================== FILTERS ====================

  const filtered = domains.filter((d) => {
    const matchesSearch =
      !search ||
      d.domain.toLowerCase().includes(search.toLowerCase()) ||
      d.owner?.name?.toLowerCase().includes(search.toLowerCase());

    const st = (d.status || "").toLowerCase();
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && st === "active") ||
      (activeTab === "expired" && st === "expired");

    return matchesSearch && matchesTab;
  });

  const domainSubTabs = [
    { key: "all" as const, label: "All Domains", count: stats.total },
    { key: "active" as const, label: "Active", count: stats.active },
    { key: "expired" as const, label: "Expired", count: stats.expired },
  ];

  const statCards = [
    {
      label: "Total Domains",
      value: stats.total,
      icon: Globe,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Active",
      value: stats.active,
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Expiring Soon",
      value: stats.expiringSoon,
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Expired",
      value: stats.expired,
      icon: XCircle,
      color: "text-red-600 bg-red-50",
    },
  ];

  const pageTabs: { key: PageTab; label: string }[] = [
    { key: "domains", label: "All Domains" },
    { key: "forwarding", label: "Forwarding" },
    { key: "whois", label: "WHOIS Profiles" },
  ];

  // ==================== RENDER ====================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Domains</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage domain portfolio, registrations, forwarding, and WHOIS
            profiles
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (pageTab === "domains") fetchDomains();
              if (pageTab === "whois") fetchWhoisProfiles();
            }}
            disabled={loading || whoisLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading || whoisLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {pageTab === "domains" && (
            <Button onClick={() => setRegisterOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Register Domain
            </Button>
          )}
          {pageTab === "whois" && (
            <Button onClick={() => setWhoisCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New WHOIS Profile
            </Button>
          )}
        </div>
      </div>

      {/* Page Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {pageTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPageTab(tab.key)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                pageTab === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ==================== DOMAINS TAB ==================== */}
      {pageTab === "domains" && (
        <>
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

          {/* Sub Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-6">
              {domainSubTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.key
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by domain name or owner..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Domains Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-center">Auto-Renew</TableHead>
                    <TableHead className="text-center">Privacy</TableHead>
                    <TableHead className="text-center">Lock</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10}>
                        <div className="text-center py-12">
                          <Globe className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm font-medium text-gray-900">
                            {search || activeTab !== "all"
                              ? "No domains found"
                              : "No domains yet"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {search
                              ? "Try adjusting your search terms"
                              : "Register your first domain to get started"}
                          </p>
                          {!search && activeTab === "all" && (
                            <Button
                              size="sm"
                              className="mt-4"
                              onClick={() => setRegisterOpen(true)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Register Domain
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((domain, idx) => {
                      const isLocked =
                        domain.lockEnabled ?? domain.domain_lock ?? false;
                      const hasPrivacy =
                        domain.privacyEnabled ??
                        domain.privacy_protection ??
                        false;
                      const autoRenew =
                        domain.autoRenew ?? domain.auto_renew ?? false;

                      return (
                        <TableRow key={`${domain.domain}-${idx}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="font-medium text-gray-900">
                                {domain.domain}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="custom"
                              className="bg-gray-100 text-gray-700"
                            >
                              {domain.type || "domain"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="custom"
                              className={statusColor(
                                domain.status || "active"
                              )}
                            >
                              {domain.status || "active"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">
                            {domain.registered_at
                              ? formatDate(domain.registered_at)
                              : "--"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {domain.expires_at ? (
                              <span
                                className={
                                  new Date(domain.expires_at) <
                                  new Date(
                                    Date.now() + 30 * 24 * 60 * 60 * 1000
                                  )
                                    ? "text-amber-600 font-medium"
                                    : "text-gray-500"
                                }
                              >
                                {formatDate(domain.expires_at)}
                              </span>
                            ) : (
                              "--"
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {autoRenew ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-300 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {hasPrivacy ? (
                              <Shield className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : (
                              <ShieldOff className="h-4 w-4 text-gray-300 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isLocked ? (
                              <Lock className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : (
                              <Unlock className="h-4 w-4 text-gray-300 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell>
                            {domain.owner ? (
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {domain.owner.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {domain.owner.email}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-300">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setAssignModal(domain);
                                  setAssignCustomer(domain.userId || "");
                                }}
                                title="Assign to customer"
                              >
                                <User className="h-3.5 w-3.5 mr-1" />
                                {domain.owner ? "Reassign" : "Assign"}
                              </Button>
                              <a
                                href={`/admin/dns?domain=${encodeURIComponent(domain.domain)}`}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Manage DNS"
                                >
                                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                  DNS
                                </Button>
                              </a>
                              <Button
                                variant="ghost"
                                size="icon"
                                title={isLocked ? "Unlock" : "Lock"}
                                disabled={
                                  actionLoading === `lock-${domain.domain}`
                                }
                                onClick={() =>
                                  handleToggleLock(domain.domain, isLocked)
                                }
                              >
                                {actionLoading ===
                                `lock-${domain.domain}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isLocked ? (
                                  <Unlock className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <Lock className="h-4 w-4 text-gray-500" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title={
                                  hasPrivacy
                                    ? "Disable Privacy"
                                    : "Enable Privacy"
                                }
                                disabled={
                                  actionLoading ===
                                  `privacy-${domain.domain}`
                                }
                                onClick={() =>
                                  handleTogglePrivacy(
                                    domain.domain,
                                    hasPrivacy
                                  )
                                }
                              >
                                {actionLoading ===
                                `privacy-${domain.domain}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : hasPrivacy ? (
                                  <ShieldOff className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <Shield className="h-4 w-4 text-gray-500" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Edit Nameservers"
                                onClick={() => openNsModal(domain)}
                              >
                                <Pencil className="h-4 w-4 text-gray-500" />
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
        </>
      )}

      {/* ==================== FORWARDING TAB ==================== */}
      {pageTab === "forwarding" && (
        <div className="space-y-6">
          {/* Domain Selector */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Domain Forwarding
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Configure URL forwarding for your domains. Select a domain to
                view or update its forwarding settings.
              </p>

              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Enter domain name (e.g. example.com)"
                    value={fwdDomain}
                    onChange={(e) => setFwdDomain(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleFetchForwarding();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleFetchForwarding}
                  disabled={fwdLoading || !fwdDomain.trim()}
                >
                  {fwdLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Lookup
                </Button>
              </div>

              {/* Quick domain selection from portfolio */}
              {domains.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-2">Quick select:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {domains.slice(0, 10).map((d) => (
                      <button
                        key={d.domain}
                        onClick={() => {
                          setFwdDomain(d.domain);
                          setFwdConfig(null);
                          setFwdError(null);
                          setFwdSuccess(null);
                        }}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                          fwdDomain === d.domain
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {d.domain}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages */}
          {fwdError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {fwdError}
            </div>
          )}

          {fwdSuccess && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              {fwdSuccess}
            </div>
          )}

          {/* Loading */}
          {fwdLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
            </div>
          )}

          {/* Forwarding Config Display */}
          {fwdConfig && !fwdLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Config */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    Current Configuration
                  </h3>

                  {fwdConfig.redirect_url ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg">
                        <Globe className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {fwdDomain}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-indigo-700 truncate">
                            {fwdConfig.redirect_url}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">
                            Redirect Type
                          </p>
                          <Badge
                            variant="custom"
                            className={
                              fwdConfig.redirect_type === "301"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }
                          >
                            {fwdConfig.redirect_type || "N/A"} Redirect
                          </Badge>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">
                            Created
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {fwdConfig.created_at
                              ? formatDate(fwdConfig.created_at)
                              : "N/A"}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full text-red-600 border-red-200 hover:bg-red-50"
                        onClick={handleDeleteForwarding}
                        disabled={fwdDeleting}
                      >
                        {fwdDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Remove Forwarding
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ArrowRight className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900">
                        No forwarding configured
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Use the form to set up forwarding for this domain
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Set Forwarding Form */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    {fwdConfig.redirect_url
                      ? "Update Forwarding"
                      : "Set Up Forwarding"}
                  </h3>
                  <form onSubmit={handleSaveForwarding} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Redirect URL{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="url"
                        placeholder="https://destination.com"
                        value={fwdUrl}
                        onChange={(e) => setFwdUrl(e.target.value)}
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        The URL visitors will be redirected to
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Redirect Type
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFwdType("301")}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            fwdType === "301"
                              ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-900">
                            301 Permanent
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            SEO-friendly, cached by browsers
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFwdType("302")}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            fwdType === "302"
                              ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-900">
                            302 Temporary
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Not cached, for temporary moves
                          </p>
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={fwdSaving || !fwdUrl.trim()}
                    >
                      {fwdSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="h-4 w-4 mr-2" />
                      )}
                      {fwdConfig.redirect_url
                        ? "Update Forwarding"
                        : "Create Forwarding"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty State when no domain searched */}
          {!fwdConfig && !fwdLoading && !fwdError && (
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <ArrowRight className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">
                    Select a domain to manage forwarding
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a domain name above or use the quick select buttons
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ==================== WHOIS TAB ==================== */}
      {pageTab === "whois" && (
        <div className="space-y-6">
          {whoisError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {whoisError}
            </div>
          )}

          {/* WHOIS Profiles Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>TLD</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whoisLoading ? (
                    [...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(8)].map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-full max-w-[100px]" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : whoisProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="text-center py-12">
                          <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm font-medium text-gray-900">
                            No WHOIS profiles found
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Create your first WHOIS profile to register domains
                          </p>
                          <Button
                            size="sm"
                            className="mt-4"
                            onClick={() => setWhoisCreateModal(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            New WHOIS Profile
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    whoisProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <Badge
                            variant="custom"
                            className="bg-indigo-100 text-indigo-700"
                          >
                            {profile.tld || "all"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-gray-900">
                            {profile.whois_details?.first_name}{" "}
                            {profile.whois_details?.last_name}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {profile.whois_details?.email || "--"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {profile.whois_details?.company_name || "--"}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {profile.country ||
                              profile.whois_details?.country_code ||
                              "--"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="custom"
                            className={
                              profile.entity_type === "individual"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-purple-100 text-purple-700"
                            }
                          >
                            {profile.entity_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {profile.created_at
                            ? formatDate(profile.created_at)
                            : "--"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewWhoisProfile(profile)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete Profile"
                              disabled={whoisDeleting === profile.id}
                              onClick={() => handleDeleteWhois(profile.id)}
                            >
                              {whoisDeleting === profile.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-400" />
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
        </div>
      )}

      {/* ==================== MODALS ==================== */}

      {/* Register Domain Modal */}
      <Modal
        open={registerOpen}
        onClose={() => {
          setRegisterOpen(false);
          setSearchDomain("");
          setAvailabilityResults([]);
          setRegisterError(null);
        }}
        title="Register Domain"
        description="Search for available domains and register them"
        className="max-w-xl"
      >
        <div className="space-y-4">
          {registerError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {registerError}
            </div>
          )}

          <form onSubmit={handleCheckAvailability} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Enter domain name (e.g. mywebsite)"
                value={searchDomain}
                onChange={(e) => setSearchDomain(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={searchingDomain}>
              {searchingDomain ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Check"
              )}
            </Button>
          </form>

          {availabilityResults.length > 0 && (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {availabilityResults.map((result, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {result.available ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {result.domain}
                      </p>
                      {result.available && result.price && (
                        <p className="text-xs text-gray-500">
                          {result.currency || "$"}
                          {result.price}/yr
                        </p>
                      )}
                    </div>
                  </div>
                  {result.available ? (
                    <Button
                      size="sm"
                      disabled={registering}
                      onClick={() => handleRegisterDomain(result.domain)}
                    >
                      {registering ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Register"
                      )}
                    </Button>
                  ) : (
                    <Badge variant="custom" className="bg-red-50 text-red-600">
                      Taken
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {searchingDomain && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mr-3" />
              <span className="text-sm text-gray-500">
                Checking availability...
              </span>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Nameservers Modal */}
      <Modal
        open={nsModalOpen}
        onClose={() => setNsModalOpen(false)}
        title="Edit Nameservers"
        description={`Update nameservers for ${nsModalDomain}`}
      >
        <form onSubmit={handleSaveNameservers} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nameserver 1 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="ns1.example.com"
              value={ns1}
              onChange={(e) => setNs1(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nameserver 2 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="ns2.example.com"
              value={ns2}
              onChange={(e) => setNs2(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nameserver 3
            </label>
            <Input
              placeholder="ns3.example.com (optional)"
              value={ns3}
              onChange={(e) => setNs3(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nameserver 4
            </label>
            <Input
              placeholder="ns4.example.com (optional)"
              value={ns4}
              onChange={(e) => setNs4(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savingNs}>
              {savingNs && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Nameservers
            </Button>
          </div>
        </form>
      </Modal>

      {/* WHOIS Profile Detail Modal */}
      <Modal
        open={whoisDetailModal}
        onClose={() => {
          setWhoisDetailModal(false);
          setWhoisSelectedProfile(null);
          setWhoisUsage([]);
        }}
        title="WHOIS Profile Details"
        description={
          whoisSelectedProfile
            ? `Profile #${whoisSelectedProfile.id} - ${whoisSelectedProfile.tld || "all TLDs"}`
            : ""
        }
        className="max-w-2xl"
      >
        {whoisSelectedProfile && (
          <div className="space-y-5">
            {/* Profile info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Full Name</p>
                  <p className="text-sm font-medium text-gray-900">
                    {whoisSelectedProfile.whois_details?.first_name}{" "}
                    {whoisSelectedProfile.whois_details?.last_name}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">
                    {whoisSelectedProfile.whois_details?.email || "--"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Building className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Company</p>
                  <p className="text-sm font-medium text-gray-900">
                    {whoisSelectedProfile.whois_details?.company_name || "--"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="text-sm font-medium text-gray-900">
                    {[
                      whoisSelectedProfile.whois_details?.address,
                      whoisSelectedProfile.whois_details?.city,
                      whoisSelectedProfile.whois_details?.state_in,
                      whoisSelectedProfile.whois_details?.zip_in,
                    ]
                      .filter(Boolean)
                      .join(", ") || "--"}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional details */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Country</p>
                <p className="text-sm font-medium text-gray-900">
                  {whoisSelectedProfile.country ||
                    whoisSelectedProfile.whois_details?.country_code ||
                    "--"}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium text-gray-900">
                  {whoisSelectedProfile.whois_details?.phone_cc &&
                  whoisSelectedProfile.whois_details?.phone_number
                    ? `+${whoisSelectedProfile.whois_details.phone_cc} ${whoisSelectedProfile.whois_details.phone_number}`
                    : "--"}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Entity Type</p>
                <Badge
                  variant="custom"
                  className={
                    whoisSelectedProfile.entity_type === "individual"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-purple-100 text-purple-700"
                  }
                >
                  {whoisSelectedProfile.entity_type}
                </Badge>
              </div>
            </div>

            {/* Domain usage */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Domains Using This Profile
              </h4>
              {whoisUsageLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                  <span className="text-sm text-gray-500">
                    Loading usage data...
                  </span>
                </div>
              ) : whoisUsage.length > 0 ? (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {whoisUsage.map((domain, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2"
                    >
                      <Globe className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm text-gray-700">{domain}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-2">
                  No domains are currently using this profile.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={whoisDeleting === whoisSelectedProfile.id}
                onClick={() => handleDeleteWhois(whoisSelectedProfile.id)}
              >
                {whoisDeleting === whoisSelectedProfile.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Profile
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setWhoisDetailModal(false);
                  setWhoisSelectedProfile(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create WHOIS Profile Modal */}
      <Modal
        open={whoisCreateModal}
        onClose={() => {
          setWhoisCreateModal(false);
          resetWhoisForm();
        }}
        title="Create WHOIS Profile"
        description="Add a new WHOIS contact profile for domain registrations"
        className="max-w-2xl"
      >
        <form onSubmit={handleCreateWhois} className="space-y-5">
          {whoisCreateError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {whoisCreateError}
            </div>
          )}

          {/* TLD & Entity Type Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                TLD <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder=".com"
                value={whoisForm.tld}
                onChange={(e) =>
                  setWhoisForm({ ...whoisForm, tld: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Entity Type <span className="text-red-500">*</span>
              </label>
              <select
                value={whoisForm.entity_type}
                onChange={(e) =>
                  setWhoisForm({ ...whoisForm, entity_type: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="individual">Individual</option>
                <option value="company">Company</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Country <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="IN"
                value={whoisForm.country}
                onChange={(e) =>
                  setWhoisForm({ ...whoisForm, country: e.target.value })
                }
                required
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Contact Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="John"
                  value={whoisForm.first_name}
                  onChange={(e) =>
                    setWhoisForm({ ...whoisForm, first_name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Doe"
                  value={whoisForm.last_name}
                  onChange={(e) =>
                    setWhoisForm({ ...whoisForm, last_name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={whoisForm.email}
                  onChange={(e) =>
                    setWhoisForm({ ...whoisForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Company Name
                </label>
                <Input
                  placeholder="Acme Inc."
                  value={whoisForm.company_name}
                  onChange={(e) =>
                    setWhoisForm({
                      ...whoisForm,
                      company_name: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Address
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="123 Main St"
                  value={whoisForm.address}
                  onChange={(e) =>
                    setWhoisForm({ ...whoisForm, address: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  City <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Mumbai"
                  value={whoisForm.city}
                  onChange={(e) =>
                    setWhoisForm({ ...whoisForm, city: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  State <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="MH"
                  value={whoisForm.state_in}
                  onChange={(e) =>
                    setWhoisForm({ ...whoisForm, state_in: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Country Code <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="IN"
                  value={whoisForm.country_code}
                  onChange={(e) =>
                    setWhoisForm({
                      ...whoisForm,
                      country_code: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  ZIP Code <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="400001"
                  value={whoisForm.zip_in}
                  onChange={(e) =>
                    setWhoisForm({ ...whoisForm, zip_in: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          </div>

          {/* Phone */}
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Phone</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Country Code <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="91"
                  value={whoisForm.phone_cc}
                  onChange={(e) =>
                    setWhoisForm({ ...whoisForm, phone_cc: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="9876543210"
                  value={whoisForm.phone_number}
                  onChange={(e) =>
                    setWhoisForm({
                      ...whoisForm,
                      phone_number: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setWhoisCreateModal(false);
                resetWhoisForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={whoisCreating}>
              {whoisCreating && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Domain Modal */}
      <Modal
        open={!!assignModal}
        onClose={() => {
          setAssignModal(null);
          setAssignCustomer("");
        }}
        title={`Assign Domain — ${assignModal?.domain || ""}`}
        description="Assign this domain to a customer so it appears in their dashboard"
      >
        <form onSubmit={handleAssignDomain} className="space-y-4">
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
