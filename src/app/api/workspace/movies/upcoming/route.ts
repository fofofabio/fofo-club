import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { fetchUpcomingAustrianMovies } from "@/lib/upcomingMovies";
import { listWorkspaceMovieStates } from "@/lib/workspaceMovies";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [upcoming, states] = await Promise.all([fetchUpcomingAustrianMovies(), listWorkspaceMovieStates(userId)]);
    return NextResponse.json({ ...upcoming, states }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Release calendar unavailable." }, { status: 502 });
  }
}
