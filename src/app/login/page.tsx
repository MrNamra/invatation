import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginView } from "@/components/LoginView";
import { getAuthRuntimeState, getHostSession } from "@/lib/auth";
import { resolveStorageBackend } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in — Patrika Studio",
};

export default async function LoginPage() {
  const sessionUser = await getHostSession();
  if (sessionUser) {
    redirect("/");
  }

  const [authRuntime, storageBackend] = await Promise.all([
    getAuthRuntimeState(),
    resolveStorageBackend(),
  ]);

  return (
    <LoginView
      storageBackend={storageBackend}
      registrationEnabled={authRuntime.authSettings.registration_enabled}
      maxUsers={authRuntime.authSettings.max_users}
    />
  );
}
