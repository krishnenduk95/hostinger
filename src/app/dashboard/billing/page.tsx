"use client";

import { useEffect, useState } from "react";
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
  CreditCard,
  FileText,
  Loader2,
  RefreshCw,
  IndianRupee,
  Clock,
  CheckCircle,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { formatCurrency, formatDate, statusColor } from "@/lib/utils";

interface Invoice {
  id: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt: string | null;
  period: string | null;
  plan: {
    id: string;
    name: string;
    type: string;
  } | null;
  createdAt: string;
}

interface BillingStats {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Pending", value: "PENDING" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function CustomerBillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<BillingStats>({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchBilling();
  }, [filter]);

  async function fetchBilling() {
    setLoading(true);
    try {
      const url =
        filter === "all"
          ? "/api/customer/billing"
          : `/api/customer/billing?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setInvoices(data.invoices || []);
      setStats(
        data.stats || {
          total: 0,
          paid: 0,
          pending: 0,
          overdue: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
        }
      );
    } catch (error) {
      console.error("Failed to fetch billing:", error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "PAID":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "PENDING":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "OVERDUE":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-500 mt-1">
            View your invoices and payment history.
          </p>
        </div>
        <Button variant="outline" onClick={fetchBilling} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <IndianRupee className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Billed</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(stats.totalAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Paid</p>
                <p className="text-lg font-bold text-emerald-600">
                  {formatCurrency(stats.paidAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-lg font-bold text-amber-600">
                  {formatCurrency(stats.pendingAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Invoices</p>
                <p className="text-lg font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              Invoices
            </CardTitle>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilter(opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      filter === opt.value
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                No invoices found
              </h3>
              <p className="text-gray-500 mt-1 text-sm">
                {filter !== "all"
                  ? "No invoices match the selected filter."
                  : "Your invoices will appear here."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Paid Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getStatusIcon(invoice.status)}
                        <span className="font-medium text-gray-900">
                          {invoice.description || "Invoice"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {invoice.plan ? (
                        <div>
                          <p className="text-sm text-gray-900">
                            {invoice.plan.name}
                          </p>
                          <p className="text-xs text-gray-400 capitalize">
                            {invoice.plan.type}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </span>
                      {invoice.period && (
                        <span className="text-xs text-gray-400 ml-1">
                          / {invoice.period}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="custom"
                        className={statusColor(invoice.status)}
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-600">
                        {formatDate(invoice.dueDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {invoice.paidAt ? (
                        <span className="text-emerald-600">
                          {formatDate(invoice.paidAt)}
                        </span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
