import { promises as fs } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HostDashboard } from "@/components/HostDashboard";
import { getAuthRuntimeState, getHostSession } from "@/lib/auth";
import {
  getInvitationConfig,
  listGuests,
  resolveStorageBackend,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getInvitationConfig();
  return {
    title: `Patrika Studio — ${config.couple.groom} & ${config.couple.bride}`,
  };
}

export default async function HomePage() {
  const sessionUser = await getHostSession();
  if (!sessionUser) {
    redirect("/login");
  }

  const [config, guests, storageBackend, authRuntime, schemaSql] =
    await Promise.all([
      getInvitationConfig(),
      listGuests(),
      resolveStorageBackend(),
      getAuthRuntimeState(),
      fs
        .readFile(path.join(process.cwd(), "supabase", "schema.sql"), "utf8")
        .catch(() => ""),
    ]);

  const supabaseProjectRef =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
      /https:\/\/([a-z0-9-]+)\.supabase\.co/i
    )?.[1] ?? null;

  return (
    <HostDashboard
      initialConfig={config}
      initialGuests={guests}
      initialStorageBackend={storageBackend}
      schemaSql={schemaSql}
      supabaseProjectRef={supabaseProjectRef}
      currentUser={sessionUser}
      registrationEnabled={authRuntime.authSettings.registration_enabled}
      maxUsers={authRuntime.authSettings.max_users}
    />
  );
}
