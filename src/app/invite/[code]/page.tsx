import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuestInvitationViewer } from "@/components/GuestInvitationViewer";
import { getHostSession } from "@/lib/auth";
import { getGuestByCode, getInvitationConfig } from "@/lib/db";
import { filterPermittedEvents } from "@/lib/events";
import type { GuestInvitationPayload } from "@/types/invitation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const [guest, config] = await Promise.all([
    getGuestByCode(code),
    getInvitationConfig(),
  ]);
  if (!guest) {
    return { title: "Invitation Not Found — Patrika Studio" };
  }
  return {
    title: `${config.couple.groom} & ${config.couple.bride} — Invitation for ${guest.guest_name}`,
  };
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { code } = await params;
  const resolvedSearch = await searchParams;
  const sessionUser =
    resolvedSearch.preview === "host" ? await getHostSession() : null;
  const isPreview = resolvedSearch.preview === "host" && Boolean(sessionUser);

  const [guest, config] = await Promise.all([
    getGuestByCode(code),
    getInvitationConfig(),
  ]);

  if (!guest) {
    notFound();
  }

  // Strictly filter permitted events on the server so uninvited ceremonies
  // are never serialized into props or rendered into the DOM.
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

  return <GuestInvitationViewer payload={payload} isPreview={isPreview} />;
}
