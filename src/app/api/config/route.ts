import { NextResponse } from "next/server";
import { requireHostApiSession } from "@/lib/auth";
import {
  getInvitationConfig,
  resolveStorageBackend,
  updateInvitationConfig,
} from "@/lib/db";
import type { InvitationCopy, TemplateId } from "@/types/invitation";

export const dynamic = "force-dynamic";

const VALID_TEMPLATES = new Set<TemplateId>([
  "royal-jharokha",
  "ivory-vermilion",
  "salabatpura-dusk",
  "marigold-press",
]);

const COPY_KEYS: (keyof InvitationCopy)[] = [
  "cover_quote",
  "classic_blessing",
  "city_label",
  "date_range_label",
  "groom_parent_prefix",
  "bride_parent_prefix",
  "closing_kicker",
  "closing_heading",
  "closing_subheading",
];

export async function GET() {
  try {
    const guard = await requireHostApiSession();
    if (guard.errorResponse) return guard.errorResponse;

    const [config, storageBackend] = await Promise.all([
      getInvitationConfig(),
      resolveStorageBackend(),
    ]);
    return NextResponse.json({
      config,
      storageBackend,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await requireHostApiSession();
    if (guard.errorResponse) return guard.errorResponse;

    const body = (await request.json()) as Record<string, unknown>;
    const patch: Parameters<typeof updateInvitationConfig>[0] = {};

    if (
      typeof body.template_id === "string" &&
      VALID_TEMPLATES.has(body.template_id as TemplateId)
    ) {
      patch.template_id = body.template_id as TemplateId;
    }

    if (body.couple && typeof body.couple === "object") {
      const c = body.couple as Record<string, unknown>;
      const couplePatch: NonNullable<typeof patch.couple> = {};
      if (typeof c.bride === "string") couplePatch.bride = c.bride.trim();
      if (typeof c.groom === "string") couplePatch.groom = c.groom.trim();
      if (typeof c.hashtag === "string") couplePatch.hashtag = c.hashtag.trim();
      if (Object.keys(couplePatch).length > 0) {
        patch.couple = couplePatch;
      }
    }

    if (body.parents && typeof body.parents === "object") {
      const p = body.parents as Record<string, unknown>;
      const parentsPatch: NonNullable<typeof patch.parents> = {};
      if (typeof p.bride_parents === "string") {
        parentsPatch.bride_parents = p.bride_parents.trim();
      }
      if (typeof p.groom_parents === "string") {
        parentsPatch.groom_parents = p.groom_parents.trim();
      }
      if (Object.keys(parentsPatch).length > 0) {
        patch.parents = parentsPatch;
      }
    }

    if (body.copy && typeof body.copy === "object") {
      const cp = body.copy as Record<string, unknown>;
      const copyPatch: Partial<InvitationCopy> = {};
      for (const key of COPY_KEYS) {
        if (typeof cp[key] === "string") {
          copyPatch[key] = (cp[key] as string).trim();
        }
      }
      if (Object.keys(copyPatch).length > 0) {
        patch.copy = copyPatch;
      }
    }

    if (body.events && typeof body.events === "object") {
      patch.events = body.events as Parameters<
        typeof updateInvitationConfig
      >[0]["events"];
    }

    if (typeof body.whatsapp_message_template === "string") {
      patch.whatsapp_message_template = body.whatsapp_message_template;
    }

    const [updated, storageBackend] = await Promise.all([
      updateInvitationConfig(patch),
      resolveStorageBackend(),
    ]);
    return NextResponse.json({
      config: updated,
      storageBackend,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
