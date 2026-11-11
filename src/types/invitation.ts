export type EventId =
  | "dinner"
  | "sangeet"
  | "grah_shanti"
  | "baraat"
  | "wedding"
  | "reception_jariwala";

export type TemplateId =
  | "royal-jharokha"
  | "ivory-vermilion"
  | "salabatpura-dusk"
  | "marigold-press";

export interface CoupleInfo {
  bride: string;
  groom: string;
  hashtag: string;
}

export interface ParentsInfo {
  bride_parents: string;
  groom_parents: string;
}

export interface InvitationCopy {
  cover_quote: string;
  classic_blessing: string;
  city_label: string;
  date_range_label: string;
  groom_parent_prefix: string;
  bride_parent_prefix: string;
  closing_kicker: string;
  closing_heading: string;
  closing_subheading: string;
}

export interface WeddingEvent {
  id: EventId;
  key: string;
  title: string;
  shortLabel: string;
  date: string;
  isoStart: string;
  isoEnd: string;
  time: string;
  venue: string;
  host?: string;
  attire?: string;
  mapUrl?: string;
  subtitle?: string;
  tagline?: string;
}

export interface InvitationConfig {
  id: string;
  host_id: string;
  template_id: TemplateId;
  couple: CoupleInfo;
  parents: ParentsInfo;
  copy: InvitationCopy;
  events: Record<string, WeddingEvent>;
  whatsapp_message_template: string;
  updated_at: string;
}

export interface HostUserRecord {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: "host";
  is_active: boolean;
  env_sync_tag: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicHostUser {
  id: string;
  email: string;
  display_name: string;
  role: "host";
}

export interface AuthSettings {
  id: string;
  registration_enabled: boolean;
  max_users: number;
  updated_at: string;
}

export type RsvpStatus = "pending" | "attending" | "declined";

export interface GuestRecord {
  id: string;
  host_id: string;
  unique_code: string;
  guest_name: string;
  phone_number: string;
  allowed_events: EventId[];
  viewed_status: boolean;
  viewed_at: string | null;
  whatsapp_sent_status: boolean;
  whatsapp_sent_at: string | null;
  rsvp_status: RsvpStatus;
  rsvp_events: EventId[];
  rsvp_guests_count: number;
  rsvp_note: string | null;
  created_at: string;
}

export interface GuestCreateInput {
  guest_name: string;
  phone_number: string;
  allowed_events: EventId[];
}

export interface TemplateMetadata {
  id: TemplateId;
  name: string;
  subtitle: string;
  paperLabel: string;
  accentLabel: string;
  previewBg: string;
  previewCard: string;
  previewText: string;
  previewAccent: string;
  previewMuted: string;
  hasSceneArtwork?: boolean;
}

export interface GuestInvitationPayload {
  guest: {
    guest_name: string;
    unique_code: string;
    allowed_events: EventId[];
    viewed_status: boolean;
    rsvp_status: RsvpStatus;
    rsvp_events: EventId[];
    rsvp_guests_count: number;
    rsvp_note: string | null;
  };
  template_id: TemplateId;
  couple: CoupleInfo;
  parents: ParentsInfo;
  copy: InvitationCopy;
  permitted_events: WeddingEvent[];
}
