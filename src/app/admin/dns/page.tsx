"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Globe,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Pencil,
  RotateCcw,
  Clock,
  CheckCircle2,
  ChevronDown,
  History,
  Shield,
  Eye,
  X,
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
import { formatDateTime } from "@/lib/utils";

interface DnsRecord {
  name: string;
  type: string;
  content: string;
  ttl: number;
  priority?: number;
  id?: string;
}

interface Snapshot {
  id: string;
  created_at: string;
  reason?: string;
}

interface SnapshotDetail {
  id: string;
  created_at: string;
  reason?: string;
  records?: DnsRecord[];
  zone?: {
    records?: DnsRecord[];
  };
}

const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"];

const TTL_OPTIONS = [
  { label: "Auto", value: 0 },
  { label: "1 min", value: 60 },
  { label: "5 min", value: 300 },
  { label: "30 min", value: 1800 },
  { label: "1 hour", value: 3600 },
  { label: "12 hours", value: 43200 },
  { label: "1 day", value: 86400 },
];

function SkeletonRow() {
  return (
    <TableRow>
      {[...Array(6)].map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full max-w-[120px]" />
        </TableCell>
      ))}
    </TableRow>
  );
}

function formatTtl(ttl: number): string {
  if (ttl === 0) return "Auto";
  if (ttl < 60) return `${ttl}s`;
  if (ttl < 3600) return `${Math.floor(ttl / 60)}m`;
  if (ttl < 86400) return `${Math.floor(ttl / 3600)}h`;
  return `${Math.floor(ttl / 86400)}d`;
}

function recordTypeColor(type: string): string {
  const colors: Record<string, string> = {
    A: "bg-blue-100 text-blue-800",
    AAAA: "bg-indigo-100 text-indigo-800",
    CNAME: "bg-purple-100 text-purple-800",
    MX: "bg-amber-100 text-amber-800",
    TXT: "bg-gray-100 text-gray-800",
    NS: "bg-emerald-100 text-emerald-800",
    SRV: "bg-pink-100 text-pink-800",
    CAA: "bg-red-100 text-red-800",
  };
  return colors[type.toUpperCase()] || "bg-gray-100 text-gray-800";
}

export default function DnsPage() {
  const searchParams = useSearchParams();
  const initialDomain = searchParams.get("domain") || "";

  // Domain selection
  const [allDomains, setAllDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState(initialDomain);
  const [domainDropdownOpen, setDomainDropdownOpen] = useState(false);
  const [domainSearch, setDomainSearch] = useState("");

  // DNS records
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(true);

  // Add record form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("A");
  const [newContent, setNewContent] = useState("");
  const [newTtl, setNewTtl] = useState(3600);
  const [newPriority, setNewPriority] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit record
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTtl, setEditTtl] = useState(3600);
  const [editPriority, setEditPriority] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reset
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Snapshot restore
  const [restoringSnapshot, setRestoringSnapshot] = useState<string | null>(
    null
  );
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);

  // Snapshot view
  const [viewingSnapshot, setViewingSnapshot] = useState<string | null>(null);
  const [snapshotDetail, setSnapshotDetail] = useState<SnapshotDetail | null>(
    null
  );
  const [snapshotDetailLoading, setSnapshotDetailLoading] = useState(false);

  // Error
  const [error, setError] = useState<string | null>(null);

  // Fetch all domains for the selector
  const fetchDomains = useCallback(async () => {
    setLoadingDomains(true);
    try {
      const res = await fetch("/api/admin/domains");
      if (res.ok) {
        const data = await res.json();
        const domainList = [
          ...new Set<string>(
            (data.domains || []).map((d: { domain: string }) => d.domain)
          ),
        ];
        setAllDomains(domainList);
      }
    } catch {
      // Network error
    } finally {
      setLoadingDomains(false);
    }
  }, []);

  // Fetch DNS records for the selected domain
  const fetchRecords = useCallback(async () => {
    if (!selectedDomain) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/dns?domain=${encodeURIComponent(selectedDomain)}`
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to fetch DNS records");
        setRecords([]);
        setSnapshots([]);
        return;
      }
      const data = await res.json();
      const zone = data.zone || {};
      setRecords(Array.isArray(zone.records) ? zone.records : []);
      setSnapshots(data.snapshots || []);
    } catch {
      setError("Network error. Please try again.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDomain]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  useEffect(() => {
    if (selectedDomain) {
      fetchRecords();
    }
  }, [selectedDomain, fetchRecords]);

  async function handleAddRecord(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError(null);

    try {
      const record: Record<string, unknown> = {
        name: newName || "@",
        type: newType,
        content: newContent,
        ttl: newTtl,
      };
      if (newType === "MX" && newPriority) {
        record.priority = Number(newPriority);
      }

      const res = await fetch("/api/admin/dns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: selectedDomain,
          records: [...records, record],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setAddError(data.error || "Failed to add record");
        return;
      }

      setShowAddForm(false);
      setNewName("");
      setNewType("A");
      setNewContent("");
      setNewTtl(3600);
      setNewPriority("");
      fetchRecords();
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(idx: number) {
    const rec = records[idx];
    setEditIdx(idx);
    setEditName(rec.name);
    setEditType(rec.type);
    setEditContent(rec.content);
    setEditTtl(rec.ttl);
    setEditPriority(rec.priority ? String(rec.priority) : "");
  }

  async function handleSaveEdit() {
    if (editIdx === null) return;
    setSaving(true);

    try {
      const updated = records.map((rec, idx) => {
        if (idx === editIdx) {
          return {
            name: editName,
            type: editType,
            content: editContent,
            ttl: editTtl,
            ...(editType === "MX" && editPriority
              ? { priority: Number(editPriority) }
              : {}),
          };
        }
        return rec;
      });

      const res = await fetch("/api/admin/dns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: selectedDomain,
          records: updated,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update record");
        return;
      }

      setEditIdx(null);
      fetchRecords();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(idx: number) {
    setDeleting(true);
    try {
      const recordToDelete = records[idx];
      const res = await fetch("/api/admin/dns", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: selectedDomain,
          records: [recordToDelete],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete record");
        return;
      }

      setDeleteConfirm(null);
      fetchRecords();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch("/api/admin/dns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
          domain: selectedDomain,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to reset DNS zone");
        return;
      }

      setResetConfirm(false);
      fetchRecords();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResetting(false);
    }
  }

  async function handleRestoreSnapshot(snapshotId: string) {
    setRestoringSnapshot(snapshotId);
    setRestoreConfirmId(null);
    try {
      const res = await fetch("/api/admin/dns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore_snapshot",
          domain: selectedDomain,
          snapshotId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to restore snapshot");
        return;
      }

      fetchRecords();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRestoringSnapshot(null);
    }
  }

  async function handleViewSnapshot(snapshotId: string) {
    setViewingSnapshot(snapshotId);
    setSnapshotDetail(null);
    setSnapshotDetailLoading(true);
    try {
      const res = await fetch(
        `/api/admin/dns/snapshots?domain=${encodeURIComponent(selectedDomain)}&snapshotId=${snapshotId}`
      );
      if (res.ok) {
        const data = await res.json();
        setSnapshotDetail(data.snapshot || data);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to fetch snapshot details");
        setViewingSnapshot(null);
      }
    } catch {
      setError("Network error. Please try again.");
      setViewingSnapshot(null);
    } finally {
      setSnapshotDetailLoading(false);
    }
  }

  const filteredDomains = allDomains.filter(
    (d) =>
      !domainSearch || d.toLowerCase().includes(domainSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DNS Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage DNS zones, records, and snapshots
          </p>
        </div>
        {selectedDomain && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchRecords}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => setResetConfirm(true)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </Button>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Record
            </Button>
          </div>
        )}
      </div>

      {/* Domain Selector */}
      <Card>
        <CardContent className="p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Domain
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDomainDropdownOpen(!domainDropdownOpen)}
              className="w-full flex items-center justify-between h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-400" />
                <span>
                  {selectedDomain || "Choose a domain to manage DNS..."}
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-gray-400 transition-transform ${
                  domainDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {domainDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setDomainDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <Input
                      placeholder="Search domains..."
                      value={domainSearch}
                      onChange={(e) => setDomainSearch(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto max-h-48">
                    {loadingDomains ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    ) : filteredDomains.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No domains found
                      </p>
                    ) : (
                      filteredDomains.map((d) => (
                        <button
                          key={d}
                          type="button"
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors ${
                            selectedDomain === d
                              ? "bg-indigo-50 text-indigo-700 font-medium"
                              : "text-gray-700"
                          }`}
                          onClick={() => {
                            setSelectedDomain(d);
                            setDomainDropdownOpen(false);
                            setDomainSearch("");
                          }}
                        >
                          <Globe className="h-3.5 w-3.5 text-gray-400" />
                          {d}
                          {selectedDomain === d && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 ml-auto" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button
            className="ml-auto text-red-500 hover:text-red-700"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* No domain selected */}
      {!selectedDomain && (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Select a Domain
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Choose a domain from the dropdown above to view and manage its DNS
              records, or navigate here from the Domains page.
            </p>
          </CardContent>
        </Card>
      )}

      {/* DNS Records Table */}
      {selectedDomain && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                DNS Records for{" "}
                <span className="text-indigo-600">{selectedDomain}</span>
              </CardTitle>
              <Badge variant="custom" className="bg-gray-100 text-gray-700">
                {records.length} record{records.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>TTL</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="text-center py-12">
                        <Globe className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-900">
                          No DNS records found
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Add your first DNS record or reset to defaults
                        </p>
                        <div className="flex justify-center gap-2 mt-4">
                          <Button
                            size="sm"
                            onClick={() => setShowAddForm(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Record
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setResetConfirm(true)}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset to Default
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record, idx) =>
                    editIdx === idx ? (
                      // Edit row
                      <TableRow key={idx} className="bg-indigo-50/50">
                        <TableCell>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-sm"
                            placeholder="@"
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value)}
                            className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {RECORD_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            value={editTtl}
                            onChange={(e) =>
                              setEditTtl(Number(e.target.value))
                            }
                            className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {TTL_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          {editType === "MX" ? (
                            <Input
                              value={editPriority}
                              onChange={(e) => setEditPriority(e.target.value)}
                              className="h-8 text-sm w-20"
                              placeholder="10"
                            />
                          ) : (
                            <span className="text-gray-300">--</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              disabled={saving}
                            >
                              {saving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                "Save"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditIdx(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      // Display row
                      <TableRow key={idx}>
                        <TableCell>
                          <code className="text-sm text-gray-900">
                            {record.name || "@"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="custom"
                            className={recordTypeColor(record.type)}
                          >
                            {record.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-50 px-2 py-1 rounded text-gray-600 break-all max-w-xs inline-block">
                            {record.content}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="h-3 w-3" />
                            {formatTtl(record.ttl)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {record.priority ?? (
                            <span className="text-gray-300">--</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit Record"
                              onClick={() => startEdit(idx)}
                            >
                              <Pencil className="h-4 w-4 text-gray-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete Record"
                              onClick={() => setDeleteConfirm(idx)}
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* DNS Snapshots */}
      {selectedDomain && !loading && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-gray-400" />
                DNS Snapshots
              </CardTitle>
              {snapshots.length > 0 && (
                <Badge variant="custom" className="bg-gray-100 text-gray-700">
                  {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {snapshots.length === 0 ? (
              <div className="text-center py-10 px-6">
                <History className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900">
                  No snapshots available
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  DNS snapshots are created automatically when changes are made.
                  They will appear here once available.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Snapshot ID</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((snapshot) => (
                    <TableRow key={snapshot.id}>
                      <TableCell>
                        <code className="text-sm text-gray-700">
                          {snapshot.id}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {snapshot.reason || "Manual snapshot"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {snapshot.created_at
                          ? formatDateTime(snapshot.created_at)
                          : "--"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSnapshot(snapshot.id)}
                            disabled={viewingSnapshot === snapshot.id && snapshotDetailLoading}
                          >
                            {viewingSnapshot === snapshot.id && snapshotDetailLoading ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <Eye className="h-3.5 w-3.5 mr-1" />
                            )}
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={restoringSnapshot === snapshot.id}
                            onClick={() => setRestoreConfirmId(snapshot.id)}
                          >
                            {restoringSnapshot === snapshot.id ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            )}
                            Restore
                          </Button>
                        </div>
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
        open={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          setNewName("");
          setNewType("A");
          setNewContent("");
          setNewTtl(3600);
          setNewPriority("");
          setAddError(null);
        }}
        title="Add DNS Record"
        description={`Add a new record to ${selectedDomain}`}
      >
        <form onSubmit={handleAddRecord} className="space-y-4">
          {addError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {addError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Name
              </label>
              <Input
                placeholder="@ or subdomain"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Use @ for root domain
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {RECORD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Content <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder={
                newType === "A"
                  ? "192.168.1.1"
                  : newType === "AAAA"
                    ? "2001:db8::1"
                    : newType === "CNAME"
                      ? "target.example.com"
                      : newType === "MX"
                        ? "mail.example.com"
                        : newType === "TXT"
                          ? "v=spf1 include:example.com ~all"
                          : "Record content"
              }
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                TTL
              </label>
              <select
                value={newTtl}
                onChange={(e) => setNewTtl(Number(e.target.value))}
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {TTL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {newType === "MX" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Priority
                </label>
                <Input
                  type="number"
                  placeholder="10"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                setAddError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={adding}>
              {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete DNS Record"
        description="This action cannot be undone."
        className="max-w-sm"
      >
        {deleteConfirm !== null && records[deleteConfirm] && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="custom"
                  className={recordTypeColor(records[deleteConfirm].type)}
                >
                  {records[deleteConfirm].type}
                </Badge>
                <code className="text-sm font-medium">
                  {records[deleteConfirm].name}
                </code>
              </div>
              <code className="text-xs text-gray-500 break-all">
                {records[deleteConfirm].content}
              </code>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this DNS record? This may affect
              your website or email delivery.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={() =>
                  deleteConfirm !== null && handleDelete(deleteConfirm)
                }
              >
                {deleting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Delete Record
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal
        open={resetConfirm}
        onClose={() => setResetConfirm(false)}
        title="Reset DNS Zone"
        description="This will restore all DNS records to their default values."
        className="max-w-sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Warning</p>
              <p>
                Resetting the DNS zone for{" "}
                <strong>{selectedDomain}</strong> will remove all custom
                records and restore defaults. This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setResetConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={resetting}
              onClick={handleReset}
            >
              {resetting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Reset Zone
            </Button>
          </div>
        </div>
      </Modal>

      {/* Restore Snapshot Confirmation Modal */}
      <Modal
        open={restoreConfirmId !== null}
        onClose={() => setRestoreConfirmId(null)}
        title="Restore DNS Snapshot"
        description="This will replace your current DNS records with the snapshot contents."
        className="max-w-sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Confirm Restore</p>
              <p>
                Restoring snapshot <strong>{restoreConfirmId}</strong> for{" "}
                <strong>{selectedDomain}</strong> will overwrite all current DNS
                records. A new snapshot of the current state will be saved
                automatically.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setRestoreConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={restoringSnapshot !== null}
              onClick={() =>
                restoreConfirmId && handleRestoreSnapshot(restoreConfirmId)
              }
            >
              {restoringSnapshot !== null ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Restore Snapshot
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Snapshot Modal */}
      <Modal
        open={viewingSnapshot !== null}
        onClose={() => {
          setViewingSnapshot(null);
          setSnapshotDetail(null);
        }}
        title="Snapshot Details"
        description={`Snapshot ${viewingSnapshot || ""} for ${selectedDomain}`}
        className="max-w-3xl"
      >
        {snapshotDetailLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-3" />
            <span className="text-sm text-gray-500">Loading snapshot contents...</span>
          </div>
        ) : snapshotDetail ? (
          <div className="space-y-4">
            {/* Snapshot metadata */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {snapshotDetail.reason && (
                <span>
                  <strong className="text-gray-700">Reason:</strong>{" "}
                  {snapshotDetail.reason}
                </span>
              )}
              {snapshotDetail.created_at && (
                <span>
                  <strong className="text-gray-700">Created:</strong>{" "}
                  {formatDateTime(snapshotDetail.created_at)}
                </span>
              )}
            </div>

            {/* Records table */}
            {(() => {
              const snapshotRecords =
                snapshotDetail.records ||
                snapshotDetail.zone?.records ||
                [];
              if (snapshotRecords.length === 0) {
                return (
                  <div className="text-center py-8 text-sm text-gray-500">
                    No records found in this snapshot.
                  </div>
                );
              }
              return (
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-white z-10">Name</TableHead>
                        <TableHead className="sticky top-0 bg-white z-10">Type</TableHead>
                        <TableHead className="sticky top-0 bg-white z-10">Content</TableHead>
                        <TableHead className="sticky top-0 bg-white z-10">TTL</TableHead>
                        <TableHead className="sticky top-0 bg-white z-10">Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {snapshotRecords.map(
                        (rec: DnsRecord, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <code className="text-sm text-gray-900">
                                {rec.name || "@"}
                              </code>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="custom"
                                className={recordTypeColor(rec.type)}
                              >
                                {rec.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-gray-50 px-2 py-1 rounded text-gray-600 break-all max-w-xs inline-block">
                                {rec.content}
                              </code>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Clock className="h-3 w-3" />
                                {formatTtl(rec.ttl)}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {rec.priority ?? (
                                <span className="text-gray-300">--</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setViewingSnapshot(null);
                  setSnapshotDetail(null);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
              <Button
                onClick={() => {
                  setViewingSnapshot(null);
                  setSnapshotDetail(null);
                  if (viewingSnapshot) {
                    setRestoreConfirmId(viewingSnapshot);
                  }
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore This Snapshot
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-gray-500">
            Failed to load snapshot details.
          </div>
        )}
      </Modal>
    </div>
  );
}
