import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAdmin();

    const profile = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Mask the API token for display
    const rawToken = process.env.HOSTINGER_API_TOKEN || "";
    const apiTokenMasked = rawToken
      ? rawToken.slice(0, 4) + "****" + rawToken.slice(-4)
      : "";

    return NextResponse.json({ profile, apiTokenMasked });
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
    const session = await requireAdmin();

    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    if (email !== session.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== session.id) {
        return NextResponse.json(
          { error: "This email is already taken by another user" },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = { name, email };

    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }
      updateData.password = await hashPassword(password);
    }

    const profile = await prisma.user.update({
      where: { id: session.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json({ profile });
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

    if (body.action === "test_connection") {
      // Test both API connections
      const results: Record<string, boolean> = {};

      try {
        const { testConnection } = await import("@/lib/cyberpanel");
        results.cyberpanel = await testConnection();
      } catch {
        results.cyberpanel = false;
      }

      return NextResponse.json({ success: true, results });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
