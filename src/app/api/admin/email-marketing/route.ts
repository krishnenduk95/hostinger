import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { reach } from "@/lib/hostinger";

export async function GET() {
  try {
    await requireAdmin();

    const [profiles, contacts, segments] = await Promise.all([
      reach.listProfiles().catch(() => []),
      reach.listContacts().catch(() => []),
      reach.listSegments().catch(() => []),
    ]);

    return NextResponse.json({ profiles, contacts, segments });
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

    switch (action) {
      case "add_contact": {
        const { email, first_name, last_name } = body;

        if (!email) {
          return NextResponse.json(
            { error: "Email is required" },
            { status: 400 }
          );
        }

        // Get first profile to use as parent
        const profiles = await reach.listProfiles();
        const profile = Array.isArray(profiles) ? profiles[0] : null;

        if (!profile?.uuid) {
          return NextResponse.json(
            { error: "No email marketing profile found. Please create a profile in Hostinger first." },
            { status: 400 }
          );
        }

        const contact = await reach.createContact(profile.uuid, {
          email,
          first_name: first_name || undefined,
          last_name: last_name || undefined,
        });

        return NextResponse.json({ contact }, { status: 201 });
      }

      case "delete_contact": {
        const { contact_uuid } = body;

        if (!contact_uuid) {
          return NextResponse.json(
            { error: "Contact UUID is required" },
            { status: 400 }
          );
        }

        await reach.deleteContact(contact_uuid);
        return NextResponse.json({ success: true });
      }

      case "create_segment": {
        const { name, description } = body;

        if (!name) {
          return NextResponse.json(
            { error: "Segment name is required" },
            { status: 400 }
          );
        }

        const segment = await reach.createSegment({
          name,
          description: description || undefined,
        });

        return NextResponse.json({ segment }, { status: 201 });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
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
