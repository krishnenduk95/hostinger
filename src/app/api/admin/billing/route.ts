import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { billing } from "@/lib/hostinger";

export async function GET() {
  try {
    await requireAdmin();

    // Fetch from both Hostinger API and local DB in parallel
    const [subscriptions, paymentMethods, localInvoices] = await Promise.all([
      billing.listSubscriptions().catch(() => []),
      billing.listPaymentMethods().catch(() => []),
      prisma.invoice.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          plan: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const subs = Array.isArray(subscriptions) ? subscriptions : [];
    const methods = Array.isArray(paymentMethods) ? paymentMethods : [];

    // Compute stats from local invoices
    const paidInvoices = localInvoices.filter((inv) => inv.status === "PAID");
    const pendingInvoices = localInvoices.filter(
      (inv) => inv.status === "PENDING"
    );
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const pendingAmount = pendingInvoices.reduce(
      (sum, inv) => sum + inv.amount,
      0
    );

    // Calculate monthly recurring from active subscriptions
    const activeSubscriptions = subs.filter(
      (s: Record<string, unknown>) =>
        ((s.status as string) || "").toLowerCase() === "active"
    );
    const monthlyRecurring = activeSubscriptions.reduce(
      (sum: number, s: Record<string, unknown>) => {
        const price = (s.price as number) || 0;
        const period = ((s.billing_period as string) || "").toLowerCase();
        if (period === "yearly" || period === "annual") return sum + price / 12;
        return sum + price;
      },
      0
    );

    const stats = {
      totalRevenue,
      pendingInvoices: pendingInvoices.length,
      pendingAmount,
      activeSubscriptions: activeSubscriptions.length,
      monthlyRecurring,
    };

    return NextResponse.json({
      subscriptions: subs,
      paymentMethods: methods,
      invoices: localInvoices,
      stats,
    });
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
    await requireAdmin();

    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "create_invoice": {
        const { userId, planId, amount, currency, description, dueDate, period } =
          body;

        if (!userId || !amount || !dueDate) {
          return NextResponse.json(
            { error: "userId, amount, and dueDate are required" },
            { status: 400 }
          );
        }

        const invoice = await prisma.invoice.create({
          data: {
            userId,
            planId: planId || undefined,
            amount: Number(amount),
            currency: currency || "INR",
            description: description || undefined,
            dueDate: new Date(dueDate),
            period: period || undefined,
            status: "PENDING",
          },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            plan: {
              select: { id: true, name: true, slug: true },
            },
          },
        });

        return NextResponse.json({ invoice }, { status: 201 });
      }

      case "mark_paid": {
        const { invoiceId } = body;
        if (!invoiceId) {
          return NextResponse.json(
            { error: "invoiceId is required" },
            { status: 400 }
          );
        }

        const invoice = await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: "PAID",
            paidAt: new Date(),
          },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            plan: {
              select: { id: true, name: true, slug: true },
            },
          },
        });

        return NextResponse.json({ invoice });
      }

      case "mark_overdue": {
        const { invoiceId: overdueId } = body;
        if (!overdueId) {
          return NextResponse.json(
            { error: "invoiceId is required" },
            { status: 400 }
          );
        }

        const invoice = await prisma.invoice.update({
          where: { id: overdueId },
          data: { status: "OVERDUE" },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            plan: {
              select: { id: true, name: true, slug: true },
            },
          },
        });

        return NextResponse.json({ invoice });
      }

      case "cancel_invoice": {
        const { invoiceId: cancelId } = body;
        if (!cancelId) {
          return NextResponse.json(
            { error: "invoiceId is required" },
            { status: 400 }
          );
        }

        const invoice = await prisma.invoice.update({
          where: { id: cancelId },
          data: { status: "CANCELLED" },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            plan: {
              select: { id: true, name: true, slug: true },
            },
          },
        });

        return NextResponse.json({ invoice });
      }

      case "toggle_auto_renewal": {
        const { subscriptionId, enable } = body;
        if (!subscriptionId) {
          return NextResponse.json(
            { error: "subscriptionId is required" },
            { status: 400 }
          );
        }

        const result = enable
          ? await billing.enableAutoRenewal(subscriptionId)
          : await billing.disableAutoRenewal(subscriptionId);

        return NextResponse.json({ success: true, result });
      }

      case "delete_payment_method": {
        const { paymentMethodId } = body;
        if (!paymentMethodId) {
          return NextResponse.json(
            { error: "paymentMethodId is required" },
            { status: 400 }
          );
        }

        const result = await billing.deletePaymentMethod(
          Number(paymentMethodId)
        );
        return NextResponse.json({ success: true, result });
      }

      case "set_default_payment": {
        const { paymentMethodId: defaultId } = body;
        if (!defaultId) {
          return NextResponse.json(
            { error: "paymentMethodId is required" },
            { status: 400 }
          );
        }

        const result = await billing.setDefaultPayment(Number(defaultId));
        return NextResponse.json({ success: true, result });
      }

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
