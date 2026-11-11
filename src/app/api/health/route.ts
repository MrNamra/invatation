import { NextResponse } from "next/server";
import { getHostSession } from "@/lib/auth";
import { resolveStorageBackend } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [storageBackend, sessionUser] = await Promise.all([
      resolveStorageBackend(),
      getHostSession(),
    ]);
    return NextResponse.json({
      storageBackend,
      authenticated: Boolean(sessionUser),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Health check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
