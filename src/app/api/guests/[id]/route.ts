import { NextResponse } from "next/server";
import { requireHostApiSession } from "@/lib/auth";
import { ORDERED_EVENT_IDS } from "@/lib/default-template";
import { deleteGuest, updateGuest } from "@/lib/db";
import type { EventId } from "@/types/invitation";

export const dynamic = "force-dynamic";

const VALID_EVENT_SET = new Set<string>(ORDERED_EVENT_IDS);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireHostApiSession();
    if (guard.errorResponse) return guard.errorResponse;

    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const patch: Parameters<typeof updateGuest>[1] = {};

    if (typeof body.guest_name === "string" && body.guest_name.trim()) {
      patch.guest_name = body.guest_name.trim();
    }
    if (typeof body.phone_number === "string") {
      patch.phone_number = body.phone_number.replace(/\D/g, "");
    }
    if (Array.isArray(body.allowed_events)) {
      patch.allowed_events = body.allowed_events
        .map((e) => String(e))
        .filter((e): e is EventId => VALID_EVENT_SET.has(e));
    }
    if (typeof body.whatsapp_sent_status === "boolean") {
      patch.whatsapp_sent_status = body.whatsapp_sent_status;
      patch.whatsapp_sent_at = body.whatsapp_sent_status
        ? new Date().toISOString()
        : null;
    }

    const updated = await updateGuest(id, patch);
    if (!updated) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }
    return NextResponse.json({ guest: updated });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update guest";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireHostApiSession();
    if (guard.errorResponse) return guard.errorResponse;

    const { id } = await context.params;
    const ok = await deleteGuest(id);
    if (!ok) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete guest";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
