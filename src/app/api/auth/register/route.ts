import { NextResponse } from "next/server";
import { attemptRegisterHost } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await attemptRegisterHost();
    return NextResponse.json(
      { error: result.error, registrationEnabled: false },
      { status: result.status }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration disabled";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
