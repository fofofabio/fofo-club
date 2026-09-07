import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { findCyclingRoute } from "@/lib/cyclingRoutes";
import { setWorkspaceRouteState, type RouteTraffic } from "@/lib/workspaceRoutes";

const TRAFFIC = new Set<RouteTraffic>(["peaceful", "mixed", "busy"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ routeId: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { routeId } = await context.params;
  if (!findCyclingRoute(routeId)) return NextResponse.json({ error: "Route not found." }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid route state." }, { status: 400 });
  const value = body as Record<string, unknown>;
  const rating = value.rating === null ? null : Number(value.rating);
  const traffic = value.traffic === null ? null : value.traffic;
  if ((rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) ||
      (traffic !== null && (typeof traffic !== "string" || !TRAFFIC.has(traffic as RouteTraffic)))) {
    return NextResponse.json({ error: "Invalid route feedback." }, { status: 400 });
  }
  const state = await setWorkspaceRouteState(userId, routeId, {
    saved: value.saved === true,
    ridden: value.ridden === true,
    rating,
    traffic: traffic as RouteTraffic | null,
    note: typeof value.note === "string" ? value.note.trim().slice(0, 1000) : "",
  });
  return NextResponse.json({ state }, { headers: { "Cache-Control": "private, no-store" } });
}
