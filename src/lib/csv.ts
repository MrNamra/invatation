import Papa from "papaparse";
import { parseInvitedEventsList } from "@/lib/events";
import type { EventId } from "@/types/invitation";

export interface ParsedCsvGuestRow {
  rowIndex: number;
  guest_name: string;
  phone_number: string;
  allowed_events: EventId[];
  unrecognized_events: string[];
  raw_events: string;
  valid: boolean;
  warning?: string;
}

function getColumnValue(
  row: Record<string, unknown>,
  candidates: string[]
): string {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const match = keys.find(
      (k) => k.trim().toLowerCase() === candidate.toLowerCase()
    );
    if (match && row[match] !== undefined && row[match] !== null) {
      return String(row[match]).trim();
    }
  }
  return "";
}

export function sanitizePhoneNumber(raw: string, defaultCountryCode = "91"): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) {
    return `${defaultCountryCode}${digits}`;
  }
  return digits;
}

export function parseGuestCsv(
  csvText: string,
  defaultCountryCode = "91"
): {
  rows: ParsedCsvGuestRow[];
  errors: string[];
} {
  const result = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
  });

  const errors: string[] = result.errors.map(
    (err) => `Row ${(err.row ?? 0) + 1}: ${err.message}`
  );

  const rows: ParsedCsvGuestRow[] = result.data.map((rawRow, idx) => {
    const guestName = getColumnValue(rawRow, [
      "Guest Name",
      "Name",
      "guest_name",
      "Guest",
      "Full Name",
    ]);
    const rawPhone = getColumnValue(rawRow, [
      "WhatsApp Number",
      "WhatsApp",
      "Phone Number",
      "Phone",
      "phone_number",
      "Mobile",
    ]);
    const rawEvents = getColumnValue(rawRow, [
      "Invited Events",
      "Allowed Events",
      "Events",
      "allowed_events",
      "Ceremonies",
    ]);

    const phone = sanitizePhoneNumber(rawPhone, defaultCountryCode);
    const { events, unrecognized } = parseInvitedEventsList(rawEvents);

    let warning: string | undefined;
    if (!guestName) {
      warning = "Missing guest name";
    } else if (!phone || phone.length < 10) {
      warning = "Missing or short WhatsApp number";
    } else if (events.length === 0) {
      warning = "No matching events parsed";
    } else if (unrecognized.length > 0) {
      warning = `Ignored unrecognized event tags: ${unrecognized.join(", ")}`;
    }

    return {
      rowIndex: idx + 1,
      guest_name: guestName,
      phone_number: phone,
      allowed_events: events,
      unrecognized_events: unrecognized,
      raw_events: rawEvents,
      valid: Boolean(guestName && phone.length >= 10 && events.length > 0),
      warning,
    };
  });

  return { rows, errors };
}

export const SAMPLE_GUEST_CSV = `Guest Name,WhatsApp Number,Invited Events
Harsh & Priya Shah,9825011482,"Dinner,Grah Shanti,Wedding,Reception"
Siddharth Joshi,+91 98795 33210,"Mosariya Sangeet,Baraat,Wedding"
Dr. Bhavesh & Nita Kothari,919909044125,"Grah Shanti,Wedding,Reception"
Vikas & Neha Trivedi,9725088741,"Reception"
`;
