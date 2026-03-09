"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Globe,
  Link2,
  Server,
  IndianRupee,
  TicketCheck,
  Cloud,
  RefreshCw,
  Eye,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { formatCurrency, formatDate, statusColor } from "@/lib/utils";

interface Stats {
  local: {
    customers: number;
    websites: number;
    domains: number;
    vps: number;
    revenue: number;
    openTickets: number;
  };
  hostinger: {
    websitesCount: number;
    domainsCount: number;
    vpsCount: number;
    activeSubscriptions: number;
  };
}

interface Customer {
  id: string;
  name: string;
  email: string;
  company: string | null;
  status: string;
  createdAt: string;
  _count: {
    websites: number;
    domains: number;
    vps: number;
  };
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-12 w-12 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonTable() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    try {
      const [statsRes, customersRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/customers?limit=5"),
      ]);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.customers || []);
      }
    } catch {
      // silently handle network errors
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    fetchData();
  }

  const statCards = stats
    ? [
        {
          label: "Customers",
          value: stats.local.customers,
          icon: Users,
          color: "text-blue-600",
          bg: "bg-blue-50",
          accent: "border-l-blue-500",
        },
        {
          label: "Websites",
          value: stats.local.websites,
          icon: Globe,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
          accent: "border-l-emerald-500",
        },
        {
          label: "Domains",
          value: stats.local.domains,
          icon: Link2,
          color: "text-violet-600",
          bg: "bg-violet-50",
          accent: "border-l-violet-500",
        },
        {
          label: "VPS Servers",
          value: stats.local.vps,
          icon: Server,
          color: "text-orange-600",
          bg: "bg-orange-50",
          accent: "border-l-orange-500",
        },
        {
          label: "Revenue",
          value: formatCurrency(stats.local.revenue),
          icon: IndianRupee,
          color: "text-green-600",
          bg: "bg-green-50",
          accent: "border-l-green-500",
        },
        {
          label: "Open Tickets",
          value: stats.local.openTickets,
          icon: TicketCheck,
          color: "text-rose-600",
          bg: "bg-rose-50",
          accent: "border-l-rose-500",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of your reseller platform
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading
          ? [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((card) => (
              <Card
                key={card.label}
                className={`border-l-4 ${card.accent} hover:shadow-md transition-shadow`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {card.label}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {card.value}
                      </p>
                    </div>
                    <div className={`${card.bg} p-3 rounded-xl`}>
                      <card.icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Hostinger Resources */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2.5 rounded-xl">
              <Cloud className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-base">Hostinger Resources</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Live data from Hostinger API
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl animate-pulse">
                  <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
                  <div className="h-7 w-10 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-100">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">
                  Websites
                </p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  {stats.hostinger.websitesCount}
                </p>
              </div>
              <div className="p-4 bg-violet-50/70 rounded-xl border border-violet-100">
                <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">
                  Domains
                </p>
                <p className="text-2xl font-bold text-violet-900 mt-1">
                  {stats.hostinger.domainsCount}
                </p>
              </div>
              <div className="p-4 bg-orange-50/70 rounded-xl border border-orange-100">
                <p className="text-xs font-medium text-orange-600 uppercase tracking-wider">
                  VPS Instances
                </p>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  {stats.hostinger.vpsCount}
                </p>
              </div>
              <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-100">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">
                  Subscriptions
                </p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {stats.hostinger.activeSubscriptions}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Unable to load Hostinger data.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bottom Row: Recent Customers + Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Customers */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2.5 rounded-xl">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-base">Recent Customers</CardTitle>
              </div>
              <a href="/admin/customers">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </a>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonTable />
            ) : customers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No customers yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Resources</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="font-medium text-gray-900">
                          {customer.name}
                        </div>
                        {customer.company && (
                          <div className="text-xs text-gray-500">
                            {customer.company}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {customer.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span title="Websites">
                            {customer._count.websites}W
                          </span>
                          <span className="text-gray-300">|</span>
                          <span title="Domains">
                            {customer._count.domains}D
                          </span>
                          <span className="text-gray-300">|</span>
                          <span title="VPS">{customer._count.vps}V</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="custom"
                          className={statusColor(customer.status || "active")}
                        >
                          {customer.status || "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {formatDate(customer.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <a href={`/admin/customers/${customer.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Tickets Preview */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-rose-50 p-2.5 rounded-xl">
                <TicketCheck className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <CardTitle className="text-base">Open Tickets</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Requires attention
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
                      <div className="h-2 w-2/3 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats && stats.local.openTickets > 0 ? (
              <div className="text-center py-6">
                <div className="bg-rose-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TicketCheck className="h-8 w-8 text-rose-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.local.openTickets}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  tickets need your attention
                </p>
                <a href="/admin/tickets" className="block mt-4">
                  <Button variant="outline" size="sm" className="w-full">
                    View Tickets
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </a>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="bg-emerald-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TicketCheck className="h-8 w-8 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-gray-900">All clear!</p>
                <p className="text-xs text-gray-500 mt-1">
                  No open tickets at the moment
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
