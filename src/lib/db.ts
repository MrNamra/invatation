import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { customAlphabet } from "nanoid";
import {
  DEFAULT_EVENTS,
  DEFAULT_INVITATION_CONFIG,
  DEFAULT_INVITATION_COPY,
  INITIAL_DEMO_GUESTS,
} from "@/lib/default-template";
import { sortEventsChronologically } from "@/lib/events";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type {
  AuthSettings,
  EventId,
  GuestCreateInput,
  GuestRecord,
  HostUserRecord,
  InvitationConfig,
  InvitationCopy,
  RsvpStatus,
} from "@/types/invitation";

export type StorageBackendState =
  | "supabase"
  | "supabase_needs_schema"
  | "local";

const generateUniqueCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);

interface LocalStoreData {
  config: InvitationConfig;
  guests: GuestRecord[];
  users?: HostUserRecord[];
  auth_settings?: AuthSettings;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const DEFAULT_AUTH_SETTINGS: AuthSettings = {
  id: "default",
  registration_enabled: false,
  max_users: 1,
  updated_at: "2026-11-11T12:00:00.000Z",
};

let writeQueue: Promise<unknown> = Promise.resolve();
let supabaseSyncPromise: Promise<void> | null = null;
let supabaseSyncedOnce = false;

function serializeWrite<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(fn, fn);
  writeQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

function isMissingSchemaError(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  return (
    code === "PGRST205" ||
    code === "PGRST204" ||
    code === "42P01" ||
    code === "42703" ||
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("could not find")
  );
}

async function readLocalStoreIfExists(): Promise<LocalStoreData | null> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as LocalStoreData;
    return {
      config: enrichConfigDefaults(parsed.config ?? DEFAULT_INVITATION_CONFIG),
      guests: Array.isArray(parsed.guests) ? parsed.guests : [],
      users: Array.isArray(parsed.users) ? parsed.users : [],
      auth_settings: parsed.auth_settings ?? { ...DEFAULT_AUTH_SETTINGS },
    };
  } catch {
    return null;
  }
}

async function readLocalStore(): Promise<LocalStoreData> {
  const existing = await readLocalStoreIfExists();
  if (existing) return existing;

  const initial: LocalStoreData = {
    config: enrichConfigDefaults(DEFAULT_INVITATION_CONFIG),
    guests: INITIAL_DEMO_GUESTS,
    users: [],
    auth_settings: { ...DEFAULT_AUTH_SETTINGS },
  };
  await writeLocalStore(initial);
  return initial;
}

async function writeLocalStore(data: LocalStoreData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempPath = `${STORE_PATH}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tempPath, STORE_PATH);
}

export function enrichConfigDefaults(
  raw: Partial<InvitationConfig> & Pick<InvitationConfig, "couple" | "parents" | "events">
): InvitationConfig {
  const mergedEvents: InvitationConfig["events"] = { ...raw.events };
  for (const [key, defEv] of Object.entries(DEFAULT_EVENTS)) {
    const existing = mergedEvents[key];
    if (existing) {
      mergedEvents[key] = {
        ...defEv,
        ...existing,
        mapUrl: existing.mapUrl ?? defEv.mapUrl,
        subtitle: existing.subtitle ?? defEv.subtitle,
        tagline: existing.tagline ?? defEv.tagline,
        host: existing.host ?? defEv.host,
        attire: existing.attire ?? defEv.attire,
      };
    } else {
      mergedEvents[key] = defEv;
    }
  }

  const mergedCopy: InvitationCopy = {
    ...DEFAULT_INVITATION_COPY,
    ...(raw.copy ?? {}),
  };

  return {
    id: raw.id ?? "default",
    host_id: raw.host_id ?? "default",
    template_id: raw.template_id ?? DEFAULT_INVITATION_CONFIG.template_id,
    couple: {
      bride: raw.couple?.bride ?? DEFAULT_INVITATION_CONFIG.couple.bride,
      groom: raw.couple?.groom ?? DEFAULT_INVITATION_CONFIG.couple.groom,
      hashtag: raw.couple?.hashtag ?? DEFAULT_INVITATION_CONFIG.couple.hashtag,
    },
    parents: {
      bride_parents:
        raw.parents?.bride_parents ??
        DEFAULT_INVITATION_CONFIG.parents.bride_parents,
      groom_parents:
        raw.parents?.groom_parents ??
        DEFAULT_INVITATION_CONFIG.parents.groom_parents,
    },
    copy: mergedCopy,
    events: mergedEvents,
    whatsapp_message_template:
      raw.whatsapp_message_template ??
      DEFAULT_INVITATION_CONFIG.whatsapp_message_template,
    updated_at: raw.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Automatically migrates local edits (config, guests, users, auth_settings)
 * into Supabase PostgreSQL the first time schema.sql tables are detected as empty.
 */
async function syncLocalStoreToSupabaseIfNeeded(): Promise<void> {
  if (supabaseSyncedOnce) return;
  if (supabaseSyncPromise) return supabaseSyncPromise;

  supabaseSyncPromise = (async () => {
    const supabase = getSupabaseServerClient();
    if (!supabase) return;

    const [cfgCheck, gstCheck, usrCheck, authCheck] = await Promise.all([
      supabase.from("invitation_configs").select("id").eq("id", "default").maybeSingle(),
      supabase.from("guests").select("id").limit(1),
      supabase.from("host_users").select("id").limit(1),
      supabase.from("auth_settings").select("id").eq("id", "default").maybeSingle(),
    ]);

    if (
      isMissingSchemaError(cfgCheck.error) ||
      isMissingSchemaError(gstCheck.error) ||
      isMissingSchemaError(usrCheck.error) ||
      isMissingSchemaError(authCheck.error)
    ) {
      return;
    }

    const local = await readLocalStoreIfExists();

    if (!cfgCheck.data && !cfgCheck.error) {
      const seedConfig = local?.config ?? DEFAULT_INVITATION_CONFIG;
      await supabase.from("invitation_configs").upsert(seedConfig);
    }

    if (
      !gstCheck.error &&
      Array.isArray(gstCheck.data) &&
      gstCheck.data.length === 0
    ) {
      const seedGuests = local?.guests ?? INITIAL_DEMO_GUESTS;
      if (seedGuests.length > 0) {
        await supabase
          .from("guests")
          .upsert(seedGuests, { onConflict: "unique_code" });
      }
    }

    if (
      !usrCheck.error &&
      Array.isArray(usrCheck.data) &&
      usrCheck.data.length === 0 &&
      local?.users &&
      local.users.length > 0
    ) {
      await supabase
        .from("host_users")
        .upsert(local.users.slice(0, 1), { onConflict: "email" });
    }

    if (!authCheck.data && !authCheck.error) {
      const seedAuth = local?.auth_settings ?? DEFAULT_AUTH_SETTINGS;
      await supabase.from("auth_settings").upsert(seedAuth);
    }

    supabaseSyncedOnce = true;
  })().finally(() => {
    supabaseSyncPromise = null;
  });

  return supabaseSyncPromise;
}

export async function resolveStorageBackend(): Promise<StorageBackendState> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return "local";

  const [cfgRes, gstRes, usrRes, authRes] = await Promise.all([
    supabase.from("invitation_configs").select("id, copy").limit(1),
    supabase.from("guests").select("id").limit(1),
    supabase.from("host_users").select("id").limit(1),
    supabase.from("auth_settings").select("id").limit(1),
  ]);

  if (
    cfgRes.error ||
    gstRes.error ||
    usrRes.error ||
    authRes.error ||
    isMissingSchemaError(cfgRes.error) ||
    isMissingSchemaError(gstRes.error) ||
    isMissingSchemaError(usrRes.error) ||
    isMissingSchemaError(authRes.error)
  ) {
    return "supabase_needs_schema";
  }

  await syncLocalStoreToSupabaseIfNeeded();
  return "supabase";
}

export function getStorageBackend(): "supabase" | "local" {
  return isSupabaseConfigured() ? "supabase" : "local";
}

function normalizeGuestRow(row: Record<string, unknown>): GuestRecord {
  return {
    id: String(row.id),
    host_id: String(row.host_id ?? "default"),
    unique_code: String(row.unique_code),
    guest_name: String(row.guest_name),
    phone_number: String(row.phone_number),
    allowed_events: sortEventsChronologically(
      Array.isArray(row.allowed_events)
        ? (row.allowed_events as EventId[])
        : []
    ),
    viewed_status: Boolean(row.viewed_status),
    viewed_at: row.viewed_at ? String(row.viewed_at) : null,
    whatsapp_sent_status: Boolean(row.whatsapp_sent_status),
    whatsapp_sent_at: row.whatsapp_sent_at ? String(row.whatsapp_sent_at) : null,
    rsvp_status: (row.rsvp_status as RsvpStatus) || "pending",
    rsvp_events: sortEventsChronologically(
      Array.isArray(row.rsvp_events) ? (row.rsvp_events as EventId[]) : []
    ),
    rsvp_guests_count: Number(row.rsvp_guests_count ?? 1),
    rsvp_note: row.rsvp_note ? String(row.rsvp_note) : null,
    created_at: row.created_at
      ? String(row.created_at)
      : new Date().toISOString(),
  };
}

function normalizeUserRow(row: Record<string, unknown>): HostUserRecord {
  return {
    id: String(row.id),
    email: String(row.email).trim().toLowerCase(),
    password_hash: String(row.password_hash),
    display_name: String(row.display_name ?? "Host Admin"),
    role: "host",
    is_active: row.is_active !== false,
    env_sync_tag: row.env_sync_tag ? String(row.env_sync_tag) : null,
    created_at: row.created_at
      ? String(row.created_at)
      : new Date().toISOString(),
    updated_at: row.updated_at
      ? String(row.updated_at)
      : new Date().toISOString(),
  };
}

export async function getInvitationConfig(): Promise<InvitationConfig> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    await syncLocalStoreToSupabaseIfNeeded();
    const { data, error } = await supabase
      .from("invitation_configs")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      if (isMissingSchemaError(error)) {
        const store = await readLocalStore();
        return enrichConfigDefaults(store.config);
      }
      throw new Error(`Supabase config query failed: ${error.message}`);
    }

    if (data) {
      return enrichConfigDefaults(data as InvitationConfig);
    }

    const local = await readLocalStoreIfExists();
    const seed = local?.config ?? DEFAULT_INVITATION_CONFIG;
    const { data: inserted, error: insertError } = await supabase
      .from("invitation_configs")
      .upsert(seed)
      .select("*")
      .single();

    if (insertError) {
      if (isMissingSchemaError(insertError)) {
        const store = await readLocalStore();
        return enrichConfigDefaults(store.config);
      }
      throw new Error(`Supabase config seed failed: ${insertError.message}`);
    }
    return enrichConfigDefaults(inserted as InvitationConfig);
  }

  const store = await readLocalStore();
  return enrichConfigDefaults(store.config);
}

export async function updateInvitationConfig(patch: {
  template_id?: InvitationConfig["template_id"];
  couple?: Partial<InvitationConfig["couple"]>;
  parents?: Partial<InvitationConfig["parents"]>;
  copy?: Partial<InvitationCopy>;
  events?: InvitationConfig["events"];
  whatsapp_message_template?: string;
}): Promise<InvitationConfig> {
  const current = await getInvitationConfig();

  let mergedEvents = current.events;
  if (patch.events) {
    mergedEvents = { ...current.events };
    for (const [key, ev] of Object.entries(patch.events)) {
      if (ev && typeof ev === "object") {
        mergedEvents[key] = {
          ...(current.events[key] ?? {}),
          ...ev,
        };
      }
    }
  }

  const next: InvitationConfig = enrichConfigDefaults({
    ...current,
    ...(patch.template_id ? { template_id: patch.template_id } : {}),
    couple: patch.couple ? { ...current.couple, ...patch.couple } : current.couple,
    parents: patch.parents
      ? { ...current.parents, ...patch.parents }
      : current.parents,
    copy: patch.copy ? { ...current.copy, ...patch.copy } : current.copy,
    events: mergedEvents,
    ...(patch.whatsapp_message_template !== undefined
      ? { whatsapp_message_template: patch.whatsapp_message_template }
      : {}),
    updated_at: new Date().toISOString(),
  });

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("invitation_configs")
      .upsert(next)
      .select("*")
      .single();
    if (error) {
      if (isMissingSchemaError(error)) {
        return serializeWrite(async () => {
          const store = await readLocalStore();
          store.config = next;
          await writeLocalStore(store);
          return next;
        });
      }
      throw new Error(`Supabase config update failed: ${error.message}`);
    }
    return enrichConfigDefaults(data as InvitationConfig);
  }

  return serializeWrite(async () => {
    const store = await readLocalStore();
    store.config = next;
    await writeLocalStore(store);
    return next;
  });
}

export async function listGuests(): Promise<GuestRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    await syncLocalStoreToSupabaseIfNeeded();
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      if (isMissingSchemaError(error)) {
        const store = await readLocalStore();
        return [...store.guests].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      throw new Error(`Supabase guests fetch failed: ${error.message}`);
    }
    return (data ?? []).map((row) =>
      normalizeGuestRow(row as Record<string, unknown>)
    );
  }

  const store = await readLocalStore();
  return [...store.guests].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function createGuestsBatch(
  inputs: GuestCreateInput[]
): Promise<GuestRecord[]> {
  if (inputs.length === 0) return [];

  const existing = await listGuests();
  const usedCodes = new Set(existing.map((g) => g.unique_code.toUpperCase()));

  const nextCode = () => {
    let code = generateUniqueCode();
    while (usedCodes.has(code)) {
      code = generateUniqueCode();
    }
    usedCodes.add(code);
    return code;
  };

  const now = Date.now();
  const records: GuestRecord[] = inputs.map((item, idx) => ({
    id: crypto.randomUUID(),
    host_id: "default",
    unique_code: nextCode(),
    guest_name: item.guest_name.trim(),
    phone_number: item.phone_number.replace(/\D/g, ""),
    allowed_events: sortEventsChronologically(item.allowed_events),
    viewed_status: false,
    viewed_at: null,
    whatsapp_sent_status: false,
    whatsapp_sent_at: null,
    rsvp_status: "pending",
    rsvp_events: [],
    rsvp_guests_count: 1,
    rsvp_note: null,
    created_at: new Date(now + idx).toISOString(),
  }));

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("guests")
      .insert(records)
      .select("*");
    if (error) {
      if (isMissingSchemaError(error)) {
        return serializeWrite(async () => {
          const store = await readLocalStore();
          store.guests = [...records, ...store.guests];
          await writeLocalStore(store);
          return records;
        });
      }
      throw new Error(`Supabase guest insert failed: ${error.message}`);
    }
    return (data ?? []).map((row) =>
      normalizeGuestRow(row as Record<string, unknown>)
    );
  }

  return serializeWrite(async () => {
    const store = await readLocalStore();
    store.guests = [...records, ...store.guests];
    await writeLocalStore(store);
    return records;
  });
}

export async function getGuestByCode(
  code: string
): Promise<GuestRecord | null> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return null;

  const supabase = getSupabaseServerClient();
  if (supabase) {
    await syncLocalStoreToSupabaseIfNeeded();
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .eq("unique_code", normalizedCode)
      .maybeSingle();
    if (error) {
      if (isMissingSchemaError(error)) {
        const store = await readLocalStore();
        return (
          store.guests.find(
            (g) => g.unique_code.toUpperCase() === normalizedCode
          ) ?? null
        );
      }
      throw new Error(`Supabase guest lookup failed: ${error.message}`);
    }
    return data
      ? normalizeGuestRow(data as Record<string, unknown>)
      : null;
  }

  const store = await readLocalStore();
  const found = store.guests.find(
    (g) => g.unique_code.toUpperCase() === normalizedCode
  );
  return found ?? null;
}

export async function getGuestById(id: string): Promise<GuestRecord | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      if (isMissingSchemaError(error)) {
        const store = await readLocalStore();
        return store.guests.find((g) => g.id === id) ?? null;
      }
      throw new Error(`Supabase guest lookup failed: ${error.message}`);
    }
    return data
      ? normalizeGuestRow(data as Record<string, unknown>)
      : null;
  }

  const store = await readLocalStore();
  return store.guests.find((g) => g.id === id) ?? null;
}

export async function updateGuest(
  id: string,
  patch: Partial<
    Pick<
      GuestRecord,
      | "guest_name"
      | "phone_number"
      | "allowed_events"
      | "viewed_status"
      | "viewed_at"
      | "whatsapp_sent_status"
      | "whatsapp_sent_at"
      | "rsvp_status"
      | "rsvp_events"
      | "rsvp_guests_count"
      | "rsvp_note"
    >
  >
): Promise<GuestRecord | null> {
  const sanitizedPatch = { ...patch };
  if (sanitizedPatch.allowed_events) {
    sanitizedPatch.allowed_events = sortEventsChronologically(
      sanitizedPatch.allowed_events
    );
  }
  if (sanitizedPatch.phone_number !== undefined) {
    sanitizedPatch.phone_number = sanitizedPatch.phone_number.replace(/\D/g, "");
  }

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("guests")
      .update(sanitizedPatch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      if (isMissingSchemaError(error)) {
        return serializeWrite(async () => {
          const store = await readLocalStore();
          const index = store.guests.findIndex((g) => g.id === id);
          if (index === -1) return null;
          const updated: GuestRecord = {
            ...store.guests[index],
            ...sanitizedPatch,
          };
          store.guests[index] = updated;
          await writeLocalStore(store);
          return updated;
        });
      }
      throw new Error(`Supabase guest update failed: ${error.message}`);
    }
    return data
      ? normalizeGuestRow(data as Record<string, unknown>)
      : null;
  }

  return serializeWrite(async () => {
    const store = await readLocalStore();
    const index = store.guests.findIndex((g) => g.id === id);
    if (index === -1) return null;
    const updated: GuestRecord = {
      ...store.guests[index],
      ...sanitizedPatch,
    };
    store.guests[index] = updated;
    await writeLocalStore(store);
    return updated;
  });
}

export async function deleteGuest(id: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from("guests").delete().eq("id", id);
    if (error) {
      if (isMissingSchemaError(error)) {
        return serializeWrite(async () => {
          const store = await readLocalStore();
          const prevLength = store.guests.length;
          store.guests = store.guests.filter((g) => g.id !== id);
          if (store.guests.length === prevLength) return false;
          await writeLocalStore(store);
          return true;
        });
      }
      throw new Error(`Supabase guest delete failed: ${error.message}`);
    }
    return true;
  }

  return serializeWrite(async () => {
    const store = await readLocalStore();
    const prevLength = store.guests.length;
    store.guests = store.guests.filter((g) => g.id !== id);
    if (store.guests.length === prevLength) return false;
    await writeLocalStore(store);
    return true;
  });
}

export async function markGuestViewed(
  code: string
): Promise<GuestRecord | null> {
  const guest = await getGuestByCode(code);
  if (!guest) return null;
  if (guest.viewed_status && guest.viewed_at) {
    return guest;
  }
  return updateGuest(guest.id, {
    viewed_status: true,
    viewed_at: guest.viewed_at ?? new Date().toISOString(),
  });
}

export async function submitGuestRsvp(
  code: string,
  payload: {
    rsvp_status: RsvpStatus;
    rsvp_events: EventId[];
    rsvp_guests_count: number;
    rsvp_note: string | null;
  }
): Promise<GuestRecord | null> {
  const guest = await getGuestByCode(code);
  if (!guest) return null;

  // Enforce strict server-side permission intersection: a guest may only RSVP for events they are invited to.
  const permittedSet = new Set<EventId>(guest.allowed_events);
  const filteredRsvpEvents =
    payload.rsvp_status === "declined"
      ? []
      : sortEventsChronologically(
          payload.rsvp_events.filter((id) => permittedSet.has(id))
        );

  const count = Math.min(20, Math.max(1, Math.round(payload.rsvp_guests_count || 1)));

  return updateGuest(guest.id, {
    viewed_status: true,
    viewed_at: guest.viewed_at ?? new Date().toISOString(),
    rsvp_status: payload.rsvp_status,
    rsvp_events: filteredRsvpEvents,
    rsvp_guests_count: count,
    rsvp_note: payload.rsvp_note?.trim() ? payload.rsvp_note.trim() : null,
  });
}

export async function resetDemoGuests(): Promise<GuestRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const existing = await listGuests();
    const existingCodes = new Set(existing.map((g) => g.unique_code));
    const missingDemo = INITIAL_DEMO_GUESTS.filter(
      (g) => !existingCodes.has(g.unique_code)
    );
    if (missingDemo.length > 0) {
      const { error } = await supabase.from("guests").insert(missingDemo);
      if (error && isMissingSchemaError(error)) {
        return serializeWrite(async () => {
          const store = await readLocalStore();
          const localCodes = new Set(store.guests.map((g) => g.unique_code));
          const missingLocal = INITIAL_DEMO_GUESTS.filter(
            (g) => !localCodes.has(g.unique_code)
          );
          store.guests = [...missingLocal, ...store.guests];
          await writeLocalStore(store);
          return store.guests;
        });
      }
    }
    return listGuests();
  }

  return serializeWrite(async () => {
    const store = await readLocalStore();
    const existingCodes = new Set(store.guests.map((g) => g.unique_code));
    const missingDemo = INITIAL_DEMO_GUESTS.filter(
      (g) => !existingCodes.has(g.unique_code)
    );
    store.guests = [...missingDemo, ...store.guests];
    await writeLocalStore(store);
    return store.guests;
  });
}

// =============================================================================
// Auth Settings & Single-Host Users Storage
// =============================================================================

export async function getAuthSettings(): Promise<AuthSettings> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    await syncLocalStoreToSupabaseIfNeeded();
    const { data, error } = await supabase
      .from("auth_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      if (isMissingSchemaError(error)) {
        const store = await readLocalStore();
        return store.auth_settings ?? { ...DEFAULT_AUTH_SETTINGS };
      }
      throw new Error(`Supabase auth_settings failed: ${error.message}`);
    }

    if (data) {
      return {
        id: String(data.id),
        registration_enabled: Boolean(data.registration_enabled),
        max_users: Number(data.max_users ?? 1),
        updated_at: String(data.updated_at ?? new Date().toISOString()),
      };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("auth_settings")
      .upsert(DEFAULT_AUTH_SETTINGS)
      .select("*")
      .single();

    if (insertError) {
      if (isMissingSchemaError(insertError)) {
        const store = await readLocalStore();
        return store.auth_settings ?? { ...DEFAULT_AUTH_SETTINGS };
      }
      throw new Error(`Supabase auth_settings seed failed: ${insertError.message}`);
    }
    return {
      id: String(inserted.id),
      registration_enabled: Boolean(inserted.registration_enabled),
      max_users: Number(inserted.max_users ?? 1),
      updated_at: String(inserted.updated_at ?? new Date().toISOString()),
    };
  }

  const store = await readLocalStore();
  return store.auth_settings ?? { ...DEFAULT_AUTH_SETTINGS };
}

export async function listHostUsers(): Promise<HostUserRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    await syncLocalStoreToSupabaseIfNeeded();
    const { data, error } = await supabase
      .from("host_users")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      if (isMissingSchemaError(error)) {
        const store = await readLocalStore();
        return [...(store.users ?? [])].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      throw new Error(`Supabase host_users fetch failed: ${error.message}`);
    }

    return (data ?? []).map((row) =>
      normalizeUserRow(row as Record<string, unknown>)
    );
  }

  const store = await readLocalStore();
  return [...(store.users ?? [])].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export async function getHostUserById(
  id: string
): Promise<HostUserRecord | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("host_users")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (isMissingSchemaError(error)) {
        const store = await readLocalStore();
        return (store.users ?? []).find((u) => u.id === id) ?? null;
      }
      throw new Error(`Supabase host_user lookup failed: ${error.message}`);
    }

    return data
      ? normalizeUserRow(data as Record<string, unknown>)
      : null;
  }

  const store = await readLocalStore();
  return (store.users ?? []).find((u) => u.id === id) ?? null;
}

export async function upsertSeedHostUser(
  user: HostUserRecord
): Promise<HostUserRecord> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("host_users")
      .upsert(user, { onConflict: "id" })
      .select("*")
      .single();

    if (error) {
      if (isMissingSchemaError(error)) {
        return serializeWrite(async () => {
          const store = await readLocalStore();
          const users = [...(store.users ?? [])];
          const idx = users.findIndex((u) => u.id === user.id);
          if (idx === -1) {
            users.push(user);
          } else {
            users[idx] = user;
          }
          store.users = users;
          await writeLocalStore(store);
          return user;
        });
      }
      throw new Error(`Supabase host_user upsert failed: ${error.message}`);
    }

    return normalizeUserRow(data as Record<string, unknown>);
  }

  return serializeWrite(async () => {
    const store = await readLocalStore();
    const users = [...(store.users ?? [])];
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx === -1) {
      users.push(user);
    } else {
      users[idx] = user;
    }
    store.users = users;
    await writeLocalStore(store);
    return user;
  });
}

export async function updateHostUser(
  id: string,
  patch: Partial<
    Pick<
      HostUserRecord,
      "email" | "password_hash" | "display_name" | "is_active" | "env_sync_tag" | "updated_at"
    >
  >
): Promise<HostUserRecord | null> {
  const nextPatch = {
    ...patch,
    ...(patch.email ? { email: patch.email.trim().toLowerCase() } : {}),
    updated_at: patch.updated_at ?? new Date().toISOString(),
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("host_users")
      .update(nextPatch)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      if (isMissingSchemaError(error)) {
        return serializeWrite(async () => {
          const store = await readLocalStore();
          const users = [...(store.users ?? [])];
          const idx = users.findIndex((u) => u.id === id);
          if (idx === -1) return null;
          const updated: HostUserRecord = { ...users[idx], ...nextPatch };
          users[idx] = updated;
          store.users = users;
          await writeLocalStore(store);
          return updated;
        });
      }
      throw new Error(`Supabase host_user update failed: ${error.message}`);
    }

    return data
      ? normalizeUserRow(data as Record<string, unknown>)
      : null;
  }

  return serializeWrite(async () => {
    const store = await readLocalStore();
    const users = [...(store.users ?? [])];
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    const updated: HostUserRecord = { ...users[idx], ...nextPatch };
    users[idx] = updated;
    store.users = users;
    await writeLocalStore(store);
    return updated;
  });
}
