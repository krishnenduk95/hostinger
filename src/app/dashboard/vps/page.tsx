"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Server,
  Play,
  Square,
  RotateCcw,
  Cpu,
  HardDrive,
  MemoryStick,
  Globe,
  Loader2,
  RefreshCw,
  Activity,
  MapPin,
  Monitor,
} from "lucide-react";
import { formatBytes, statusColor } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getIp(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val) && val.length > 0) return val[0].address;
  return "";
}

interface VPSServer {
  id: string;
  hostingerId: number;
  hostname: string;
  plan: string;
  state: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ipv4: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ipv6: any;
  cpus: number;
  memory: number;
  disk: number;
  bandwidth: number;
  os: string | null;
  dataCenter: string | null;
  createdAt: string;
}

export default function CustomerVPSPage() {
  const [servers, setServers] = useState<VPSServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    fetchServers();
  }, []);

  async function fetchServers() {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/vps");
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (data.error) {
        console.error("API error:", data.error);
        return;
      }
      setServers(data.servers || []);
    } catch (error) {
      console.error("Failed to fetch VPS:", error);
    } finally {
      setLoading(false);
    }
  }

  async function performAction(
    vpsId: string,
    action: "start" | "stop" | "reboot"
  ) {
    setActionLoading((prev) => ({ ...prev, [vpsId]: action }));
    try {
      const res = await fetch("/api/customer/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpsId, action }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Action failed");
        return;
      }

      // Update local state optimistically
      setServers((prev) =>
        prev.map((s) => {
          if (s.id === vpsId) {
            return {
              ...s,
              state:
                action === "stop"
                  ? "stopped"
                  : action === "start"
                    ? "running"
                    : "running",
            };
          }
          return s;
        })
      );

      // Refetch after a delay for accurate state
      setTimeout(fetchServers, 3000);
    } catch (error) {
      console.error("VPS action failed:", error);
      alert("Action failed. Please try again.");
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[vpsId];
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My VPS Servers</h1>
          <p className="text-gray-500 mt-1">
            Manage your virtual private servers.
          </p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My VPS Servers</h1>
          <p className="text-gray-500 mt-1">
            Manage your virtual private servers.
          </p>
        </div>
        <Button variant="outline" onClick={fetchServers}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {servers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Server className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              No VPS servers assigned
            </h3>
            <p className="text-gray-500 mt-1 text-sm">
              Your VPS servers will appear here once provisioned by the admin.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {servers.map((server) => {
            const isRunning = server.state.toLowerCase() === "running";
            const isStopped = server.state.toLowerCase() === "stopped";
            const currentAction = actionLoading[server.id];

            return (
              <Card key={server.id} className="overflow-hidden">
                {/* Status Bar */}
                <div
                  className={`h-1 ${
                    isRunning
                      ? "bg-emerald-500"
                      : isStopped
                        ? "bg-red-500"
                        : "bg-amber-500"
                  }`}
                />

                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <Server className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">
                          {server.hostname}
                        </CardTitle>
                        <p className="text-sm text-gray-500">{server.plan}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="custom"
                        className={statusColor(server.state)}
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${
                            isRunning
                              ? "bg-emerald-500"
                              : isStopped
                                ? "bg-red-500"
                                : "bg-amber-500"
                          }`}
                        />
                        {server.state}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Specs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <Cpu className="h-5 w-5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">CPU</p>
                        <p className="font-semibold text-gray-900">
                          {server.cpus} vCPU
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <MemoryStick className="h-5 w-5 text-violet-600 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Memory</p>
                        <p className="font-semibold text-gray-900">
                          {formatBytes(server.memory * 1024 * 1024)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <HardDrive className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Disk</p>
                        <p className="font-semibold text-gray-900">
                          {formatBytes(server.disk * 1024 * 1024)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <Activity className="h-5 w-5 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Bandwidth</p>
                        <p className="font-semibold text-gray-900">
                          {formatBytes(server.bandwidth * 1024 * 1024)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Info Row */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {getIp(server.ipv4) && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <span className="font-mono">{getIp(server.ipv4)}</span>
                      </div>
                    )}
                    {server.os && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Monitor className="h-4 w-4 text-gray-400" />
                        <span>{server.os}</span>
                      </div>
                    )}
                    {server.dataCenter && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{server.dataCenter}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    {isStopped && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => performAction(server.id, "start")}
                        disabled={!!currentAction}
                      >
                        {currentAction === "start" ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-1.5" />
                        )}
                        Start
                      </Button>
                    )}
                    {isRunning && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => performAction(server.id, "stop")}
                        disabled={!!currentAction}
                      >
                        {currentAction === "stop" ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Square className="h-4 w-4 mr-1.5" />
                        )}
                        Stop
                      </Button>
                    )}
                    {isRunning && (
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => performAction(server.id, "reboot")}
                        disabled={!!currentAction}
                      >
                        {currentAction === "reboot" ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-1.5" />
                        )}
                        Reboot
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
