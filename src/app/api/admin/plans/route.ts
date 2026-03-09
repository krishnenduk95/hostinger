import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const plans = await prisma.plan.findMany({
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { price: "asc" }],
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    // Group by type
    const grouped = {
      shared: plans.filter((p) => p.type === "shared"),
      vps: plans.filter((p) => p.type === "vps"),
      domain: plans.filter((p) => p.type === "domain"),
    };

    const stats = {
      total: plans.length,
      active: plans.filter((p) => p.isActive).length,
      inactive: plans.filter((p) => !p.isActive).length,
      byType: {
        shared: grouped.shared.length,
        vps: grouped.vps.length,
        domain: grouped.domain.length,
      },
    };

    return NextResponse.json({ plans, grouped, stats });
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
    const { name, slug, type, price, description, features, sortOrder } = body;

    if (!name || !slug || !type || price === undefined) {
      return NextResponse.json(
        { error: "name, slug, type, and price are required" },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await prisma.plan.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A plan with this slug already exists" },
        { status: 409 }
      );
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        slug,
        type,
        price: Number(price),
        description: description || undefined,
        features: features || {},
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
        isActive: true,
      },
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { id, name, slug, type, price, description, features, sortOrder, isActive } =
      body;

    if (!id) {
      return NextResponse.json(
        { error: "Plan id is required" },
        { status: 400 }
      );
    }

    // Check slug uniqueness if slug is being changed
    if (slug) {
      const existing = await prisma.plan.findFirst({
        where: { slug, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A plan with this slug already exists" },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (type !== undefined) updateData.type = type;
    if (price !== undefined) updateData.price = Number(price);
    if (description !== undefined) updateData.description = description;
    if (features !== undefined) updateData.features = features;
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
    if (isActive !== undefined) updateData.isActive = isActive;

    const plan = await prisma.plan.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ plan });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Plan id is required" },
        { status: 400 }
      );
    }

    // Soft delete: deactivate rather than remove
    const plan = await prisma.plan.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ plan, message: "Plan deactivated" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
