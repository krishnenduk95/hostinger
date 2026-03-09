"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import {
  Settings,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  ChevronDown,
  Save,
  Globe,
  AlertCircle,
} from "lucide-react";

interface DNSRecord {
  type: string;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
}

interface Domain {
  id: string;
  domain: string;
  status: string;
}

const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"];

export default function CustomerDNSPage() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get("domain");

  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>(
    preselected || ""
  );
  const [records, setRecords] = useState<DNSRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [newRecord, setNewRecord] = useState<DNSRecord>({
    type: "A",
    name: "",
    content: "",
    ttl: 3600,
  });

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDNSRecords = useCallback(async (domain: string) => {
    if (!domain) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/customer/dns?domain=${encodeURIComponent(domain)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch DNS records");
      const zone = data.zone;
      setRecords(
        Array.isArray(zone?.records)
          ? zone.records
          : Array.isArray(zone)
            ? zone
            : []
      );
    } catch (err) {
      console.error("Failed to fetch DNS:", err);
      setError(err instanceof Error ? err.message : "Failed to load DNS records");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      fetchDNSRecords(selectedDomain);
    }
  }, [selectedDomain, fetchDNSRecords]);

  async function fetchDomains() {
    setDomainsLoading(true);
    try {
      const res = await fetch("/api/customer/domains");
      const data = await res.json();
      const doms = data.domains || [];
      setDomains(doms);

      // Autoselect first domain if none preselected
      if (!preselected && doms.length > 0) {
        setSelectedDomain(doms[0].domain);
      }
    } catch (error) {
      console.error("Failed to fetch domains:", error);
    } finally {
      setDomainsLoading(false);
    }
  }

  function addRecord() {
    if (!newRecord.name || !newRecord.content) {
      setError("Name and content are required");
      return;
    }

    setRecords((prev) => [...prev, { ...newRecord }]);
    setNewRecord({ type: "A", name: "", content: "", ttl: 3600 });
    setShowAddModal(false);
    setError("");
  }

  function removeRecord(index: number) {
    setRecords((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveRecords() {
    if (!selectedDomain) return;
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/customer/dns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: selectedDomain, records }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save DNS records");
      setSuccessMsg("DNS records updated successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Failed to save DNS:", err);
      setError(err instanceof Error ? err.message : "Failed to save records");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DNS Management</h1>
          <p className="text-gray-500 mt-1">
            Configure DNS records for your domains.
          </p>
        </div>
      </div>

      {/* Domain Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <Globe className="h-5 w-5 text-indigo-600" />
              <span className="font-medium text-gray-700">Select Domain:</span>
            </div>

            {domainsLoading ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading domains...
              </div>
            ) : domains.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No domains available. Domains need to be assigned to your
                account first.
              </p>
            ) : (
              <div className="relative flex-1 max-w-sm">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center justify-between h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50 transition-colors"
                >
                  <span className={selectedDomain ? "text-gray-900" : "text-gray-400"}>
                    {selectedDomain || "Choose a domain..."}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
                {showDropdown && (
                  <div className="absolute z-20 top-full left-0 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
                    {domains.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          setSelectedDomain(d.domain);
                          setShowDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors ${
                          selectedDomain === d.domain
                            ? "bg-indigo-50 text-indigo-700 font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        {d.domain}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedDomain && (
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchDNSRecords(selectedDomain)}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error / Success */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
          <Save className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* DNS Records */}
      {selectedDomain && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-600" />
                DNS Records for {selectedDomain}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Record
                </Button>
                <Button
                  size="sm"
                  onClick={saveRecords}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1.5" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-16">
                <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">
                  No DNS records found
                </h3>
                <p className="text-gray-500 mt-1 text-sm">
                  Add your first DNS record to get started.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Record
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>TTL</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant="info">{record.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-gray-900">
                          {record.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-gray-600 break-all max-w-xs block">
                          {record.content}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">{record.ttl}s</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">
                          {record.priority ?? "--"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecord(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
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

      {/* Add Record Modal */}
      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setError("");
        }}
        title="Add DNS Record"
        description={`Add a new DNS record for ${selectedDomain}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Record Type
            </label>
            <div className="relative">
              <select
                value={newRecord.type}
                onChange={(e) =>
                  setNewRecord((prev) => ({ ...prev, type: e.target.value }))
                }
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
              >
                {DNS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <Input
              placeholder="@ or subdomain"
              value={newRecord.name}
              onChange={(e) =>
                setNewRecord((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <p className="text-xs text-gray-400 mt-1">
              Use @ for the root domain or enter a subdomain name.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <Input
              placeholder={
                newRecord.type === "A"
                  ? "192.168.1.1"
                  : newRecord.type === "CNAME"
                    ? "target.example.com"
                    : newRecord.type === "MX"
                      ? "mail.example.com"
                      : "Value"
              }
              value={newRecord.content}
              onChange={(e) =>
                setNewRecord((prev) => ({ ...prev, content: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TTL (seconds)
              </label>
              <Input
                type="number"
                value={newRecord.ttl}
                onChange={(e) =>
                  setNewRecord((prev) => ({
                    ...prev,
                    ttl: parseInt(e.target.value) || 3600,
                  }))
                }
              />
            </div>
            {(newRecord.type === "MX" || newRecord.type === "SRV") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <Input
                  type="number"
                  value={newRecord.priority || ""}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      priority: parseInt(e.target.value) || undefined,
                    }))
                  }
                  placeholder="10"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setError("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={addRecord}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
