import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAuth();

    const domains = await prisma.domain.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      total: domains.length,
      active: domains.filter((d) => d.status === "active").length,
      expiringSoon: domains.filter((d) => {
        if (!d.expiresAt) return false;
        const daysUntilExpiry = Math.ceil(
          (new Date(d.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
      }).length,
    };

    return NextResponse.json({ domains, stats });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
