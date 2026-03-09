import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { domains } from "@/lib/hostinger";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const whoisId = searchParams.get("whois_id");

    if (whoisId) {
      // Get single profile + its usage
      const id = Number(whoisId);
      const [profile, usage] = await Promise.all([
        domains.getWhois(id),
        domains.getWhoisUsage(id).catch(() => []),
      ]);

      return NextResponse.json({ profile, usage });
    }

    // List all WHOIS profiles
    const profiles = await domains.listWhois();
    return NextResponse.json({ profiles: Array.isArray(profiles) ? profiles : [] });
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

    if (!body.tld || !body.entity_type || !body.whois_details) {
      return NextResponse.json(
        { error: "tld, entity_type, and whois_details are required" },
        { status: 400 }
      );
    }

    const result = await domains.createWhois(body);
    return NextResponse.json(result, { status: 201 });
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

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "WHOIS profile id is required" },
        { status: 400 }
      );
    }

    await domains.deleteWhois(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
