import { DEFAULT_WHATSAPP_TEMPLATE } from "@/lib/default-template";
import { getEventShortLabel, sortEventsChronologically } from "@/lib/events";
import type { GuestRecord, InvitationConfig } from "@/types/invitation";

export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return `+${digits}`;
}

export function buildInviteUrl(origin: string, uniqueCode: string): string {
  const cleanOrigin = origin.replace(/\/+$/, "");
  return `${cleanOrigin}/invite/${uniqueCode}`;
}

export function buildWhatsAppMessage(
  guest: Pick<GuestRecord, "guest_name" | "unique_code" | "allowed_events">,
  config: Pick<InvitationConfig, "couple" | "whatsapp_message_template" | "events">,
  origin: string
): string {
  const link = buildInviteUrl(origin, guest.unique_code);
  const orderedEvents = sortEventsChronologically(guest.allowed_events);
  const eventsList = orderedEvents
    .map((id) => getEventShortLabel(id))
    .join(", ");

  const template =
    config.whatsapp_message_template?.trim() || DEFAULT_WHATSAPP_TEMPLATE;

  return template
    .replaceAll("{{guest_name}}", guest.guest_name)
    .replaceAll("{{bride}}", config.couple.bride)
    .replaceAll("{{groom}}", config.couple.groom)
    .replaceAll("{{hashtag}}", config.couple.hashtag)
    .replaceAll("{{events}}", eventsList)
    .replaceAll("{{link}}", link);
}

export function buildWhatsAppUrl(
  guest: Pick<
    GuestRecord,
    "guest_name" | "phone_number" | "unique_code" | "allowed_events"
  >,
  config: Pick<InvitationConfig, "couple" | "whatsapp_message_template" | "events">,
  origin: string
): string {
  const digits = guest.phone_number.replace(/\D/g, "");
  const message = buildWhatsAppMessage(guest, config, origin);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
