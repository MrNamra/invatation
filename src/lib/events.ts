import { ORDERED_EVENT_IDS } from "@/lib/default-template";
import type { EventId, InvitationConfig, WeddingEvent } from "@/types/invitation";

const EVENT_ALIAS_MAP: Record<string, EventId> = {
  dinner: "dinner",
  "spicy food": "dinner",
  "spicy food / dinner": "dinner",
  "spicy food / dinner ceremony": "dinner",
  "spicy_food_dinner": "dinner",
  "dinner ceremony": "dinner",
  sangeet: "sangeet",
  "mosariya sangeet": "sangeet",
  "grah shanti": "grah_shanti",
  grah_shanti: "grah_shanti",
  grahshanti: "grah_shanti",
  "graha shanti": "grah_shanti",
  baraat: "baraat",
  barat: "baraat",
  varghodo: "baraat",
  wedding: "wedding",
  "wedding ceremony": "wedding",
  lagna: "wedding",
  reception: "reception_jariwala",
  "wedding reception": "reception_jariwala",
  "reception jariwala": "reception_jariwala",
  reception_jariwala: "reception_jariwala",
};

export function normalizeEventToken(raw: string): EventId | null {
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!cleaned) return null;
  if (cleaned in EVENT_ALIAS_MAP) {
    return EVENT_ALIAS_MAP[cleaned];
  }
  if (cleaned.includes("dinner") || cleaned.includes("spicy")) return "dinner";
  if (cleaned.includes("sangeet") || cleaned.includes("mosariya")) return "sangeet";
  if (cleaned.includes("grah") || cleaned.includes("shanti")) return "grah_shanti";
  if (cleaned.includes("baraat") || cleaned.includes("barat")) return "baraat";
  if (cleaned.includes("reception")) return "reception_jariwala";
  if (cleaned.includes("wedding") || cleaned.includes("ceremony")) return "wedding";
  return null;
}

export function parseInvitedEventsList(raw: string): {
  events: EventId[];
  unrecognized: string[];
} {
  const trimmed = raw.trim();
  if (!trimmed) return { events: [], unrecognized: [] };
  if (trimmed.toLowerCase() === "all") {
    return { events: [...ORDERED_EVENT_IDS], unrecognized: [] };
  }

  const tokens = trimmed
    .split(/[,;|]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const validSet = new Set<EventId>();
  const unrecognized: string[] = [];

  for (const token of tokens) {
    const normalized = normalizeEventToken(token);
    if (normalized) {
      validSet.add(normalized);
    } else {
      unrecognized.push(token);
    }
  }

  const ordered = ORDERED_EVENT_IDS.filter((id) => validSet.has(id));
  return { events: ordered, unrecognized };
}

export function sortEventsChronologically(events: EventId[]): EventId[] {
  const set = new Set(events);
  return ORDERED_EVENT_IDS.filter((id) => set.has(id));
}

export function getAllConfigEventsOrdered(
  config: InvitationConfig
): WeddingEvent[] {
  const all = Object.values(config.events);
  const rank = new Map<EventId, number>(
    ORDERED_EVENT_IDS.map((id, index) => [id, index])
  );
  return [...all].sort(
    (a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99)
  );
}

/**
 * Strictly filters the configuration's events down to ONLY the events permitted for a guest.
 * Events not included in `allowedEvents` are omitted completely before serializing to the client.
 */
export function filterPermittedEvents(
  config: InvitationConfig,
  allowedEvents: EventId[]
): WeddingEvent[] {
  const allowedSet = new Set<EventId>(allowedEvents);
  return getAllConfigEventsOrdered(config).filter((event) =>
    allowedSet.has(event.id)
  );
}

export function getEventShortLabel(
  eventId: EventId,
  config?: InvitationConfig
): string {
  if (config) {
    const found = Object.values(config.events).find((e) => e.id === eventId);
    if (found) return found.shortLabel;
  }
  switch (eventId) {
    case "dinner":
      return "Dinner";
    case "sangeet":
      return "Sangeet";
    case "grah_shanti":
      return "Grah Shanti";
    case "baraat":
      return "Baraat";
    case "wedding":
      return "Wedding";
    case "reception_jariwala":
      return "Reception";
  }
}
