import { NextResponse } from "next/server";
import {
  attachSessionCookie,
  createSessionToken,
  getHostSession,
  hashPassword,
  isRequestSecure,
  requireHostApiSession,
  toPublicHostUser,
  verifyPassword,
} from "@/lib/auth";
import { getHostUserById, updateHostUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const guard = await requireHostApiSession();
    if (guard.errorResponse) return guard.errorResponse;

    const currentUser = await getHostUserById(guard.user.id);
    if (!currentUser) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    const nextEmail =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const nextDisplayName =
      typeof body.displayName === "string" ? body.displayName.trim() : "";
    const nextPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";

    const patch: Parameters<typeof updateHostUser>[1] = {};

    if (nextDisplayName) {
      patch.display_name = nextDisplayName;
    }

    if (nextEmail || nextPassword) {
      if (!currentPassword || !verifyPassword(currentPassword, currentUser.password_hash)) {
        return NextResponse.json(
          { error: "Current password is required to change email or password" },
          { status: 400 }
        );
      }
      if (nextEmail) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
          return NextResponse.json(
            { error: "Enter a valid email address" },
            { status: 400 }
          );
        }
        patch.email = nextEmail;
      }
      if (nextPassword) {
        if (nextPassword.length < 8) {
          return NextResponse.json(
            { error: "New password must be at least 8 characters" },
            { status: 400 }
          );
        }
        patch.password_hash = hashPassword(nextPassword);
      }
      // Once updated in the UI, stop auto-overwriting credentials from .env defaults
      patch.env_sync_tag = null;
    }

    const updated = await updateHostUser(currentUser.id, patch);
    if (!updated) {
      return NextResponse.json(
        { error: "Could not update account" },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      user: toPublicHostUser(updated),
      sessionUser: await getHostSession(),
    });
    const refreshedToken = createSessionToken(updated);
    attachSessionCookie(response, refreshedToken, isRequestSecure(request));
    return response;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
