import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getWowState, setWowState } from "@/lib/workspaceWow";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const state = await getWowState(userId);
    return NextResponse.json({ state }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "WoW state unavailable." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || !("state" in body)) {
      return NextResponse.json({ error: "Send the WoW state as JSON." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
    }
    const state = await setWowState(userId, body?.state);
    return NextResponse.json({ state }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save WoW state." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
