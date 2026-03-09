"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Server,
  Play,
  Square,
  RotateCcw,
  Loader2,
  RefreshCw,
  HardDrive,
  Cpu,
  MemoryStick,
  Globe,
  Key,
  Archive,
  Plus,
  Trash2,
  AlertCircle,
  Copy,
  Search,
  BarChart3,
  Download,
  Clock,
  ExternalLink,
  MapPin,
  Activity,
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  Shield,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Terminal,
  Box,
  Wifi,
  WifiOff,
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
import { cn, formatBytes, formatDate, formatDateTime, statusColor } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────

interface Owner {
  id: string;
  name: string;
  email: string;
}

interface IPEntry {
  id: number;
  address: string;
  ptr: string;
}

interface VMServer {
  id: number;
  hostname: string;
  state: string;
  plan?: string;
  ipv4?: IPEntry[] | string;
  ipv6?: IPEntry[] | string;
  cpus?: number;
  memory?: number;
  disk?: number;
  bandwidth?: number;
  os?: string;
  os_name?: string;
  data_center?: string;
  datacenter?: string;
  created_at?: string;
  localId?: string;
  owner?: Owner | null;
  userId?: string | null;
  localHostname?: string;
  localPlan?: string;
}

function getIp(val: IPEntry[] | string | undefined): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val) && val.length > 0) return val[0].address;
  return "";
}

function getAllIps(val: IPEntry[] | string | undefined): IPEntry[] {
  if (!val) return [];
  if (typeof val === "string") return [{ id: 0, address: val, ptr: "" }];
  if (Array.isArray(val)) return val;
  return [];
}

interface Backup {
  id: number;
  created_at: string;
  size?: number;
  restore_time?: string;
  location?: string;
  status?: string;
}

interface SSHKey {
  id: number;
  name: string;
  key: string;
  created_at?: string;
}

interface VMAction {
  id?: number;
  name?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface OSTemplate {
  id: number;
  name: string;
  description?: string;
  documentation?: string;
}

interface DataCenter {
  id: number;
  name: string;
  location?: string;
  city?: string;
  country?: string;
}

interface FirewallRule {
  id: number;
  protocol?: string;
  port?: string;
  source?: string;
  source_detail?: string;
  action?: string;
  direction?: string;
}

interface Firewall {
  id: number;
  name: string;
  is_active?: boolean;
  rules?: FirewallRule[];
  created_at?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Snapshot {
  id?: number;
  created_at?: string;
  size?: number;
  status?: string;
  [key: string]: unknown;
}

interface PostInstallScript {
  id: number;
  name: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

interface MetricPoint {
  timestamp: string;
  value: number;
}

interface VMMetrics {
  cpu_usage?: MetricPoint[];
  ram_usage?: MetricPoint[];
  disk_space?: MetricPoint[];
  outgoing_traffic?: MetricPoint[];
  incoming_traffic?: MetricPoint[];
  uptime?: MetricPoint[];
  // Legacy field names support
  cpu?: MetricPoint[];
  memory?: MetricPoint[];
  disk?: MetricPoint[];
  network?: {
    in?: MetricPoint[];
    out?: MetricPoint[];
  };
}

interface Stats {
  total: number;
  running: number;
  stopped: number;
}

// ── Skeleton loader ────────────────────────────────────────

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 bg-gray-200 rounded w-40" />
            <div className="h-5 bg-gray-200 rounded w-20" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Progress bar component ─────────────────────────────────

function ProgressBar({
  label,
  value,
  max,
  unit,
  color = "bg-indigo-500",
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  color?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">
          {unit ? `${value.toFixed(1)} ${unit}` : `${value.toFixed(1)}%`}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Mini bar chart component ───────────────────────────────

function MiniBarChart({
  data,
  color = "bg-indigo-400",
  dangerColor = "bg-red-400",
  warnColor = "bg-amber-400",
  height = 80,
  label,
  dangerThreshold = 80,
  warnThreshold = 60,
}: {
  data: MetricPoint[];
  color?: string;
  dangerColor?: string;
  warnColor?: string;
  height?: number;
  label: string;
  dangerThreshold?: number;
  warnThreshold?: number;
}) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map((p) => p.value), 1);
  const isPercentage = maxVal <= 100;
  const displayMax = isPercentage ? 100 : maxVal;
  const samples = data.slice(-60);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-500">
          {samples.length} samples
        </span>
      </div>
      <div
        className="flex items-end gap-px bg-gray-50 rounded-lg p-2"
        style={{ height }}
      >
        {samples.map((point, i) => {
          const pct = (point.value / displayMax) * 100;
          const barColor =
            point.value > dangerThreshold
              ? dangerColor
              : point.value > warnThreshold
                ? warnColor
                : color;
          return (
            <div
              key={i}
              className={cn("flex-1 rounded-t transition-all", barColor)}
              style={{ height: `${Math.max(pct, 2)}%` }}
              title={`${isPercentage ? point.value.toFixed(1) + "%" : formatBytes(point.value)} at ${formatDateTime(point.timestamp)}`}
            />
          );
        })}
      </div>
      {samples.length > 1 && (
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-400">
            {formatDateTime(samples[0].timestamp)}
          </span>
          <span className="text-[10px] text-gray-400">
            {formatDateTime(samples[samples.length - 1].timestamp)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Helper: get metric arrays from API response ────────────

function getMetricArray(metrics: VMMetrics | null, key: string): MetricPoint[] {
  if (!metrics) return [];
  // Try direct key first (new API format)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const direct = (metrics as any)[key];
  if (Array.isArray(direct)) return direct;
  return [];
}

function getLatestValue(arr: MetricPoint[]): number {
  if (!arr || arr.length === 0) return 0;
  return arr[arr.length - 1].value;
}

// ── Main component ─────────────────────────────────────────

export default function VPSPage() {
  const [servers, setServers] = useState<VMServer[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, running: 0, stopped: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedVM, setSelectedVM] = useState<VMServer | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Detail data
  const [backups, setBackups] = useState<Backup[]>([]);
  const [sshKeys, setSSHKeys] = useState<SSHKey[]>([]);
  const [vmActions, setVMActions] = useState<VMAction[]>([]);
  const [metrics, setMetrics] = useState<VMMetrics | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Global data (not VM-specific)
  const [osTemplates, setOsTemplates] = useState<OSTemplate[]>([]);
  const [dataCenters, setDataCenters] = useState<DataCenter[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [datacentersLoading, setDatacentersLoading] = useState(false);

  // Confirm modal
  const [confirmAction, setConfirmAction] = useState<{
    action: string;
    vmId: number;
    label: string;
  } | null>(null);

  // SSH key modal
  const [sshModalOpen, setSSHModalOpen] = useState(false);
  const [sshName, setSSHName] = useState("");
  const [sshKey, setSSHKey] = useState("");
  const [sshSubmitting, setSSHSubmitting] = useState(false);

  // Copied state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Assign state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [assignVM, setAssignVM] = useState<any>(null);
  const [assignCustomer, setAssignCustomer] = useState("");
  const [assignCustomers, setAssignCustomers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // Firewall state
  const [firewalls, setFirewalls] = useState<Firewall[]>([]);
  const [firewallsLoading, setFirewallsLoading] = useState(false);
  const [firewallModalOpen, setFirewallModalOpen] = useState(false);
  const [firewallName, setFirewallName] = useState("");
  const [selectedFirewall, setSelectedFirewall] = useState<Firewall | null>(null);
  const [firewallRuleModal, setFirewallRuleModal] = useState(false);
  const [ruleProtocol, setRuleProtocol] = useState("tcp");
  const [rulePort, setRulePort] = useState("");
  const [ruleSource, setRuleSource] = useState("any");

  // Snapshot state
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  // Scripts state
  const [scripts, setScripts] = useState<PostInstallScript[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(false);
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [editScript, setEditScript] = useState<PostInstallScript | null>(null);
  const [scriptName, setScriptName] = useState("");
  const [scriptContent, setScriptContent] = useState("");

  // Docker state
  const [dockerProject, setDockerProject] = useState("");

  // Settings state
  const [settingsHostname, setSettingsHostname] = useState("");
  const [settingsPassword, setSettingsPassword] = useState("");
  const [settingsPanelPassword, setSettingsPanelPassword] = useState("");
  const [settingsNs1, setSettingsNs1] = useState("");
  const [settingsNs2, setSettingsNs2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPanelPassword, setShowPanelPassword] = useState(false);

  // Monarx state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [monarx, setMonarx] = useState<any>(null);
  const [monarxLoading, setMonarxLoading] = useState(false);

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/vps");
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers || []);
        setStats(data.stats || { total: 0, running: 0, stopped: 0 });
      }
    } catch {
      setError("Failed to load VPS servers.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVMDetail = useCallback(async (vmId: number) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/admin/vps?vm_id=${vmId}`);
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
        setSSHKeys(data.sshKeys || []);
        setVMActions(data.actions || []);
        setMetrics(data.metrics || null);
      }
    } catch {
      setError("Failed to load VM details.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const fetchOSTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      const res = await fetch("/api/admin/vps?action=templates");
      if (res.ok) {
        const data = await res.json();
        setOsTemplates(data.templates || []);
      }
    } catch {
      // silent
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const fetchDataCenters = useCallback(async () => {
    try {
      setDatacentersLoading(true);
      const res = await fetch("/api/admin/vps?action=datacenters");
      if (res.ok) {
        const data = await res.json();
        setDataCenters(data.datacenters || []);
      }
    } catch {
      // silent
    } finally {
      setDatacentersLoading(false);
    }
  }, []);

  const fetchFirewalls = useCallback(async () => {
    try {
      setFirewallsLoading(true);
      const res = await fetch("/api/admin/vps?action=firewalls");
      if (res.ok) {
        const data = await res.json();
        setFirewalls(data.firewalls || []);
      }
    } catch {
      // silent
    } finally {
      setFirewallsLoading(false);
    }
  }, []);

  const fetchFirewallDetail = useCallback(async (firewallId: number) => {
    try {
      const res = await fetch(`/api/admin/vps?action=firewall_detail&firewall_id=${firewallId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedFirewall(data.firewall || null);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchSnapshot = useCallback(async (vmId: number) => {
    try {
      setSnapshotLoading(true);
      const res = await fetch(`/api/admin/vps?action=snapshot&vm_id=${vmId}`);
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data.snapshot || null);
      }
    } catch {
      // silent
    } finally {
      setSnapshotLoading(false);
    }
  }, []);

  const fetchScripts = useCallback(async () => {
    try {
      setScriptsLoading(true);
      const res = await fetch("/api/admin/vps?action=scripts");
      if (res.ok) {
        const data = await res.json();
        setScripts(data.scripts || []);
      }
    } catch {
      // silent
    } finally {
      setScriptsLoading(false);
    }
  }, []);

  const fetchMonarx = useCallback(async (vmId: number) => {
    try {
      setMonarxLoading(true);
      const res = await fetch(`/api/admin/vps?action=monarx&vm_id=${vmId}`);
      if (res.ok) {
        const data = await res.json();
        setMonarx(data.monarx || null);
      }
    } catch {
      // silent
    } finally {
      setMonarxLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  useEffect(() => {
    if (selectedVM) {
      fetchVMDetail(selectedVM.id);
    }
  }, [selectedVM, fetchVMDetail]);

  // Fetch data when tabs are activated
  useEffect(() => {
    if (activeTab === "templates" && osTemplates.length === 0) {
      fetchOSTemplates();
    }
    if (activeTab === "datacenters" && dataCenters.length === 0) {
      fetchDataCenters();
    }
    if (activeTab === "firewall" && firewalls.length === 0) {
      fetchFirewalls();
    }
    if (activeTab === "snapshots" && selectedVM) {
      fetchSnapshot(selectedVM.id);
    }
    if (activeTab === "scripts" && scripts.length === 0) {
      fetchScripts();
    }
    if (activeTab === "settings" && selectedVM) {
      setSettingsHostname(selectedVM.hostname || "");
      fetchMonarx(selectedVM.id);
    }
  }, [activeTab, osTemplates.length, dataCenters.length, firewalls.length, scripts.length, selectedVM, fetchOSTemplates, fetchDataCenters, fetchFirewalls, fetchSnapshot, fetchScripts, fetchMonarx]);

  useEffect(() => {
    if (assignVM) {
      fetch("/api/admin/customers?limit=100")
        .then((r) => r.json())
        .then((d) => setAssignCustomers(d.customers || []))
        .catch(() => {});
    }
  }, [assignVM]);

  async function handleAssignVPS(e: React.FormEvent) {
    e.preventDefault();
    if (!assignVM) return;
    setAssignLoading(true);
    try {
      await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          vm_id: assignVM.id,
          userId: assignCustomer || null,
          hostname: assignVM.hostname,
          plan: assignVM.plan || "Unknown",
          ipv4: getIp(assignVM.ipv4),
          cpus: assignVM.cpus || 1,
          memory: assignVM.memory || 1024,
          disk: assignVM.disk || 20480,
          bandwidth: assignVM.bandwidth || 1024,
          os: assignVM.os || null,
          dataCenter: assignVM.data_center || assignVM.datacenter || null,
        }),
      });
      setAssignVM(null);
      setAssignCustomer("");
      fetchServers();
    } catch {
      // error
    } finally {
      setAssignLoading(false);
    }
  }

  async function handleAction(action: string, vmId: number) {
    setActionLoading(`${action}-${vmId}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, vm_id: vmId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to ${action} VM`);
      } else {
        fetchServers();
        if (selectedVM?.id === vmId) {
          fetchVMDetail(vmId);
        }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  }

  async function handleCreateBackup(vmId: number) {
    setActionLoading(`backup-${vmId}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_backup", vm_id: vmId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create backup");
      } else {
        fetchVMDetail(vmId);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRestoreBackup(vmId: number, backupId: number) {
    setActionLoading(`restore-${backupId}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore_backup",
          vm_id: vmId,
          backup_id: backupId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to restore backup");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteBackup(vmId: number, backupId: number) {
    setActionLoading(`delete-backup-${backupId}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_backup",
          vm_id: vmId,
          backup_id: backupId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete backup");
      } else {
        fetchVMDetail(vmId);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddSSHKey(e: React.FormEvent) {
    e.preventDefault();
    setSSHSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_ssh_key",
          name: sshName,
          key: sshKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add SSH key");
      } else {
        setSSHModalOpen(false);
        setSSHName("");
        setSSHKey("");
        if (selectedVM) fetchVMDetail(selectedVM.id);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSSHSubmitting(false);
    }
  }

  async function handleDeleteSSHKey(keyId: number) {
    setActionLoading(`delete-key-${keyId}`);
    try {
      const res = await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_ssh_key",
          key_id: keyId,
        }),
      });
      if (res.ok && selectedVM) {
        fetchVMDetail(selectedVM.id);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Firewall handlers ──────────────────────────────────────
  async function handleCreateFirewall(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading("create-firewall");
    try {
      const res = await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_firewall", name: firewallName }),
      });
      if (res.ok) {
        setFirewallModalOpen(false);
        setFirewallName("");
        fetchFirewalls();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create firewall");
      }
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteFirewall(firewallId: number) {
    setActionLoading(`del-fw-${firewallId}`);
    try {
      const res = await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_firewall", firewall_id: firewallId }),
      });
      if (res.ok) {
        fetchFirewalls();
        if (selectedFirewall?.id === firewallId) setSelectedFirewall(null);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete firewall");
      }
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleFirewallAction(firewallAction: string, firewallId: number) {
    if (!selectedVM) return;
    setActionLoading(`fw-${firewallAction}-${firewallId}`);
    try {
      const res = await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: firewallAction,
          vm_id: selectedVM.id,
          firewall_id: firewallId,
        }),
      });
      if (res.ok) {
        fetchFirewalls();
      } else {
        const data = await res.json();
        setError(data.error || `Failed to ${firewallAction}`);
      }
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreateFirewallRule(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFirewall) return;
    setActionLoading("create-fw-rule");
    try {
      const res = await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_firewall_rule",
          firewall_id: selectedFirewall.id,
          protocol: ruleProtocol,
          port: rulePort,
          source: ruleSource,
        }),
      });
      if (res.ok) {
        setFirewallRuleModal(false);
        setRulePort("");
        setRuleSource("any");
        fetchFirewallDetail(selectedFirewall.id);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create rule");
      }
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteFirewallRule(firewallId: number, ruleId: number) {
    setActionLoading(`del-rule-${ruleId}`);
    try {
      const res = await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_firewall_rule",
          firewall_id: firewallId,
          rule_id: ruleId,
        }),
      });
      if (res.ok) {
        fetchFirewallDetail(firewallId);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete rule");
      }
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Snapshot handlers ──────────────────────────────────────
  async function handleSnapshotAction(snapshotAction: string) {
    if (!selectedVM) return;
    setActionLoading(`snapshot-${snapshotAction}`);
    try {
      const res = await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: snapshotAction, vm_id: selectedVM.id }),
      });
      if (res.ok) {
        fetchSnapshot(selectedVM.id);
      } else {
        const data = await res.json();
        setError(data.error || `Failed to ${snapshotAction}`);
      }
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Script handlers ────────────────────────────────────────
  async function handleSaveScript(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading("save-script");
    try {
      const isEdit = !!editScript;
      const res = await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { action: "update_script", script_id: editScript.id, name: scriptName, content: scriptContent }
            : { action: "create_script", name: scriptName, content: scriptContent }
        ),
      });
      if (res.ok) {
        setScriptModalOpen(false);
        setEditScript(null);
        setScriptName("");
        setScriptContent("");
        fetchScripts();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save script");
      }
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteScript(scriptId: number) {
    setActionLoading(`del-script-${scriptId}`);
    try {
      const res = await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_script", script_id: scriptId }),
      });
      if (res.ok) {
        fetchScripts();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete script");
      }
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Docker handlers ────────────────────────────────────────
  async function handleDockerAction(dockerAction: string) {
    if (!selectedVM || !dockerProject) return;
    setActionLoading(`docker-${dockerAction}`);
    try {
      const res = await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: `docker_${dockerAction}`,
          vm_id: selectedVM.id,
          project_name: dockerProject,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || `Failed to ${dockerAction} docker project`);
      }
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Settings handlers ──────────────────────────────────────
  async function handleSettingsAction(settingsAction: string, payload: Record<string, string | number>) {
    if (!selectedVM) return;
    setActionLoading(`settings-${settingsAction}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: settingsAction, vm_id: selectedVM.id, ...payload }),
      });
      if (res.ok) {
        if (settingsAction === "set_hostname") fetchServers();
      } else {
        const data = await res.json();
        setError(data.error || `Failed: ${settingsAction}`);
      }
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  }

  const filtered = servers.filter(
    (s) =>
      !search ||
      s.hostname?.toLowerCase().includes(search.toLowerCase()) ||
      getIp(s.ipv4)?.toLowerCase().includes(search.toLowerCase()) ||
      s.owner?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { key: "overview", label: "Overview", icon: Server },
    { key: "metrics", label: "Metrics", icon: BarChart3 },
    { key: "backups", label: "Backups", icon: Archive },
    { key: "firewall", label: "Firewall", icon: Shield },
    { key: "snapshots", label: "Snapshots", icon: Archive },
    { key: "ssh", label: "SSH Keys", icon: Key },
    { key: "scripts", label: "Scripts", icon: FileText },
    { key: "docker", label: "Docker", icon: Server },
    { key: "settings", label: "Settings", icon: Settings },
    { key: "actions", label: "Actions", icon: Activity },
    { key: "templates", label: "OS Templates", icon: FileText },
    { key: "datacenters", label: "Data Centers", icon: MapPin },
  ];

  const statCards = [
    {
      label: "Total Servers",
      value: stats.total,
      icon: Server,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Running",
      value: stats.running,
      icon: Play,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Stopped",
      value: stats.stopped,
      icon: Square,
      color: "text-red-600 bg-red-50",
    },
  ];

  // ── Helper: resolve metric data ─────────────────────────────

  function getCpu(): MetricPoint[] {
    return getMetricArray(metrics, "cpu_usage").length > 0
      ? getMetricArray(metrics, "cpu_usage")
      : getMetricArray(metrics, "cpu");
  }

  function getRam(): MetricPoint[] {
    return getMetricArray(metrics, "ram_usage").length > 0
      ? getMetricArray(metrics, "ram_usage")
      : getMetricArray(metrics, "memory");
  }

  function getDisk(): MetricPoint[] {
    return getMetricArray(metrics, "disk_space").length > 0
      ? getMetricArray(metrics, "disk_space")
      : getMetricArray(metrics, "disk");
  }

  function getNetIn(): MetricPoint[] {
    return getMetricArray(metrics, "incoming_traffic").length > 0
      ? getMetricArray(metrics, "incoming_traffic")
      : metrics?.network?.in || [];
  }

  function getNetOut(): MetricPoint[] {
    return getMetricArray(metrics, "outgoing_traffic").length > 0
      ? getMetricArray(metrics, "outgoing_traffic")
      : metrics?.network?.out || [];
  }

  function getUptime(): MetricPoint[] {
    return getMetricArray(metrics, "uptime");
  }

  // ── Render detail panel ────────────────────────────────────

  function renderDetailPanel() {
    if (!selectedVM) return null;

    return (
      <Card className="mt-6">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-indigo-500" />
                {selectedVM.hostname}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {getIp(selectedVM.ipv4) || "No IP"} &middot;{" "}
                {selectedVM.os_name || selectedVM.os || "Unknown OS"} &middot;{" "}
                {selectedVM.data_center || selectedVM.datacenter || "Unknown DC"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedVM(null)}
            >
              Close
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 border-b border-gray-200 -mx-6 px-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab.key
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {detailLoading && activeTab !== "templates" && activeTab !== "datacenters" ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <span className="ml-2 text-sm text-gray-500">Loading...</span>
            </div>
          ) : (
            <>
              {activeTab === "overview" && renderOverview()}
              {activeTab === "metrics" && renderMetrics()}
              {activeTab === "backups" && renderBackups()}
              {activeTab === "firewall" && renderFirewall()}
              {activeTab === "snapshots" && renderSnapshots()}
              {activeTab === "ssh" && renderSSHKeys()}
              {activeTab === "scripts" && renderScripts()}
              {activeTab === "docker" && renderDocker()}
              {activeTab === "settings" && renderSettings()}
              {activeTab === "actions" && renderActions()}
              {activeTab === "templates" && renderTemplates()}
              {activeTab === "datacenters" && renderDataCenters()}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  function renderOverview() {
    if (!selectedVM) return null;
    const mem = selectedVM.memory || 0;
    const disk = selectedVM.disk || 0;
    const bw = selectedVM.bandwidth || 0;

    // Get live metrics for progress bars
    const cpuData = getCpu();
    const ramData = getRam();
    const diskData = getDisk();
    const latestCpu = getLatestValue(cpuData);
    const latestRam = getLatestValue(ramData);
    const latestDisk = getLatestValue(diskData);

    const ipv4List = getAllIps(selectedVM.ipv4);
    const ipv6List = getAllIps(selectedVM.ipv6);

    return (
      <div className="space-y-6">
        {/* Live resource usage */}
        {(cpuData.length > 0 || ramData.length > 0 || diskData.length > 0) && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500" />
              Live Resource Usage
            </h4>
            <div className="space-y-3 bg-gray-50 rounded-lg p-4">
              {cpuData.length > 0 && (
                <ProgressBar
                  label="CPU"
                  value={latestCpu}
                  max={100}
                  color={
                    latestCpu > 80
                      ? "bg-red-500"
                      : latestCpu > 60
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }
                />
              )}
              {ramData.length > 0 && (
                <ProgressBar
                  label="RAM"
                  value={latestRam}
                  max={100}
                  color={
                    latestRam > 80
                      ? "bg-red-500"
                      : latestRam > 60
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  }
                />
              )}
              {diskData.length > 0 && (
                <ProgressBar
                  label="Disk"
                  value={latestDisk}
                  max={100}
                  color={
                    latestDisk > 90
                      ? "bg-red-500"
                      : latestDisk > 70
                        ? "bg-amber-500"
                        : "bg-indigo-500"
                  }
                />
              )}
            </div>
          </div>
        )}

        {/* Specs cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Cpu className="h-4 w-4" />
              CPU
            </div>
            <p className="text-xl font-bold text-gray-900">
              {selectedVM.cpus || 0} vCPU
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <MemoryStick className="h-4 w-4" />
              Memory
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatBytes(mem * 1024 * 1024)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <HardDrive className="h-4 w-4" />
              Disk
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatBytes(disk * 1024 * 1024)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Globe className="h-4 w-4" />
              Bandwidth
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatBytes(bw * 1024 * 1024)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Server details */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Server Details
            </h4>
            <dl className="space-y-2">
              {[
                { label: "Hostname", value: selectedVM.hostname },
                {
                  label: "OS",
                  value: selectedVM.os_name || selectedVM.os || "--",
                },
                {
                  label: "Data Center",
                  value:
                    selectedVM.data_center || selectedVM.datacenter || "--",
                },
                { label: "Plan", value: selectedVM.plan || selectedVM.localPlan || "--" },
                {
                  label: "Created",
                  value: selectedVM.created_at
                    ? formatDate(selectedVM.created_at)
                    : "--",
                },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <dt className="text-gray-500">{item.label}</dt>
                  <dd className="font-medium text-gray-900">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* IP addresses */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              IP Addresses
            </h4>
            <div className="space-y-2">
              {ipv4List.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">IPv4</p>
                  {ipv4List.map((ip) => (
                    <div
                      key={ip.id || ip.address}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-md mb-1"
                    >
                      <div>
                        <span className="font-mono text-sm text-gray-900">{ip.address}</span>
                        {ip.ptr && (
                          <span className="text-xs text-gray-400 ml-2">PTR: {ip.ptr}</span>
                        )}
                      </div>
                      <button
                        onClick={() => copyToClipboard(ip.address)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy"
                      >
                        <Copy className={cn("h-3.5 w-3.5", copiedText === ip.address && "text-emerald-500")} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {ipv6List.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">IPv6</p>
                  {ipv6List.map((ip) => (
                    <div
                      key={ip.id || ip.address}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-md mb-1"
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <span className="font-mono text-sm text-gray-900 truncate block">{ip.address}</span>
                        {ip.ptr && (
                          <span className="text-xs text-gray-400">PTR: {ip.ptr}</span>
                        )}
                      </div>
                      <button
                        onClick={() => copyToClipboard(ip.address)}
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                        title="Copy"
                      >
                        <Copy className={cn("h-3.5 w-3.5", copiedText === ip.address && "text-emerald-500")} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {ipv4List.length === 0 && ipv6List.length === 0 && (
                <p className="text-sm text-gray-400">No IP addresses assigned</p>
              )}
            </div>
          </div>
        </div>

        {/* Owner */}
        {selectedVM.owner && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Owner</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">
                {selectedVM.owner.name}
              </p>
              <p className="text-sm text-gray-500">
                {selectedVM.owner.email}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderMetrics() {
    const cpuData = getCpu();
    const ramData = getRam();
    const diskData = getDisk();
    const netInData = getNetIn();
    const netOutData = getNetOut();
    const uptimeData = getUptime();

    const hasAnyMetrics =
      cpuData.length > 0 ||
      ramData.length > 0 ||
      diskData.length > 0 ||
      netInData.length > 0 ||
      netOutData.length > 0;

    if (!hasAnyMetrics) {
      return (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">
            No metrics available
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Metrics data is not available for this server yet
          </p>
        </div>
      );
    }

    const latestCPU = getLatestValue(cpuData);
    const latestRam = getLatestValue(ramData);
    const latestDisk = getLatestValue(diskData);
    const latestNetIn = getLatestValue(netInData);
    const latestNetOut = getLatestValue(netOutData);
    const latestUptime = getLatestValue(uptimeData);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">
            Resource Usage (Last 24h)
          </h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedVM) fetchVMDetail(selectedVM.id);
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Current values summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {cpuData.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <Cpu className="h-4 w-4 mx-auto text-gray-400 mb-1" />
              <p className={cn(
                "text-lg font-bold",
                latestCPU > 80 ? "text-red-600" : latestCPU > 60 ? "text-amber-600" : "text-emerald-600"
              )}>
                {latestCPU.toFixed(1)}%
              </p>
              <p className="text-[10px] text-gray-400 uppercase">CPU</p>
            </div>
          )}
          {ramData.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <MemoryStick className="h-4 w-4 mx-auto text-gray-400 mb-1" />
              <p className={cn(
                "text-lg font-bold",
                latestRam > 80 ? "text-red-600" : latestRam > 60 ? "text-amber-600" : "text-blue-600"
              )}>
                {latestRam.toFixed(1)}%
              </p>
              <p className="text-[10px] text-gray-400 uppercase">RAM</p>
            </div>
          )}
          {diskData.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <HardDrive className="h-4 w-4 mx-auto text-gray-400 mb-1" />
              <p className={cn(
                "text-lg font-bold",
                latestDisk > 90 ? "text-red-600" : latestDisk > 70 ? "text-amber-600" : "text-indigo-600"
              )}>
                {latestDisk.toFixed(1)}%
              </p>
              <p className="text-[10px] text-gray-400 uppercase">Disk</p>
            </div>
          )}
          {netInData.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <ArrowDownToLine className="h-4 w-4 mx-auto text-gray-400 mb-1" />
              <p className="text-lg font-bold text-cyan-600">
                {formatBytes(latestNetIn)}
              </p>
              <p className="text-[10px] text-gray-400 uppercase">Net In</p>
            </div>
          )}
          {netOutData.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <ArrowUpFromLine className="h-4 w-4 mx-auto text-gray-400 mb-1" />
              <p className="text-lg font-bold text-violet-600">
                {formatBytes(latestNetOut)}
              </p>
              <p className="text-[10px] text-gray-400 uppercase">Net Out</p>
            </div>
          )}
          {uptimeData.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <Clock className="h-4 w-4 mx-auto text-gray-400 mb-1" />
              <p className="text-lg font-bold text-emerald-600">
                {latestUptime.toFixed(1)}%
              </p>
              <p className="text-[10px] text-gray-400 uppercase">Uptime</p>
            </div>
          )}
        </div>

        {/* Progress bars */}
        <div className="space-y-3 bg-white border border-gray-100 rounded-lg p-4">
          {cpuData.length > 0 && (
            <ProgressBar
              label="CPU Usage"
              value={latestCPU}
              max={100}
              color={
                latestCPU > 80
                  ? "bg-red-500"
                  : latestCPU > 60
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }
            />
          )}
          {ramData.length > 0 && (
            <ProgressBar
              label="Memory Usage"
              value={latestRam}
              max={100}
              color={
                latestRam > 80
                  ? "bg-red-500"
                  : latestRam > 60
                    ? "bg-amber-500"
                    : "bg-blue-500"
              }
            />
          )}
          {diskData.length > 0 && (
            <ProgressBar
              label="Disk Usage"
              value={latestDisk}
              max={100}
              color={
                latestDisk > 90
                  ? "bg-red-500"
                  : latestDisk > 70
                    ? "bg-amber-500"
                    : "bg-indigo-500"
              }
            />
          )}
        </div>

        {/* Historical charts */}
        <div className="space-y-6">
          {cpuData.length > 1 && (
            <MiniBarChart
              data={cpuData}
              label="CPU History"
              color="bg-emerald-400"
              warnColor="bg-amber-400"
              dangerColor="bg-red-400"
              dangerThreshold={80}
              warnThreshold={60}
            />
          )}
          {ramData.length > 1 && (
            <MiniBarChart
              data={ramData}
              label="Memory History"
              color="bg-blue-400"
              warnColor="bg-amber-400"
              dangerColor="bg-red-400"
              dangerThreshold={80}
              warnThreshold={60}
            />
          )}
          {diskData.length > 1 && (
            <MiniBarChart
              data={diskData}
              label="Disk History"
              color="bg-indigo-400"
              warnColor="bg-amber-400"
              dangerColor="bg-red-400"
              dangerThreshold={90}
              warnThreshold={70}
            />
          )}
          {netInData.length > 1 && (
            <MiniBarChart
              data={netInData}
              label="Incoming Traffic"
              color="bg-cyan-400"
              warnColor="bg-cyan-500"
              dangerColor="bg-cyan-600"
              dangerThreshold={Infinity}
              warnThreshold={Infinity}
            />
          )}
          {netOutData.length > 1 && (
            <MiniBarChart
              data={netOutData}
              label="Outgoing Traffic"
              color="bg-violet-400"
              warnColor="bg-violet-500"
              dangerColor="bg-violet-600"
              dangerThreshold={Infinity}
              warnThreshold={Infinity}
            />
          )}
          {uptimeData.length > 1 && (
            <MiniBarChart
              data={uptimeData}
              label="Uptime"
              color="bg-emerald-400"
              warnColor="bg-emerald-400"
              dangerColor="bg-emerald-400"
              dangerThreshold={Infinity}
              warnThreshold={Infinity}
            />
          )}
        </div>
      </div>
    );
  }

  function renderBackups() {
    if (!selectedVM) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">
            Backups
            {backups.length > 0 && (
              <span className="ml-2 text-xs text-gray-400">({backups.length})</span>
            )}
          </h4>
          <Button
            size="sm"
            onClick={() => handleCreateBackup(selectedVM.id)}
            disabled={actionLoading === `backup-${selectedVM.id}`}
          >
            {actionLoading === `backup-${selectedVM.id}` ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Create Backup
          </Button>
        </div>

        {backups.length === 0 ? (
          <div className="text-center py-12">
            <Archive className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">No backups yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Create a backup to protect your data
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Restore Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell className="font-mono text-sm">
                    #{backup.id}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {backup.created_at
                      ? formatDateTime(backup.created_at)
                      : "--"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {backup.size ? formatBytes(backup.size) : "--"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {backup.restore_time || "--"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {backup.location || "--"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleRestoreBackup(selectedVM.id, backup.id)
                        }
                        disabled={
                          actionLoading === `restore-${backup.id}`
                        }
                      >
                        {actionLoading === `restore-${backup.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5 mr-1" />
                        )}
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() =>
                          handleDeleteBackup(selectedVM.id, backup.id)
                        }
                        disabled={
                          actionLoading === `delete-backup-${backup.id}`
                        }
                      >
                        {actionLoading === `delete-backup-${backup.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    );
  }

  function renderSSHKeys() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">
            SSH Keys
            {sshKeys.length > 0 && (
              <span className="ml-2 text-xs text-gray-400">({sshKeys.length})</span>
            )}
          </h4>
          <Button size="sm" onClick={() => setSSHModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add SSH Key
          </Button>
        </div>

        {sshKeys.length === 0 ? (
          <div className="text-center py-12">
            <Key className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">No SSH keys</p>
            <p className="text-xs text-gray-500 mt-1">
              Add an SSH key for secure server access
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sshKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Key className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {key.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-md font-mono">
                      {key.key?.substring(0, 50)}...
                    </p>
                    {key.created_at && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Added {formatDate(key.created_at)}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteSSHKey(key.id)}
                  disabled={actionLoading === `delete-key-${key.id}`}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  {actionLoading === `delete-key-${key.id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderActions() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">
            Action History
            {vmActions.length > 0 && (
              <span className="ml-2 text-xs text-gray-400">({vmActions.length})</span>
            )}
          </h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedVM) fetchVMDetail(selectedVM.id);
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>

        {vmActions.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">No actions recorded</p>
            <p className="text-xs text-gray-500 mt-1">
              VPS actions will appear here once performed
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vmActions.map((action, idx) => (
                <TableRow key={action.id || idx}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {action.name || "Unknown"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="custom"
                      className={statusColor(action.status || "unknown")}
                    >
                      {action.status || "unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {action.created_at
                      ? formatDateTime(action.created_at)
                      : "--"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {action.updated_at
                      ? formatDateTime(action.updated_at)
                      : "--"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    );
  }

  function renderTemplates() {
    if (templatesLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="ml-2 text-sm text-gray-500">Loading templates...</span>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">
            Available OS Templates
            {osTemplates.length > 0 && (
              <span className="ml-2 text-xs text-gray-400">({osTemplates.length})</span>
            )}
          </h4>
          <Button variant="outline" size="sm" onClick={fetchOSTemplates}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>

        {osTemplates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">No OS templates found</p>
            <p className="text-xs text-gray-500 mt-1">
              OS templates are not available at this time
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {osTemplates.map((template) => (
              <Card key={template.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                        <h5 className="font-medium text-gray-900 text-sm truncate">
                          {template.name}
                        </h5>
                      </div>
                      {template.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="custom" className="bg-indigo-50 text-indigo-700 ml-2 flex-shrink-0">
                      ID: {template.id}
                    </Badge>
                  </div>
                  {template.documentation && (
                    <a
                      href={template.documentation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mt-3"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Documentation
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Firewall tab ────────────────────────────────────────────
  function renderFirewall() {
    if (firewallsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="ml-2 text-sm text-gray-500">Loading firewalls...</span>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">
            Firewalls
            {firewalls.length > 0 && (
              <span className="ml-2 text-xs text-gray-400">({firewalls.length})</span>
            )}
          </h4>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchFirewalls}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setFirewallModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Firewall
            </Button>
          </div>
        </div>

        {/* Firewall list */}
        {firewalls.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">No firewalls</p>
            <p className="text-xs text-gray-500 mt-1">Create a firewall to protect your servers</p>
          </div>
        ) : (
          <div className="space-y-3">
            {firewalls.map((fw) => (
              <div
                key={fw.id}
                className={cn(
                  "p-4 rounded-lg border transition-colors cursor-pointer",
                  selectedFirewall?.id === fw.id
                    ? "border-indigo-300 bg-indigo-50/50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
                onClick={() => {
                  if (selectedFirewall?.id === fw.id) {
                    setSelectedFirewall(null);
                  } else {
                    fetchFirewallDetail(fw.id);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className={cn("h-5 w-5", fw.is_active ? "text-emerald-500" : "text-gray-400")} />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{fw.name}</p>
                      <p className="text-xs text-gray-500">ID: {fw.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Badge variant="custom" className={fw.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}>
                      {fw.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {selectedVM && (
                      <>
                        {!fw.is_active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFirewallAction("activate_firewall", fw.id)}
                            disabled={!!actionLoading}
                          >
                            {actionLoading === `fw-activate_firewall-${fw.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Wifi className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFirewallAction("deactivate_firewall", fw.id)}
                            disabled={!!actionLoading}
                          >
                            {actionLoading === `fw-deactivate_firewall-${fw.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <WifiOff className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFirewallAction("sync_firewall", fw.id)}
                          disabled={!!actionLoading}
                          title="Sync firewall"
                        >
                          {actionLoading === `fw-sync_firewall-${fw.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteFirewall(fw.id)}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === `del-fw-${fw.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Rules detail */}
                {selectedFirewall?.id === fw.id && selectedFirewall.rules && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Rules ({selectedFirewall.rules.length})
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFirewallRuleModal(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Rule
                      </Button>
                    </div>
                    {selectedFirewall.rules.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No rules configured</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Protocol</TableHead>
                            <TableHead>Port</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Direction</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedFirewall.rules.map((rule) => (
                            <TableRow key={rule.id}>
                              <TableCell>
                                <Badge variant="custom" className="bg-blue-50 text-blue-700">
                                  {rule.protocol || "any"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{rule.port || "*"}</TableCell>
                              <TableCell className="text-sm text-gray-600">{rule.source || rule.source_detail || "any"}</TableCell>
                              <TableCell className="text-sm text-gray-600">{rule.direction || "inbound"}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFirewallRule(fw.id, rule.id);
                                  }}
                                  disabled={actionLoading === `del-rule-${rule.id}`}
                                >
                                  {actionLoading === `del-rule-${rule.id}` ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Snapshots tab ─────────────────────────────────────────
  function renderSnapshots() {
    if (!selectedVM) return null;

    if (snapshotLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="ml-2 text-sm text-gray-500">Loading snapshot...</span>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">VM Snapshot</h4>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchSnapshot(selectedVM.id)}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {snapshot ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Archive className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Snapshot</p>
                    {snapshot.created_at && (
                      <p className="text-xs text-gray-500">Created {formatDateTime(snapshot.created_at)}</p>
                    )}
                  </div>
                </div>
                {snapshot.status && (
                  <Badge variant="custom" className={statusColor(snapshot.status)}>
                    {snapshot.status}
                  </Badge>
                )}
              </div>
              {snapshot.size && (
                <p className="text-sm text-gray-600 mb-4">Size: {formatBytes(snapshot.size)}</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSnapshotAction("restore_snapshot")}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "snapshot-restore_snapshot" ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5 mr-1" />
                  )}
                  Restore
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleSnapshotAction("delete_snapshot")}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "snapshot-delete_snapshot" ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-12">
            <Archive className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">No snapshot</p>
            <p className="text-xs text-gray-500 mt-1 mb-4">Create a snapshot to save the current state</p>
            <Button
              size="sm"
              onClick={() => handleSnapshotAction("create_snapshot")}
              disabled={!!actionLoading}
            >
              {actionLoading === "snapshot-create_snapshot" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Snapshot
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── Scripts tab ───────────────────────────────────────────
  function renderScripts() {
    if (scriptsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="ml-2 text-sm text-gray-500">Loading scripts...</span>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">
            Post-Install Scripts
            {scripts.length > 0 && (
              <span className="ml-2 text-xs text-gray-400">({scripts.length})</span>
            )}
          </h4>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchScripts}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditScript(null);
                setScriptName("");
                setScriptContent("");
                setScriptModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Script
            </Button>
          </div>
        </div>

        {scripts.length === 0 ? (
          <div className="text-center py-12">
            <Terminal className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">No scripts</p>
            <p className="text-xs text-gray-500 mt-1">Create post-install scripts to automate server setup</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scripts.map((script) => (
              <div key={script.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-indigo-500" />
                    <h5 className="font-medium text-gray-900 text-sm">{script.name}</h5>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditScript(script);
                        setScriptName(script.name);
                        setScriptContent(script.content);
                        setScriptModalOpen(true);
                      }}
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteScript(script.id)}
                      disabled={actionLoading === `del-script-${script.id}`}
                    >
                      {actionLoading === `del-script-${script.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
                <pre className="text-xs text-gray-600 bg-white border border-gray-200 rounded-md p-3 max-h-32 overflow-auto font-mono">
                  {script.content}
                </pre>
                {script.created_at && (
                  <p className="text-[10px] text-gray-400 mt-2">Created {formatDate(script.created_at)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Docker tab ─────────────────────────────────────────────
  function renderDocker() {
    if (!selectedVM) return null;

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">Docker Project Management</h4>
          <p className="text-xs text-gray-500">Manage Docker Compose projects on this VM</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g., my-app"
                  value={dockerProject}
                  onChange={(e) => setDockerProject(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Enter the Docker Compose project name</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button
                  onClick={() => handleDockerAction("start")}
                  disabled={!dockerProject || !!actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {actionLoading === "docker-start" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Start
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleDockerAction("stop")}
                  disabled={!dockerProject || !!actionLoading}
                >
                  {actionLoading === "docker-stop" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  Stop
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDockerAction("restart")}
                  disabled={!dockerProject || !!actionLoading}
                >
                  {actionLoading === "docker-restart" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Restart
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDockerAction("update")}
                  disabled={!dockerProject || !!actionLoading}
                >
                  {actionLoading === "docker-update" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Update
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Box className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Docker Compose</p>
              <p className="text-xs text-blue-700 mt-1">
                These actions manage Docker Compose projects running on your VPS.
                Enter the project name (as defined in your docker-compose.yml) to control it.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Settings tab ───────────────────────────────────────────
  function renderSettings() {
    if (!selectedVM) return null;

    return (
      <div className="space-y-6">
        <h4 className="text-sm font-medium text-gray-900">Server Settings</h4>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hostname */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-indigo-500" />
                Hostname
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={settingsHostname}
                onChange={(e) => setSettingsHostname(e.target.value)}
                placeholder="server.example.com"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSettingsAction("set_hostname", { hostname: settingsHostname })}
                  disabled={!settingsHostname || !!actionLoading}
                >
                  {actionLoading === "settings-set_hostname" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                  Set Hostname
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSettingsAction("reset_hostname", {})}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "settings-reset_hostname" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Root Password */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-500" />
                Root Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={settingsPassword}
                  onChange={(e) => setSettingsPassword(e.target.value)}
                  placeholder="New root password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  handleSettingsAction("set_root_password", { password: settingsPassword });
                  setSettingsPassword("");
                }}
                disabled={!settingsPassword || !!actionLoading}
              >
                {actionLoading === "settings-set_root_password" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                Set Root Password
              </Button>
            </CardContent>
          </Card>

          {/* Panel Password */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-500" />
                Panel Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Input
                  type={showPanelPassword ? "text" : "password"}
                  value={settingsPanelPassword}
                  onChange={(e) => setSettingsPanelPassword(e.target.value)}
                  placeholder="New panel password"
                />
                <button
                  type="button"
                  onClick={() => setShowPanelPassword(!showPanelPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPanelPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  handleSettingsAction("set_panel_password", { password: settingsPanelPassword });
                  setSettingsPanelPassword("");
                }}
                disabled={!settingsPanelPassword || !!actionLoading}
              >
                {actionLoading === "settings-set_panel_password" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                Set Panel Password
              </Button>
            </CardContent>
          </Card>

          {/* Nameservers */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                Nameservers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={settingsNs1}
                onChange={(e) => setSettingsNs1(e.target.value)}
                placeholder="Primary NS (e.g., ns1.example.com)"
              />
              <Input
                value={settingsNs2}
                onChange={(e) => setSettingsNs2(e.target.value)}
                placeholder="Secondary NS (e.g., ns2.example.com)"
              />
              <Button
                size="sm"
                onClick={() => handleSettingsAction("set_nameservers", { ns1: settingsNs1, ns2: settingsNs2 })}
                disabled={!settingsNs1 || !settingsNs2 || !!actionLoading}
              >
                {actionLoading === "settings-set_nameservers" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                Set Nameservers
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Danger zone */}
        <div className="border border-red-200 rounded-lg p-6 space-y-4">
          <h5 className="text-sm font-medium text-red-900 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Danger Zone
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Recreate VM */}
            <div className="p-4 bg-red-50/50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-1">Recreate VM</p>
              <p className="text-xs text-gray-500 mb-3">Destroys and recreates the VM. All data will be lost.</p>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => handleSettingsAction("recreate", {})}
                disabled={!!actionLoading}
              >
                {actionLoading === "settings-recreate" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                Recreate
              </Button>
            </div>

            {/* Recovery Mode */}
            <div className="p-4 bg-amber-50/50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-1">Recovery Mode</p>
              <p className="text-xs text-gray-500 mb-3">Boot into recovery to fix system issues.</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSettingsAction("enable_recovery", {})}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "settings-enable_recovery" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                  Enable
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSettingsAction("disable_recovery", {})}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "settings-disable_recovery" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                  Disable
                </Button>
              </div>
            </div>

            {/* Monarx */}
            <div className="p-4 bg-indigo-50/50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-1">Monarx Security</p>
              <p className="text-xs text-gray-500 mb-3">
                {monarxLoading ? "Loading..." : monarx ? "Monarx is installed" : "Monarx is not installed"}
              </p>
              <div className="flex gap-2">
                {!monarx ? (
                  <Button
                    size="sm"
                    onClick={() => handleSettingsAction("install_monarx", {})}
                    disabled={!!actionLoading || monarxLoading}
                  >
                    {actionLoading === "settings-install_monarx" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                    Install
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleSettingsAction("uninstall_monarx", {})}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === "settings-uninstall_monarx" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                    Uninstall
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PTR Records */}
        {selectedVM.ipv4 && getAllIps(selectedVM.ipv4).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-500" />
                PTR Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getAllIps(selectedVM.ipv4).map((ip) => (
                  <div key={ip.id || ip.address} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-mono text-sm text-gray-900">{ip.address}</span>
                      {ip.ptr && <span className="text-xs text-gray-500 ml-2">PTR: {ip.ptr}</span>}
                    </div>
                    <div className="flex gap-2">
                      {ip.id > 0 && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSettingsAction("create_ptr", { ip_address_id: ip.id })}
                            disabled={!!actionLoading}
                          >
                            {actionLoading === "settings-create_ptr" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Set PTR"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleSettingsAction("delete_ptr", { ip_address_id: ip.id })}
                            disabled={!!actionLoading}
                          >
                            {actionLoading === "settings-delete_ptr" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  function renderDataCenters() {
    if (datacentersLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="ml-2 text-sm text-gray-500">Loading data centers...</span>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">
            VPS Data Centers
            {dataCenters.length > 0 && (
              <span className="ml-2 text-xs text-gray-400">({dataCenters.length})</span>
            )}
          </h4>
          <Button variant="outline" size="sm" onClick={fetchDataCenters}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>

        {dataCenters.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">No data centers found</p>
            <p className="text-xs text-gray-500 mt-1">
              Data center information is not available at this time
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dataCenters.map((dc) => (
              <div
                key={dc.id}
                className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors"
              >
                <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0">
                  <MapPin className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{dc.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[dc.city, dc.country].filter(Boolean).join(", ") || dc.location || "Unknown location"}
                  </p>
                  <Badge
                    variant="custom"
                    className="bg-gray-100 text-gray-600 mt-2 text-[10px]"
                  >
                    ID: {dc.id}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">VPS Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage virtual private servers and resources
          </p>
        </div>
        <Button variant="outline" onClick={fetchServers} disabled={loading}>
          <RefreshCw
            className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <div className={cn("p-3 rounded-xl", stat.color)}>
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
              placeholder="Search by hostname, IP, or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* VPS Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Server className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900">
                {search ? "No servers found" : "No VPS servers yet"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {search
                  ? "Try adjusting your search terms"
                  : "VPS servers will appear here once provisioned"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((server) => {
            const isRunning =
              (server.state || "").toLowerCase() === "running";
            const isStopped =
              (server.state || "").toLowerCase() === "stopped";
            const isSelected = selectedVM?.id === server.id;
            const mem = server.memory || 0;
            const disk = server.disk || 0;

            return (
              <Card
                key={server.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  isSelected && "ring-2 ring-indigo-500 border-indigo-300"
                )}
                onClick={() => {
                  setSelectedVM(isSelected ? null : server);
                  setActiveTab("overview");
                }}
              >
                <CardContent className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          isRunning
                            ? "bg-emerald-50"
                            : isStopped
                              ? "bg-red-50"
                              : "bg-gray-50"
                        )}
                      >
                        <Server
                          className={cn(
                            "h-5 w-5",
                            isRunning
                              ? "text-emerald-500"
                              : isStopped
                                ? "text-red-500"
                                : "text-gray-500"
                          )}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {server.hostname}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {server.plan || server.localPlan || "VPS"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          isRunning
                            ? "bg-emerald-500"
                            : isStopped
                              ? "bg-red-500"
                              : "bg-yellow-500"
                        )}
                      />
                      <Badge
                        variant="custom"
                        className={statusColor(server.state || "unknown")}
                      >
                        {server.state || "unknown"}
                      </Badge>
                    </div>
                  </div>

                  {/* IP Addresses */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {getIp(server.ipv4) && (
                      <div className="flex items-center gap-1 text-xs bg-gray-100 rounded-md px-2 py-1">
                        <Globe className="h-3 w-3 text-gray-400" />
                        <span className="font-mono">{getIp(server.ipv4)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(getIp(server.ipv4));
                          }}
                          className="text-gray-400 hover:text-gray-600 ml-0.5"
                        >
                          <Copy className={cn("h-3 w-3", copiedText === getIp(server.ipv4) && "text-emerald-500")} />
                        </button>
                      </div>
                    )}
                    {getIp(server.ipv6) && (
                      <div className="flex items-center gap-1 text-xs bg-gray-100 rounded-md px-2 py-1">
                        <Globe className="h-3 w-3 text-gray-400" />
                        <span className="font-mono truncate max-w-[120px]">
                          {getIp(server.ipv6)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Specs */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="text-center">
                      <Cpu className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-gray-900">
                        {server.cpus || 0}
                      </p>
                      <p className="text-[10px] text-gray-400">vCPU</p>
                    </div>
                    <div className="text-center">
                      <MemoryStick className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-gray-900">
                        {formatBytes(mem * 1024 * 1024)}
                      </p>
                      <p className="text-[10px] text-gray-400">RAM</p>
                    </div>
                    <div className="text-center">
                      <HardDrive className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-gray-900">
                        {formatBytes(disk * 1024 * 1024)}
                      </p>
                      <p className="text-[10px] text-gray-400">Disk</p>
                    </div>
                    <div className="text-center">
                      <Globe className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {server.os_name || server.os || "--"}
                      </p>
                      <p className="text-[10px] text-gray-400">OS</p>
                    </div>
                  </div>

                  {/* Data center and owner */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>
                      DC:{" "}
                      {server.data_center || server.datacenter || "Unknown"}
                    </span>
                    <button
                      className="text-indigo-600 hover:text-indigo-800 font-medium truncate ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssignVM(server);
                        setAssignCustomer(server.userId || "");
                      }}
                    >
                      {server.owner
                        ? `Owner: ${server.owner.name}`
                        : "Assign Customer"}
                    </button>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    {isStopped && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmAction({
                            action: "start",
                            vmId: server.id,
                            label: "Start",
                          });
                        }}
                        disabled={
                          actionLoading === `start-${server.id}`
                        }
                      >
                        {actionLoading === `start-${server.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5 mr-1" />
                        )}
                        Start
                      </Button>
                    )}
                    {isRunning && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmAction({
                            action: "stop",
                            vmId: server.id,
                            label: "Stop",
                          });
                        }}
                        disabled={
                          actionLoading === `stop-${server.id}`
                        }
                      >
                        {actionLoading === `stop-${server.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Square className="h-3.5 w-3.5 mr-1" />
                        )}
                        Stop
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmAction({
                          action: "reboot",
                          vmId: server.id,
                          label: "Reboot",
                        });
                      }}
                      disabled={
                        actionLoading === `reboot-${server.id}`
                      }
                    >
                      {actionLoading === `reboot-${server.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      )}
                      Reboot
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail panel */}
      {renderDetailPanel()}

      {/* Confirm action modal */}
      <Modal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={`${confirmAction?.label} Server?`}
        description={`Are you sure you want to ${confirmAction?.label.toLowerCase()} this virtual machine? This action will take effect immediately.`}
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setConfirmAction(null)}>
            Cancel
          </Button>
          <Button
            className={
              confirmAction?.action === "stop"
                ? "bg-red-600 hover:bg-red-700"
                : ""
            }
            onClick={() => {
              if (confirmAction) {
                handleAction(confirmAction.action, confirmAction.vmId);
              }
            }}
            disabled={
              !!actionLoading
            }
          >
            {actionLoading && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {confirmAction?.label}
          </Button>
        </div>
      </Modal>

      {/* SSH Key modal */}
      <Modal
        open={sshModalOpen}
        onClose={() => {
          setSSHModalOpen(false);
          setSSHName("");
          setSSHKey("");
        }}
        title="Add SSH Key"
        description="Add a public SSH key for server access"
      >
        <form onSubmit={handleAddSSHKey} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Key Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., My Laptop Key"
              value={sshName}
              onChange={(e) => setSSHName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Public Key <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono min-h-[100px]"
              placeholder="ssh-rsa AAAA..."
              value={sshKey}
              onChange={(e) => setSSHKey(e.target.value)}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Paste your SSH public key (starts with ssh-rsa, ssh-ed25519, etc.)
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSSHModalOpen(false);
                setSSHName("");
                setSSHKey("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={sshSubmitting}>
              {sshSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Key
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Firewall Modal */}
      <Modal
        open={firewallModalOpen}
        onClose={() => {
          setFirewallModalOpen(false);
          setFirewallName("");
        }}
        title="Create Firewall"
        description="Create a new firewall to protect your servers"
      >
        <form onSubmit={handleCreateFirewall} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Firewall Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., Web Server Firewall"
              value={firewallName}
              onChange={(e) => setFirewallName(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setFirewallModalOpen(false); setFirewallName(""); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading === "create-firewall"}>
              {actionLoading === "create-firewall" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Firewall Rule Modal */}
      <Modal
        open={firewallRuleModal}
        onClose={() => {
          setFirewallRuleModal(false);
          setRulePort("");
          setRuleSource("any");
        }}
        title="Add Firewall Rule"
        description={`Add a rule to firewall: ${selectedFirewall?.name || ""}`}
      >
        <form onSubmit={handleCreateFirewallRule} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Protocol</label>
            <select
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={ruleProtocol}
              onChange={(e) => setRuleProtocol(e.target.value)}
            >
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
              <option value="icmp">ICMP</option>
              <option value="gre">GRE</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Port <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., 80, 443, 8000-9000"
              value={rulePort}
              onChange={(e) => setRulePort(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Source</label>
            <Input
              placeholder="e.g., any, 192.168.1.0/24"
              value={ruleSource}
              onChange={(e) => setRuleSource(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setFirewallRuleModal(false); setRulePort(""); setRuleSource("any"); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading === "create-fw-rule"}>
              {actionLoading === "create-fw-rule" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Rule
            </Button>
          </div>
        </form>
      </Modal>

      {/* Script Modal */}
      <Modal
        open={scriptModalOpen}
        onClose={() => {
          setScriptModalOpen(false);
          setEditScript(null);
          setScriptName("");
          setScriptContent("");
        }}
        title={editScript ? "Edit Script" : "Create Script"}
        description="Post-install scripts run automatically after server provisioning"
      >
        <form onSubmit={handleSaveScript} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Script Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., Setup NGINX"
              value={scriptName}
              onChange={(e) => setScriptName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Script Content <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono min-h-[200px]"
              placeholder="#!/bin/bash&#10;apt update && apt install -y nginx"
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setScriptModalOpen(false); setEditScript(null); setScriptName(""); setScriptContent(""); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading === "save-script"}>
              {actionLoading === "save-script" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editScript ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign VPS Modal */}
      <Modal
        open={!!assignVM}
        onClose={() => {
          setAssignVM(null);
          setAssignCustomer("");
        }}
        title={`Assign VPS — ${assignVM?.hostname || ""}`}
        description="Assign this VPS server to a customer"
      >
        <form onSubmit={handleAssignVPS} className="space-y-4">
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
              {assignCustomers.map((c) => (
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
                setAssignVM(null);
                setAssignCustomer("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={assignLoading}>
              {assignLoading && (
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
