import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { billing } from "@/lib/hostinger";

export async function GET() {
  try {
    await requireAdmin();

    const catalog = await billing.getCatalog();
    const items = Array.isArray(catalog) ? catalog : [];

    // Group products by category
    const grouped: Record<string, unknown[]> = {};
    for (const item of items) {
      const category =
        (item as Record<string, unknown>).category || "OTHER";
      const key = String(category).toUpperCase();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }

    return NextResponse.json({
      catalog: items,
      grouped,
      categories: Object.keys(grouped),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
