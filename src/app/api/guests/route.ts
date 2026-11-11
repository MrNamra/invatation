import { NextResponse } from "next/server";
import { requireHostApiSession } from "@/lib/auth";
import { ORDERED_EVENT_IDS } from "@/lib/default-template";
import {
  createGuestsBatch,
  getStorageBackend,
  listGuests,
  resetDemoGuests,
} from "@/lib/db";
import type { EventId, GuestCreateInput } from "@/types/invitation";

export const dynamic = "force-dynamic";

const VALID_EVENT_SET = new Set<string>(ORDERED_EVENT_IDS);

export async function GET() {
  try {
    const guard = await requireHostApiSession();
    if (guard.errorResponse) return guard.errorResponse;

    const guests = await listGuests();
    return NextResponse.json({
      guests,
      storageBackend: getStorageBackend(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list guests";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireHostApiSession();
    if (guard.errorResponse) return guard.errorResponse;

    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "reset_demo") {
      const guests = await resetDemoGuests();
      return NextResponse.json({
        guests,
        storageBackend: getStorageBackend(),
      });
    }

    const rawGuests = Array.isArray(body.guests)
      ? body.guests
      : body.guest_name
        ? [body]
        : [];

    if (rawGuests.length === 0) {
      return NextResponse.json(
        { error: "No guest records provided" },
        { status: 400 }
      );
    }

    const sanitizedInputs: GuestCreateInput[] = [];
    for (const item of rawGuests) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const name = typeof row.guest_name === "string" ? row.guest_name.trim() : "";
      const phone =
        typeof row.phone_number === "string"
          ? row.phone_number.replace(/\D/g, "")
          : "";
      const allowedRaw = Array.isArray(row.allowed_events)
        ? row.allowed_events
        : [];
      const allowed = allowedRaw
        .map((e) => String(e))
        .filter((e): e is EventId => VALID_EVENT_SET.has(e));

      if (!name || !phone) {
        continue;
      }

      sanitizedInputs.push({
        guest_name: name,
        phone_number: phone,
        allowed_events: allowed,
      });
    }

    if (sanitizedInputs.length === 0) {
      return NextResponse.json(
        { error: "All guest rows were missing a valid name or phone number" },
        { status: 400 }
      );
    }

    const created = await createGuestsBatch(sanitizedInputs);
    return NextResponse.json(
      {
        created,
        storageBackend: getStorageBackend(),
      },
      { status: 201 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save guest records";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
