import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vps } from "@/lib/hostinger";

export async function GET() {
  try {
    const session = await requireAuth();

    // Get user's VPS assignments from local DB
    const localVps = await prisma.vPS.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
    });

    // Fetch live data from Hostinger for each VPS
    const vpsWithLiveData = await Promise.all(
      localVps.map(async (v) => {
        try {
          const liveData = await vps.getVM(v.hostingerId);
          return {
            id: v.id,
            hostingerId: v.hostingerId,
            hostname: v.hostname,
            plan: v.plan,
            state: (liveData as Record<string, unknown>).state || v.state,
            ipv4: (liveData as Record<string, unknown>).ipv4 || v.ipv4,
            ipv6: (liveData as Record<string, unknown>).ipv6 || v.ipv6,
            cpus: (liveData as Record<string, unknown>).cpus || v.cpus,
            memory: (liveData as Record<string, unknown>).memory || v.memory,
            disk: (liveData as Record<string, unknown>).disk || v.disk,
            bandwidth:
              (liveData as Record<string, unknown>).bandwidth || v.bandwidth,
            os: (liveData as Record<string, unknown>).os || v.os,
            dataCenter:
              (liveData as Record<string, unknown>).data_center || v.dataCenter,
            liveData,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt,
          };
        } catch {
          // If live fetch fails, return local data
          return {
            ...v,
            liveData: null,
          };
        }
      })
    );

    return NextResponse.json({ servers: vpsWithLiveData });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { action, vpsId } = body;

    if (!action || !vpsId) {
      return NextResponse.json(
        { error: "Action and vpsId are required" },
        { status: 400 }
      );
    }

    // Verify this VPS belongs to the user
    const userVps = await prisma.vPS.findFirst({
      where: { id: vpsId, userId: session.id },
    });

    if (!userVps) {
      return NextResponse.json(
        { error: "VPS not found or access denied" },
        { status: 404 }
      );
    }

    let result;
    const hostingerId = userVps.hostingerId;

    switch (action) {
      case "start":
        result = await vps.startVM(hostingerId);
        await prisma.vPS.update({
          where: { id: vpsId },
          data: { state: "running" },
        });
        break;
      case "stop":
        result = await vps.stopVM(hostingerId);
        await prisma.vPS.update({
          where: { id: vpsId },
          data: { state: "stopped" },
        });
        break;
      case "reboot":
        result = await vps.rebootVM(hostingerId);
        await prisma.vPS.update({
          where: { id: vpsId },
          data: { state: "running" },
        });
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action. Use: start, stop, or reboot" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
