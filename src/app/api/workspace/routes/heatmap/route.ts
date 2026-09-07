import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getStravaActivitiesCached } from "@/lib/strava";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const activities = await getStravaActivitiesCached(100);
    return NextResponse.json({
      polylines: activities.filter((activity) => activity.type === "Ride" && activity.map).map((activity) => activity.map),
      source: "personal Strava rides",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ polylines: [], source: "unavailable" }, { headers: { "Cache-Control": "private, no-store" } });
  }
}
