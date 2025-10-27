import { NextResponse } from "next/server";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";

async function getAccessToken() {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // exchange refresh_token for a short-lived access_token
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
    // don’t cache tokens
    cache: "no-store",
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Strava token error: ${msg}`);
  }
  const json = await res.json();
  return json.access_token as string;
}

export async function GET() {
  try {
    const token = await getAccessToken();

    // pull recent activities (tweak per_page as you like)
    const res = await fetch(`${STRAVA_ACTIVITIES_URL}?per_page=30`, {
      headers: { Authorization: `Bearer ${token}` },
      // Next caches the final JSON at the *page* level; keep API “no-store”.
      cache: "no-store",
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Strava activities error: ${msg}`);
    }

    const activities = await res.json();

    // Trim + map to only what the UI needs
    const minimal = activities.map((a: any) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      start_date: a.start_date, // ISO
      distance: a.distance, // meters
      moving_time: a.moving_time, // seconds
      average_speed: a.average_speed, // m/s
      map: a.map?.summary_polyline ?? null,
      // optional stats
      kudos_count: a.kudos_count,
      achievement_count: a.achievement_count,
    }));

    return NextResponse.json({ activities: minimal });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
