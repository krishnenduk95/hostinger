"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LifeBuoy,
  Plus,
  Loader2,
  RefreshCw,
  Send,
  ArrowLeft,
  MessageSquare,
  Clock,
  ChevronDown,
  User,
  Shield,
  AlertCircle,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  _count?: { replies: number };
}

interface TicketReply {
  id: string;
  message: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

interface TicketDetail extends Ticket {
  replies: TicketReply[];
}

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

type View = "list" | "detail" | "create";

const PRIORITY_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

export default function CustomerSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  });
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(
    null
  );
  const [view, setView] = useState<View>("list");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState("");

  // New ticket form
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newPriority, setNewPriority] = useState("medium");

  const repliesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket && repliesEndRef.current) {
      repliesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTicket]);

  async function fetchTickets() {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/support");
      const data = await res.json();
      setTickets(data.tickets || []);
      setStats(
        data.stats || {
          total: 0,
          open: 0,
          inProgress: 0,
          resolved: 0,
          closed: 0,
        }
      );
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setLoading(false);
    }
  }

  async function openTicket(ticketId: string) {
    setDetailLoading(true);
    setView("detail");
    setError("");
    try {
      const res = await fetch(
        `/api/customer/support?ticketId=${encodeURIComponent(ticketId)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load ticket");
      setSelectedTicket(data.ticket);
    } catch (err) {
      console.error("Failed to load ticket:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load ticket details"
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function createTicket() {
    if (!newSubject.trim() || !newMessage.trim()) {
      setError("Subject and message are required");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/customer/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newSubject,
          message: newMessage,
          priority: newPriority,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create ticket");

      setNewSubject("");
      setNewMessage("");
      setNewPriority("medium");
      setView("list");
      fetchTickets();
    } catch (err) {
      console.error("Failed to create ticket:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create ticket"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function sendReply() {
    if (!replyText.trim() || !selectedTicket) return;

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/customer/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          ticketId: selectedTicket.id,
          message: replyText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reply");

      setReplyText("");
      // Reload ticket to show new reply
      openTicket(selectedTicket.id);
      fetchTickets();
    } catch (err) {
      console.error("Failed to send reply:", err);
      setError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSubmitting(false);
    }
  }

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

  function getPriorityColor(priority: string) {
    const colors: Record<string, string> = {
      low: "bg-gray-100 text-gray-700",
      medium: "bg-blue-100 text-blue-700",
      high: "bg-orange-100 text-orange-700",
      urgent: "bg-red-100 text-red-700",
    };
    return colors[priority] || "bg-gray-100 text-gray-700";
  }

  // ========== CREATE VIEW ==========
  if (view === "create") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setView("list");
              setError("");
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Create Support Ticket
          </h1>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <Input
                placeholder="Brief description of your issue"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <div className="relative">
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={6}
                placeholder="Describe your issue in detail..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setView("list");
                  setError("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={createTicket} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1.5" />
                )}
                Submit Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========== DETAIL VIEW ==========
  if (view === "detail") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setView("list");
              setSelectedTicket(null);
              setReplyText("");
              setError("");
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Tickets
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {detailLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : selectedTicket ? (
          <>
            {/* Ticket Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedTicket.subject}
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant={getStatusBadge(selectedTicket.status)}>
                        {selectedTicket.status.replace("_", " ")}
                      </Badge>
                      <Badge
                        variant="custom"
                        className={getPriorityColor(selectedTicket.priority)}
                      >
                        {selectedTicket.priority}
                      </Badge>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(selectedTicket.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conversation Thread */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-5 w-5 text-indigo-600" />
                  Conversation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Original message */}
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          You
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDateTime(selectedTicket.createdAt)}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-indigo-50 text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedTicket.message}
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {selectedTicket.replies.map((reply) => {
                    const isAdmin = reply.user.role === "ADMIN";
                    return (
                      <div key={reply.id} className="flex gap-3">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                            isAdmin
                              ? "bg-emerald-100"
                              : "bg-indigo-100"
                          }`}
                        >
                          {isAdmin ? (
                            <Shield className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <User className="h-4 w-4 text-indigo-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {reply.user.name}
                            </span>
                            {isAdmin && (
                              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                                Support
                              </Badge>
                            )}
                            <span className="text-xs text-gray-400">
                              {formatDateTime(reply.createdAt)}
                            </span>
                          </div>
                          <div
                            className={`p-3 rounded-lg text-sm text-gray-700 whitespace-pre-wrap ${
                              isAdmin ? "bg-emerald-50" : "bg-indigo-50"
                            }`}
                          >
                            {reply.message}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={repliesEndRef} />
                </div>

                {/* Reply Input */}
                {selectedTicket.status !== "CLOSED" && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-1">
                        <User className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                          placeholder="Type your reply..."
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={sendReply}
                            disabled={submitting || !replyText.trim()}
                          >
                            {submitting ? (
                              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4 mr-1.5" />
                            )}
                            Send Reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTicket.status === "CLOSED" && (
                  <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                    <p className="text-sm text-gray-500">
                      This ticket is closed. Reply to reopen it.
                    </p>
                    <div className="mt-3 flex gap-3">
                      <div className="flex-1">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={2}
                          placeholder="Type to reopen and reply..."
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={sendReply}
                        disabled={submitting || !replyText.trim()}
                        className="self-end"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-1.5" />
                        )}
                        Reopen
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    );
  }

  // ========== LIST VIEW ==========
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <p className="text-gray-500 mt-1">
            Get help with your services and account.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchTickets} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={() => setView("create")}>
            <Plus className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
            <p className="text-xs text-gray-500">Open</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {stats.inProgress}
            </p>
            <p className="text-xs text-gray-500">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {stats.resolved}
            </p>
            <p className="text-xs text-gray-500">Resolved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{stats.closed}</p>
            <p className="text-xs text-gray-500">Closed</p>
          </CardContent>
        </Card>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-indigo-600" />
            My Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16">
              <LifeBuoy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                No support tickets
              </h3>
              <p className="text-gray-500 mt-1 text-sm">
                Create a ticket when you need help with your services.
              </p>
              <Button className="mt-4" onClick={() => setView("create")}>
                <Plus className="h-4 w-4 mr-1.5" />
                Create First Ticket
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => openTicket(ticket.id)}
                  className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                        <MessageSquare className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-900 group-hover:text-indigo-700 transition-colors truncate">
                          {ticket.subject}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {ticket.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 sm:ml-4">
                      <Badge
                        variant="custom"
                        className={getPriorityColor(ticket.priority)}
                      >
                        {ticket.priority}
                      </Badge>
                      <Badge variant={getStatusBadge(ticket.status)}>
                        {ticket.status.replace("_", " ")}
                      </Badge>
                      {ticket._count && ticket._count.replies > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MessageSquare className="h-3 w-3" />
                          {ticket._count.replies}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDateTime(ticket.updatedAt)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
