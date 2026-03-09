"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Server,
  FileText,
  LifeBuoy,
  ArrowRight,
  Rocket,
  Settings,
  CreditCard,
  Layers,
  Activity,
  TrendingUp,
  Clock,
} from "lucide-react";

interface DashboardStats {
  websites: number;
  domains: number;
  vps: number;
  pendingInvoices: number;
  pendingAmount: number;
}

interface RecentTicket {
  id: string;
  subject: string;
  status: string;
  updatedAt: string;
}

export default function CustomerDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    websites: 0,
    domains: 0,
    vps: 0,
    pendingInvoices: 0,
    pendingAmount: 0,
  });
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Check user role first — redirect admin to /admin
      const meRes = await fetch("/api/auth/me");
      if (meRes.status === 401) {
        window.location.href = "/login";
        return;
      }
      const meData = await meRes.json();
      if (meData.user?.role === "ADMIN") {
        window.location.href = "/admin";
        return;
      }
      if (meData.user?.name) {
        setUserName(meData.user.name);
      }

      const responses = await Promise.all([
        fetch("/api/customer/websites"),
        fetch("/api/customer/domains"),
        fetch("/api/customer/vps"),
        fetch("/api/customer/billing"),
        fetch("/api/customer/support"),
      ]);

      // If any returns 401, redirect to login
      if (responses.some((r) => r.status === 401 || r.status === 403)) {
        window.location.href = "/login";
        return;
      }

      const [websitesRes, domainsRes, vpsRes, billingRes, supportRes] =
        await Promise.all(responses.map((r) => r.json()));

      setStats({
        websites: websitesRes.stats?.total || 0,
        domains: domainsRes.stats?.total || 0,
        vps: vpsRes.servers?.length || 0,
        pendingInvoices: billingRes.stats?.pending || 0,
        pendingAmount: billingRes.stats?.pendingAmount || 0,
      });

      setRecentTickets((supportRes.tickets || []).slice(0, 3));
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      title: "My Websites",
      value: stats.websites,
      icon: Globe,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/dashboard/websites",
    },
    {
      title: "My Domains",
      value: stats.domains,
      icon: Layers,
      color: "text-violet-600",
      bg: "bg-violet-50",
      href: "/dashboard/domains",
    },
    {
      title: "My VPS",
      value: stats.vps,
      icon: Server,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/dashboard/vps",
    },
    {
      title: "Pending Invoices",
      value: stats.pendingInvoices,
      icon: CreditCard,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/dashboard/billing",
    },
  ];

  const quickActions = [
    {
      title: "Deploy Website",
      description: "View and manage your hosted websites",
      icon: Rocket,
      href: "/dashboard/websites",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Manage DNS",
      description: "Configure DNS records for your domains",
      icon: Settings,
      href: "/dashboard/dns",
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      title: "View Invoices",
      description: "Check billing history and pending payments",
      icon: FileText,
      href: "/dashboard/billing",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Get Support",
      description: "Create a ticket or check existing ones",
      icon: LifeBuoy,
      href: "/dashboard/support",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  function getStatusBadge(status: string) {
    const variants: Record<string, "success" | "warning" | "info" | "default"> =
      {
        OPEN: "info",
        IN_PROGRESS: "warning",
        RESOLVED: "success",
        CLOSED: "default",
      };
    return variants[status] || "default";
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-white rounded-xl border border-gray-200 animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-white rounded-xl border border-gray-200 animate-pulse" />
          <div className="h-64 bg-white rounded-xl border border-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{userName ? `, ${userName}` : ""}
          </h1>
          <p className="text-gray-500 mt-1">
            Here&apos;s an overview of your services and account.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {card.value}
                    </p>
                  </div>
                  <div
                    className={`h-12 w-12 rounded-xl ${card.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Link key={action.title} href={action.href}>
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer group">
                      <div
                        className={`h-10 w-10 rounded-lg ${action.bg} flex items-center justify-center shrink-0`}
                      >
                        <action.icon
                          className={`h-5 w-5 ${action.color}`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm">
                          {action.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {action.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 transition-colors ml-auto shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-600" />
                Recent Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTickets.length === 0 ? (
                <div className="text-center py-8">
                  <LifeBuoy className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No support tickets yet</p>
                  <Link href="/dashboard/support">
                    <Button variant="outline" size="sm" className="mt-3">
                      Create Ticket
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href="/dashboard/support"
                      className="block"
                    >
                      <div className="p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {ticket.subject}
                          </p>
                          <Badge variant={getStatusBadge(ticket.status)}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Updated{" "}
                          {new Date(ticket.updatedAt).toLocaleDateString(
                            "en-IN",
                            {
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </Link>
                  ))}
                  <Link href="/dashboard/support">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                    >
                      View All Tickets
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
