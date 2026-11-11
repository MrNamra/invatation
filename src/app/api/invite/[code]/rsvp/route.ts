import { NextResponse } from "next/server";
import { ORDERED_EVENT_IDS } from "@/lib/default-template";
import { submitGuestRsvp } from "@/lib/db";
import type { EventId, RsvpStatus } from "@/types/invitation";

export const dynamic = "force-dynamic";

const VALID_EVENT_SET = new Set<string>(ORDERED_EVENT_IDS);

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const status =
      body.rsvp_status === "attending" || body.rsvp_status === "declined"
        ? (body.rsvp_status as RsvpStatus)
        : "attending";

    const rsvpEventsRaw = Array.isArray(body.rsvp_events)
      ? body.rsvp_events
      : [];
    const rsvpEvents = rsvpEventsRaw
      .map((e) => String(e))
      .filter((e): e is EventId => VALID_EVENT_SET.has(e));

    const guestsCount =
      typeof body.rsvp_guests_count === "number"
        ? body.rsvp_guests_count
        : Number(body.rsvp_guests_count ?? 1);

    const note =
      typeof body.rsvp_note === "string" ? body.rsvp_note : null;

    const updated = await submitGuestRsvp(code, {
      rsvp_status: status,
      rsvp_events: rsvpEvents,
      rsvp_guests_count: Number.isFinite(guestsCount) ? guestsCount : 1,
      rsvp_note: note,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Invitation code not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      rsvp_status: updated.rsvp_status,
      rsvp_events: updated.rsvp_events,
      rsvp_guests_count: updated.rsvp_guests_count,
      rsvp_note: updated.rsvp_note,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
