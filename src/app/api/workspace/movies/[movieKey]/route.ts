import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { fetchMovieDetail } from "@/lib/nonstopMovies";
import { setWorkspaceMovieState, type MovieState } from "@/lib/workspaceMovies";

const MOVIE_STATES = new Set<MovieState>(["watchlist", "seen", "dismissed"]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ movieKey: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { movieKey } = await context.params;
  try {
    return NextResponse.json(await fetchMovieDetail(movieKey), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Movie unavailable." },
      { status: 502 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ movieKey: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { movieKey } = await context.params;
  if (!/^[a-z0-9%_-]{1,160}$/i.test(movieKey)) return NextResponse.json({ error: "Invalid movie." }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid state." }, { status: 400 });
  const candidate = body as { state?: unknown; note?: unknown };
  const state = candidate.state === null ? null : candidate.state;
  const note = typeof candidate.note === "string" ? candidate.note.trim().slice(0, 1000) : "";
  if (state !== null && (typeof state !== "string" || !MOVIE_STATES.has(state as MovieState))) {
    return NextResponse.json({ error: "Invalid state." }, { status: 400 });
  }
  const movieState = await setWorkspaceMovieState(userId, movieKey, state as MovieState | null, note);
  return NextResponse.json({ state: movieState }, { headers: { "Cache-Control": "private, no-store" } });
}
