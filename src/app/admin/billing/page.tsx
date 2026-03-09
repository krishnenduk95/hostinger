"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DollarSign,
  CreditCard,
  FileText,
  TrendingUp,
  Loader2,
  RefreshCw,
  Search,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Star,
  Send,
  Receipt,
  ShoppingCart,
  Cpu,
  HardDrive,
  Gauge,
  Wifi,
  Globe,
  MemoryStick,
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
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  statusColor,
} from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────

interface Subscription {
  id: string;
  name?: string;
  product_name?: string;
  status: string;
  price?: number;
  currency?: string;
  billing_period?: string;
  auto_renewal?: boolean;
  next_billing_date?: string;
  expires_at?: string;
  created_at?: string;
}

interface PaymentMethod {
  id: number;
  type?: string;
  card_type?: string;
  identifier?: string;
  last_four?: string;
  is_default?: boolean;
  expires_at?: string;
}

interface InvoiceUser {
  id: string;
  name: string;
  email: string;
}

interface InvoicePlan {
  id: string;
  name: string;
  slug: string;
}

interface Invoice {
  id: string;
  userId: string;
  planId?: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  dueDate: string;
  paidAt?: string;
  period?: string;
  createdAt: string;
  user: InvoiceUser;
  plan?: InvoicePlan | null;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
}

interface BillingStats {
  totalRevenue: number;
  pendingInvoices: number;
  pendingAmount: number;
  activeSubscriptions: number;
  monthlyRecurring: number;
}

interface CatalogPrice {
  id: number;
  name: string;
  currency: string;
  price: number;
  first_period_price: number;
  period: number;
  period_unit: string;
}

interface CatalogProduct {
  id: number;
  name: string;
  category: string;
  metadata?: {
    cpus?: number;
    memory?: number;
    bandwidth?: number;
    disk_space?: number;
    network?: number;
  };
  prices: CatalogPrice[];
}

// ── Skeleton loader ────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow>
      {[...Array(7)].map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full max-w-[120px]" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ── Helpers ────────────────────────────────────────────────

function formatPaisa(paisa: number, currency = "INR"): string {
  const amount = paisa / 100;
  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function periodLabel(period: number, unit: string): string {
  if (unit === "month" || unit === "months") {
    if (period === 1) return "Monthly";
    if (period === 3) return "Quarterly";
    if (period === 6) return "Semi-Annual";
    if (period === 12) return "Yearly";
    if (period === 24) return "2 Years";
    if (period === 36) return "3 Years";
    if (period === 48) return "4 Years";
    return `${period} Months`;
  }
  if (unit === "year" || unit === "years") {
    if (period === 1) return "Yearly";
    if (period === 2) return "2 Years";
    if (period === 3) return "3 Years";
    return `${period} Years`;
  }
  return `${period} ${unit}`;
}

function formatMemory(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  return `${mb} MB`;
}

function formatDisk(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  return `${mb} MB`;
}

function formatBandwidth(mb: number): string {
  if (mb >= 1024 * 1024) return `${(mb / (1024 * 1024)).toFixed(0)} TB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
  return `${mb} MB`;
}

// ── Main component ─────────────────────────────────────────

export default function BillingPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<BillingStats>({
    totalRevenue: 0,
    pendingInvoices: 0,
    pendingAmount: 0,
    activeSubscriptions: 0,
    monthlyRecurring: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("subscriptions");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Invoice modal state
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  // Invoice form
  const [formUserId, setFormUserId] = useState("");
  const [formPlanId, setFormPlanId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState("INR");
  const [formDescription, setFormDescription] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPeriod, setFormPeriod] = useState("monthly");

  // Catalog state
  const [catalogVps, setCatalogVps] = useState<CatalogProduct[]>([]);
  const [catalogDomains, setCatalogDomains] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogSubTab, setCatalogSubTab] = useState<"vps" | "domains">("vps");
  const [catalogSearch, setCatalogSearch] = useState("");

  const fetchBilling = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/billing");
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
        setPaymentMethods(data.paymentMethods || []);
        setInvoices(data.invoices || []);
        setStats(
          data.stats || {
            totalRevenue: 0,
            pendingInvoices: 0,
            pendingAmount: 0,
            activeSubscriptions: 0,
            monthlyRecurring: 0,
          }
        );
      }
    } catch {
      // Network error
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCatalog = useCallback(async () => {
    if (catalogLoaded) return;
    setCatalogLoading(true);
    try {
      const res = await fetch("/api/admin/billing/catalog");
      if (res.ok) {
        const data = await res.json();
        const grouped = data.grouped || {};
        setCatalogVps(grouped["VPS"] || []);
        setCatalogDomains(grouped["DOMAIN"] || []);
        setCatalogLoaded(true);
      }
    } catch {
      // Network error
    } finally {
      setCatalogLoading(false);
    }
  }, [catalogLoaded]);

  const fetchFormData = useCallback(async () => {
    try {
      const [custRes, planRes] = await Promise.all([
        fetch("/api/admin/customers?limit=100"),
        fetch("/api/admin/plans"),
      ]);
      if (custRes.ok) {
        const data = await custRes.json();
        setCustomers(data.customers || []);
      }
      if (planRes.ok) {
        const data = await planRes.json();
        setPlans(data.plans || []);
      }
    } catch {
      // Network error
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  useEffect(() => {
    if (invoiceModalOpen) {
      fetchFormData();
    }
  }, [invoiceModalOpen, fetchFormData]);

  useEffect(() => {
    if (activeTab === "catalog") {
      fetchCatalog();
    }
  }, [activeTab, fetchCatalog]);

  async function handleAction(action: string, payload: Record<string, unknown>) {
    const key = `${action}-${payload.invoiceId || payload.subscriptionId || payload.paymentMethodId || ""}`;
    setActionLoading(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to perform action: ${action}`);
      } else {
        fetchBilling();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    setInvoiceSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_invoice",
          userId: formUserId,
          planId: formPlanId || undefined,
          amount: Number(formAmount),
          currency: formCurrency,
          description: formDescription || undefined,
          dueDate: formDueDate,
          period: formPeriod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create invoice");
      } else {
        setInvoiceModalOpen(false);
        resetInvoiceForm();
        fetchBilling();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setInvoiceSubmitting(false);
    }
  }

  function resetInvoiceForm() {
    setFormUserId("");
    setFormPlanId("");
    setFormAmount("");
    setFormCurrency("INR");
    setFormDescription("");
    setFormDueDate("");
    setFormPeriod("monthly");
  }

  const tabs = [
    { key: "subscriptions", label: "Subscriptions", icon: Receipt },
    { key: "payment_methods", label: "Payment Methods", icon: CreditCard },
    { key: "invoices", label: "Invoices", icon: FileText },
    { key: "catalog", label: "Catalog", icon: ShoppingCart },
  ];

  const statCards = [
    {
      label: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Pending Invoices",
      value: `${stats.pendingInvoices}`,
      subtext: formatCurrency(stats.pendingAmount),
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Active Subscriptions",
      value: `${stats.activeSubscriptions}`,
      icon: CheckCircle,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Monthly Recurring",
      value: formatCurrency(stats.monthlyRecurring),
      icon: TrendingUp,
      color: "text-indigo-600 bg-indigo-50",
    },
  ];

  // ── Subscriptions tab ────────────────────────────────────

  function renderSubscriptions() {
    const filtered = subscriptions.filter(
      (s) =>
        !search ||
        (s.name || s.product_name || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        s.status?.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Auto-Renew</TableHead>
            <TableHead>Next Billing</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">
                    {search
                      ? "No subscriptions found"
                      : "No subscriptions yet"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {search
                      ? "Try adjusting your search"
                      : "Subscriptions from Hostinger will appear here"}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((sub) => {
              const autoRenew = sub.auto_renewal ?? false;
              const toggleKey = `toggle_auto_renewal-${sub.id}`;

              return (
                <TableRow key={sub.id}>
                  <TableCell>
                    <span className="font-medium text-gray-900">
                      {sub.name || sub.product_name || "Unnamed"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="custom"
                      className={statusColor(sub.status || "active")}
                    >
                      {sub.status || "active"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sub.price
                      ? formatCurrency(sub.price, sub.currency || "INR")
                      : "--"}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {sub.billing_period || "--"}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() =>
                        handleAction("toggle_auto_renewal", {
                          subscriptionId: sub.id,
                          enable: !autoRenew,
                        })
                      }
                      disabled={actionLoading === toggleKey}
                      className="flex items-center gap-1 text-sm"
                    >
                      {actionLoading === toggleKey ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : autoRenew ? (
                        <ToggleRight className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-gray-400" />
                      )}
                      <span
                        className={
                          autoRenew ? "text-emerald-600" : "text-gray-400"
                        }
                      >
                        {autoRenew ? "On" : "Off"}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {sub.next_billing_date || sub.expires_at
                      ? formatDate(sub.next_billing_date || sub.expires_at || "")
                      : "--"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleAction("toggle_auto_renewal", {
                          subscriptionId: sub.id,
                          enable: !autoRenew,
                        })
                      }
                      disabled={actionLoading === toggleKey}
                    >
                      {autoRenew ? "Disable Renewal" : "Enable Renewal"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    );
  }

  // ── Payment Methods tab ──────────────────────────────────

  function renderPaymentMethods() {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-32" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (paymentMethods.length === 0) {
      return (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">
            No payment methods
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Payment methods from Hostinger will appear here
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paymentMethods.map((method) => {
          const isDefault = method.is_default ?? false;
          const deleteKey = `delete_payment_method-${method.id}`;
          const defaultKey = `set_default_payment-${method.id}`;

          return (
            <Card
              key={method.id}
              className={
                isDefault ? "ring-2 ring-indigo-500 border-indigo-300" : ""
              }
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {method.card_type || method.type || "Card"}
                      </p>
                      <p className="text-sm text-gray-500 font-mono">
                        {method.identifier ||
                          (method.last_four
                            ? `**** **** **** ${method.last_four}`
                            : "--")}
                      </p>
                    </div>
                  </div>
                  {isDefault && (
                    <Badge variant="info" className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Default
                    </Badge>
                  )}
                </div>

                {method.expires_at && (
                  <p className="text-xs text-gray-400 mb-4">
                    Expires: {formatDate(method.expires_at)}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  {!isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleAction("set_default_payment", {
                          paymentMethodId: method.id,
                        })
                      }
                      disabled={actionLoading === defaultKey}
                    >
                      {actionLoading === defaultKey ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Star className="h-3.5 w-3.5 mr-1" />
                      )}
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() =>
                      handleAction("delete_payment_method", {
                        paymentMethodId: method.id,
                      })
                    }
                    disabled={actionLoading === deleteKey}
                  >
                    {actionLoading === deleteKey ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                    )}
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // ── Invoices tab ─────────────────────────────────────────

  function renderInvoices() {
    const filtered = invoices.filter(
      (inv) =>
        !search ||
        inv.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        inv.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        inv.description?.toLowerCase().includes(search.toLowerCase()) ||
        inv.status?.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div>
        <div className="flex items-center justify-end mb-4">
          <Button onClick={() => setInvoiceModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Paid At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-900">
                      {search ? "No invoices found" : "No invoices yet"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {search
                        ? "Try adjusting your search"
                        : "Create your first invoice to get started"}
                    </p>
                    {!search && (
                      <Button
                        size="sm"
                        className="mt-4"
                        onClick={() => setInvoiceModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Invoice
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((invoice) => {
                const markPaidKey = `mark_paid-${invoice.id}`;
                const markOverdueKey = `mark_overdue-${invoice.id}`;
                const cancelKey = `cancel_invoice-${invoice.id}`;
                const isPending = invoice.status === "PENDING";
                const isOverdue = invoice.status === "OVERDUE";

                return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {invoice.user?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {invoice.user?.email || ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                      {invoice.description ||
                        invoice.plan?.name ||
                        "--"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="custom"
                        className={statusColor(invoice.status.toLowerCase())}
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {invoice.period || "--"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(invoice.dueDate)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {invoice.paidAt
                        ? formatDateTime(invoice.paidAt)
                        : "--"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {(isPending || isOverdue) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-emerald-600"
                            onClick={() =>
                              handleAction("mark_paid", {
                                invoiceId: invoice.id,
                              })
                            }
                            disabled={actionLoading === markPaidKey}
                          >
                            {actionLoading === markPaidKey ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            )}
                            Paid
                          </Button>
                        )}
                        {isPending && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-600 hover:bg-amber-50"
                            onClick={() =>
                              handleAction("mark_overdue", {
                                invoiceId: invoice.id,
                              })
                            }
                            disabled={actionLoading === markOverdueKey}
                            title="Send Reminder"
                          >
                            {actionLoading === markOverdueKey ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                        {(isPending || isOverdue) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() =>
                              handleAction("cancel_invoice", {
                                invoiceId: invoice.id,
                              })
                            }
                            disabled={actionLoading === cancelKey}
                            title="Cancel Invoice"
                          >
                            {actionLoading === cancelKey ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  // ── Catalog tab ──────────────────────────────────────────

  function renderCatalog() {
    if (catalogLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-3" />
          <span className="text-sm text-gray-500">Loading catalog...</span>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Sub-tabs */}
        <div className="flex gap-1 border-b border-gray-100 px-2">
          <button
            onClick={() => {
              setCatalogSubTab("vps");
              setCatalogSearch("");
            }}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              catalogSubTab === "vps"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            VPS Plans
            {catalogVps.length > 0 && (
              <Badge variant="default" className="ml-1 text-[10px] px-1.5">
                {catalogVps.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => {
              setCatalogSubTab("domains");
              setCatalogSearch("");
            }}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              catalogSubTab === "domains"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            Domain Pricing
            {catalogDomains.length > 0 && (
              <Badge variant="default" className="ml-1 text-[10px] px-1.5">
                {catalogDomains.length}
              </Badge>
            )}
          </button>
        </div>

        {catalogSubTab === "vps" ? renderVpsPlans() : renderDomainPricing()}
      </div>
    );
  }

  function renderVpsPlans() {
    const filtered = catalogVps.filter(
      (p) =>
        !catalogSearch ||
        p.name.toLowerCase().includes(catalogSearch.toLowerCase())
    );

    if (filtered.length === 0 && !catalogSearch) {
      return (
        <div className="text-center py-12">
          <Cpu className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">No VPS plans available</p>
          <p className="text-xs text-gray-500 mt-1">
            VPS plans from the Hostinger catalog will appear here
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4 px-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search VPS plans..."
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              No VPS plans match &quot;{catalogSearch}&quot;
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((plan) => {
              const meta = plan.metadata || {};
              const sortedPrices = [...(plan.prices || [])].sort(
                (a, b) => a.period - b.period
              );
              const cheapest = sortedPrices.length > 0
                ? sortedPrices.reduce((min, p) =>
                    p.price / p.period < min.price / min.period ? p : min
                  , sortedPrices[0])
                : null;

              return (
                <Card key={plan.id} className="overflow-hidden">
                  <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      {cheapest && (
                        <Badge variant="custom" className="bg-indigo-100 text-indigo-700 text-xs">
                          from {formatPaisa(cheapest.price / cheapest.period, cheapest.currency)}/mo
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {/* Specs */}
                    <div className="grid grid-cols-2 gap-3">
                      {meta.cpus !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                          <Cpu className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <span className="text-gray-600">
                            <span className="font-medium text-gray-900">{meta.cpus}</span> vCPU{meta.cpus > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      {meta.memory !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                          <MemoryStick className="h-4 w-4 text-purple-500 flex-shrink-0" />
                          <span className="text-gray-600">
                            <span className="font-medium text-gray-900">{formatMemory(meta.memory)}</span> RAM
                          </span>
                        </div>
                      )}
                      {meta.disk_space !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                          <HardDrive className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          <span className="text-gray-600">
                            <span className="font-medium text-gray-900">{formatDisk(meta.disk_space)}</span> SSD
                          </span>
                        </div>
                      )}
                      {meta.bandwidth !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                          <Gauge className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          <span className="text-gray-600">
                            <span className="font-medium text-gray-900">{formatBandwidth(meta.bandwidth)}</span> BW
                          </span>
                        </div>
                      )}
                      {meta.network !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                          <Wifi className="h-4 w-4 text-teal-500 flex-shrink-0" />
                          <span className="text-gray-600">
                            <span className="font-medium text-gray-900">{meta.network}</span> Mbps
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Pricing tiers */}
                    {sortedPrices.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pricing
                        </p>
                        <div className="space-y-1">
                          {sortedPrices.map((price) => (
                            <div
                              key={price.id}
                              className="flex items-center justify-between py-1.5 px-2 rounded-md bg-gray-50 text-sm"
                            >
                              <span className="text-gray-600">
                                {periodLabel(price.period, price.period_unit)}
                              </span>
                              <div className="text-right">
                                {price.first_period_price !== price.price && price.first_period_price > 0 && (
                                  <span className="text-xs text-emerald-600 mr-2">
                                    1st: {formatPaisa(price.first_period_price, price.currency)}
                                  </span>
                                )}
                                <span className="font-medium text-gray-900">
                                  {formatPaisa(price.price, price.currency)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderDomainPricing() {
    const filtered = catalogDomains.filter(
      (d) =>
        !catalogSearch ||
        d.name.toLowerCase().includes(catalogSearch.toLowerCase())
    );

    if (filtered.length === 0 && !catalogSearch) {
      return (
        <div className="text-center py-12">
          <Globe className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">No domain TLDs available</p>
          <p className="text-xs text-gray-500 mt-1">
            Domain pricing from the Hostinger catalog will appear here
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4 px-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search TLDs (e.g. .com, .in, .io)..."
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              No TLDs match &quot;{catalogSearch}&quot;
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 px-1">
              Showing {filtered.length} of {catalogDomains.length} TLDs
            </p>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 bg-white z-10">TLD</TableHead>
                    <TableHead className="sticky top-0 bg-white z-10">Cheapest Price</TableHead>
                    <TableHead className="sticky top-0 bg-white z-10">Pricing Tiers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((domain) => {
                    const sortedPrices = [...(domain.prices || [])].sort(
                      (a, b) => a.period - b.period
                    );
                    const cheapest =
                      sortedPrices.length > 0
                        ? sortedPrices.reduce((min, p) =>
                            p.price < min.price ? p : min
                          , sortedPrices[0])
                        : null;

                    return (
                      <TableRow key={domain.id}>
                        <TableCell>
                          <span className="font-medium text-gray-900">
                            {domain.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          {cheapest ? (
                            <div>
                              <span className="font-semibold text-indigo-600">
                                {formatPaisa(cheapest.price, cheapest.currency)}
                              </span>
                              <span className="text-xs text-gray-400 ml-1">
                                / {periodLabel(cheapest.period, cheapest.period_unit)}
                              </span>
                              {cheapest.first_period_price > 0 &&
                                cheapest.first_period_price !== cheapest.price && (
                                  <div className="text-xs text-emerald-600">
                                    1st period: {formatPaisa(cheapest.first_period_price, cheapest.currency)}
                                  </div>
                                )}
                            </div>
                          ) : (
                            <span className="text-gray-300">--</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {sortedPrices.map((price) => (
                              <span
                                key={price.id}
                                className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-100 rounded-md px-2 py-1"
                                title={`${periodLabel(price.period, price.period_unit)}: ${formatPaisa(price.price, price.currency)}${
                                  price.first_period_price !== price.price && price.first_period_price > 0
                                    ? ` (1st: ${formatPaisa(price.first_period_price, price.currency)})`
                                    : ""
                                }`}
                              >
                                <span className="text-gray-500">
                                  {periodLabel(price.period, price.period_unit)}:
                                </span>
                                <span className="font-medium text-gray-700">
                                  {formatPaisa(price.price, price.currency)}
                                </span>
                              </span>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
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
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage subscriptions, payments, and invoices
          </p>
        </div>
        <Button variant="outline" onClick={fetchBilling} disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? (
                      <span className="inline-block h-7 w-16 bg-gray-200 rounded animate-pulse" />
                    ) : (
                      stat.value
                    )}
                  </p>
                  {"subtext" in stat && stat.subtext && !loading && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {stat.subtext}
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Tabs */}
      <Card>
        <CardContent className="p-4 pb-0">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search subscriptions, invoices, customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-1 border-b border-gray-200 -mx-4 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.key === "invoices" && !loading && invoices.length > 0 && (
                  <Badge variant="default" className="ml-1 text-[10px] px-1.5">
                    {invoices.length}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tab content */}
      <Card>
        <CardContent className="p-0">
          {activeTab === "subscriptions" && renderSubscriptions()}
          {activeTab === "payment_methods" && (
            <div className="p-6">{renderPaymentMethods()}</div>
          )}
          {activeTab === "invoices" && (
            <div className="p-6">{renderInvoices()}</div>
          )}
          {activeTab === "catalog" && (
            <div className="p-6">{renderCatalog()}</div>
          )}
        </CardContent>
      </Card>

      {/* Create Invoice Modal */}
      <Modal
        open={invoiceModalOpen}
        onClose={() => {
          setInvoiceModalOpen(false);
          resetInvoiceForm();
          setError(null);
        }}
        title="Create Invoice"
        description="Create a new invoice for a customer"
        className="max-w-xl"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={formUserId}
              onChange={(e) => setFormUserId(e.target.value)}
              required
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
              Plan (Optional)
            </label>
            <select
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={formPlanId}
              onChange={(e) => {
                setFormPlanId(e.target.value);
                const plan = plans.find((p) => p.id === e.target.value);
                if (plan) {
                  setFormAmount(String(plan.price));
                  setFormDescription(plan.name);
                }
              }}
            >
              <option value="">-- Select Plan --</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatCurrency(p.price)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Amount <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Currency
              </label>
              <select
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value)}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <Input
              placeholder="Invoice description..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Due Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Billing Period
              </label>
              <select
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={formPeriod}
                onChange={(e) => setFormPeriod(e.target.value)}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One-time</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setInvoiceModalOpen(false);
                resetInvoiceForm();
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={invoiceSubmitting}>
              {invoiceSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Invoice
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
