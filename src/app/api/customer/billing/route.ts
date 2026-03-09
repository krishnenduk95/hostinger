import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { userId: session.id };
    if (status && status !== "all") {
      where.status = status.toUpperCase();
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        plan: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const allInvoices = await prisma.invoice.findMany({
      where: { userId: session.id },
    });

    const stats = {
      total: allInvoices.length,
      paid: allInvoices.filter((i) => i.status === "PAID").length,
      pending: allInvoices.filter((i) => i.status === "PENDING").length,
      overdue: allInvoices.filter((i) => i.status === "OVERDUE").length,
      totalAmount: allInvoices.reduce((sum, i) => sum + i.amount, 0),
      paidAmount: allInvoices
        .filter((i) => i.status === "PAID")
        .reduce((sum, i) => sum + i.amount, 0),
      pendingAmount: allInvoices
        .filter((i) => i.status === "PENDING" || i.status === "OVERDUE")
        .reduce((sum, i) => sum + i.amount, 0),
    };

    return NextResponse.json({ invoices, stats });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
