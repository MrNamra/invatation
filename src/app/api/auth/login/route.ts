import { NextResponse } from "next/server";
import {
  attachSessionCookie,
  isRequestSecure,
  verifySingleHostLogin,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";

    const result = await verifySingleHostLogin(email, password);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    const response = NextResponse.json({
      authenticated: true,
      user: result.user,
    });
    attachSessionCookie(response, result.token, isRequestSecure(request));
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sign in failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
