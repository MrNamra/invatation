import { NextResponse } from "next/server";
import { getGuestByCode, getInvitationConfig } from "@/lib/db";
import { filterPermittedEvents } from "@/lib/events";
import type { GuestInvitationPayload } from "@/types/invitation";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const [guest, config] = await Promise.all([
      getGuestByCode(code),
      getInvitationConfig(),
    ]);

    if (!guest) {
      return NextResponse.json(
        { error: "Invitation code not found" },
        { status: 404 }
      );
    }

    const permittedEvents = filterPermittedEvents(config, guest.allowed_events);

    const payload: GuestInvitationPayload = {
      guest: {
        guest_name: guest.guest_name,
        unique_code: guest.unique_code,
        allowed_events: guest.allowed_events,
        viewed_status: guest.viewed_status,
        rsvp_status: guest.rsvp_status,
        rsvp_events: guest.rsvp_events,
        rsvp_guests_count: guest.rsvp_guests_count,
        rsvp_note: guest.rsvp_note,
      },
      template_id: config.template_id,
      couple: config.couple,
      parents: config.parents,
      copy: config.copy,
      permitted_events: permittedEvents,
    };

    return NextResponse.json(payload);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load invitation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
