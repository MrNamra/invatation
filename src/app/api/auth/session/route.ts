import { NextResponse } from "next/server";
import { getAuthRuntimeState, getHostSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [sessionUser, runtime] = await Promise.all([
      getHostSession(),
      getAuthRuntimeState(),
    ]);
    return NextResponse.json({
      authenticated: Boolean(sessionUser),
      user: sessionUser,
      registrationEnabled: runtime.authSettings.registration_enabled,
      maxUsers: runtime.authSettings.max_users,
      userCount: runtime.users.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Session check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
