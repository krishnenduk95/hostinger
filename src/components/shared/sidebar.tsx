"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Globe,
  Server,
  Network,
  CreditCard,
  Package,
  Mail,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Database,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Role = "admin" | "customer";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Websites", href: "/admin/websites", icon: Globe },
  { label: "Hosting", href: "/admin/hosting", icon: HardDrive },
  { label: "Domains", href: "/admin/domains", icon: Globe },
  { label: "VPS", href: "/admin/vps", icon: Server },
  { label: "DNS", href: "/admin/dns", icon: Network },
  { label: "Billing", href: "/admin/billing", icon: CreditCard },
  { label: "Plans", href: "/admin/plans", icon: Package },
  { label: "Email Marketing", href: "/admin/email-marketing", icon: Mail },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const customerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Websites", href: "/dashboard/websites", icon: Globe },
  { label: "Hosting", href: "/dashboard/hosting", icon: HardDrive },
  { label: "Domains", href: "/dashboard/domains", icon: Globe },
  { label: "VPS", href: "/dashboard/vps", icon: Server },
  { label: "DNS", href: "/dashboard/dns", icon: Network },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Support", href: "/dashboard/support", icon: HelpCircle },
];

interface SidebarProps {
  role: Role;
  userName?: string;
  userEmail?: string;
}

export default function Sidebar({
  role,
  userName = "User",
  userEmail = "",
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = role === "admin" ? adminNavItems : customerNavItems;

  const isActive = (href: string) => {
    if (href === "/admin" || href === "/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  return (
    <aside
      className={cn(
        "flex h-screen flex-col bg-slate-900 text-slate-300 transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-slate-700/50 px-4">
        {!collapsed && (
          <Link href={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 font-bold text-white text-sm">
              Z
            </div>
            <span className="text-lg font-bold text-white">ZustaHost</span>
          </Link>
        )}
        {collapsed && (
          <Link
            href={role === "admin" ? "/admin" : "/dashboard"}
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 font-bold text-white text-sm"
          >
            Z
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors",
            collapsed && "hidden"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-violet-600/20 text-violet-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active ? "text-violet-400" : "text-slate-500"
                )}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle (when collapsed) */}
      {collapsed && (
        <div className="flex justify-center px-3 pb-2">
          <button
            onClick={() => setCollapsed(false)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* User info & Logout */}
      <div className="border-t border-slate-700/50 p-3">
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed && "justify-center"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white uppercase">
            {userName.charAt(0)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {userName}
              </p>
              {userEmail && (
                <p className="truncate text-xs text-slate-500">{userEmail}</p>
              )}
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              title="Logout"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={handleLogout}
            title="Logout"
            className="mt-2 flex w-full justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
