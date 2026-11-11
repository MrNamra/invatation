-- Supabase PostgreSQL schema for Wedding Invitation Platform
-- Run this in your Supabase SQL Editor to provision tables, indexes, and policies.

create extension if not exists pgcrypto;

create table if not exists public.invitation_configs (
  id text primary key default 'default',
  host_id text not null default 'default',
  template_id text not null default 'royal-jharokha',
  couple jsonb not null,
  parents jsonb not null,
  copy jsonb not null default '{}'::jsonb,
  events jsonb not null,
  whatsapp_message_template text not null default 'Dear {{guest_name}}, you are cordially invited to celebrate the wedding of {{bride}} and {{groom}} ({{hashtag}}). Please view your personal invitation here: {{link}}',
  updated_at timestamptz not null default now()
);

alter table public.invitation_configs
  add column if not exists copy jsonb not null default '{}'::jsonb;

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  host_id text not null default 'default',
  unique_code text not null unique,
  guest_name text not null,
  phone_number text not null,
  allowed_events jsonb not null default '[]'::jsonb,
  viewed_status boolean not null default false,
  viewed_at timestamptz,
  whatsapp_sent_status boolean not null default false,
  whatsapp_sent_at timestamptz,
  rsvp_status text not null default 'pending' check (rsvp_status in ('pending', 'attending', 'declined')),
  rsvp_events jsonb not null default '[]'::jsonb,
  rsvp_guests_count integer not null default 1 check (rsvp_guests_count >= 1 and rsvp_guests_count <= 20),
  rsvp_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.host_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  display_name text not null default 'Host Admin',
  role text not null default 'host' check (role in ('host')),
  is_active boolean not null default true,
  env_sync_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auth_settings (
  id text primary key default 'default',
  registration_enabled boolean not null default false,
  max_users integer not null default 1 check (max_users >= 1),
  updated_at timestamptz not null default now()
);

insert into public.auth_settings (id, registration_enabled, max_users)
values ('default', false, 1)
on conflict (id) do nothing;

create index if not exists idx_guests_unique_code on public.guests (unique_code);
create index if not exists idx_guests_host_id on public.guests (host_id);
create index if not exists idx_guests_created_at on public.guests (created_at desc);

alter table public.invitation_configs enable row level security;
alter table public.guests enable row level security;
alter table public.host_users enable row level security;
alter table public.auth_settings enable row level security;

-- NOTE: Next.js server routes access Supabase via SUPABASE_SERVICE_ROLE_KEY when set,
-- bypassing RLS safely on the server while keeping raw tables protected from arbitrary client queries.
