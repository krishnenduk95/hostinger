import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function statusColor(status: string) {
  const colors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    running: "bg-emerald-100 text-emerald-800",
    paid: "bg-emerald-100 text-emerald-800",
    resolved: "bg-emerald-100 text-emerald-800",
    expired: "bg-red-100 text-red-800",
    stopped: "bg-red-100 text-red-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
    closed: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
    open: "bg-blue-100 text-blue-800",
    in_progress: "bg-blue-100 text-blue-800",
    non_renewing: "bg-orange-100 text-orange-800",
    in_trial: "bg-purple-100 text-purple-800",
  };
  return colors[status.toLowerCase()] || "bg-gray-100 text-gray-800";
}
