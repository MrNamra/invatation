import type { CoupleInfo, WeddingEvent } from "@/types/invitation";

function formatIcsUtc(isoDate: string): string {
  const d = new Date(isoDate);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function generateEventIcs(
  event: WeddingEvent,
  couple: CoupleInfo
): string {
  const nowStamp = formatIcsUtc(new Date().toISOString());
  const dtStart = formatIcsUtc(event.isoStart);
  const dtEnd = formatIcsUtc(event.isoEnd);
  const summary = `${event.title} — ${couple.bride} & ${couple.groom}`;
  const description = event.host
    ? `Hosted by ${event.host}. ${couple.hashtag}`
    : `${couple.bride} & ${couple.groom} Wedding (${couple.hashtag})`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AbhiMaitri Invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}-2026@abhimaitri.invite`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(event.venue)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
