import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { fetchUpcomingMovieDetail } from "@/lib/upcomingMovies";

export async function GET(_request: Request, context: { params: Promise<{ movieId: string }> }) {
  if (!(await auth())?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await fetchUpcomingMovieDetail((await context.params).movieId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Movie unavailable." }, { status: 502 });
  }
}
