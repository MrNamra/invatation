import { NextResponse } from "next/server";
import { clearSessionCookie, isRequestSecure } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const response = NextResponse.json({ authenticated: false });
  clearSessionCookie(response, isRequestSecure(request));
  return response;
}
