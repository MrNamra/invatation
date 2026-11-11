import { NextResponse } from "next/server";
import { markGuestViewed } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const updated = await markGuestViewed(code);
    if (!updated) {
      return NextResponse.json(
        { error: "Invitation code not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      viewed_status: updated.viewed_status,
      viewed_at: updated.viewed_at,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mark viewed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
