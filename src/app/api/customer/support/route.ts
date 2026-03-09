import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId");

    // If ticketId is provided, return that ticket with replies
    if (ticketId) {
      const ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, userId: session.id },
        include: {
          replies: {
            include: {
              user: {
                select: { id: true, name: true, role: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!ticket) {
        return NextResponse.json(
          { error: "Ticket not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ ticket });
    }

    // Otherwise return all user's tickets
    const tickets = await prisma.ticket.findMany({
      where: { userId: session.id },
      include: {
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const stats = {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "OPEN").length,
      inProgress: tickets.filter((t) => t.status === "IN_PROGRESS").length,
      resolved: tickets.filter((t) => t.status === "RESOLVED").length,
      closed: tickets.filter((t) => t.status === "CLOSED").length,
    };

    return NextResponse.json({ tickets, stats });
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
    const { action } = body;

    if (action === "reply") {
      // Add reply to existing ticket
      const { ticketId, message } = body;

      if (!ticketId || !message) {
        return NextResponse.json(
          { error: "ticketId and message are required" },
          { status: 400 }
        );
      }

      // Verify ticket belongs to user
      const ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, userId: session.id },
      });

      if (!ticket) {
        return NextResponse.json(
          { error: "Ticket not found" },
          { status: 404 }
        );
      }

      const reply = await prisma.ticketReply.create({
        data: {
          ticketId,
          userId: session.id,
          message,
        },
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      });

      // Update ticket updatedAt and reopen if it was resolved/closed
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          updatedAt: new Date(),
          ...(ticket.status === "RESOLVED" || ticket.status === "CLOSED"
            ? { status: "OPEN" }
            : {}),
        },
      });

      return NextResponse.json({ reply }, { status: 201 });
    }

    // Create new ticket
    const { subject, message, priority } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId: session.id,
        subject,
        message,
        priority: priority || "medium",
        status: "OPEN",
      },
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
