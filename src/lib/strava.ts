import 'server-only';
import { unstable_cache, revalidateTag } from 'next/cache';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities';

// simple in-memory token cache (per server instance)
let accessToken: string | null = null;
let accessTokenExpiresAt = 0; // epoch seconds

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (accessToken && accessTokenExpiresAt - 60 > now) return accessToken; // reuse if not near expiry

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // exchange refresh_token for a fresh access_token
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`Strava token error: ${await res.text()}`);
  const json = await res.json();
  accessToken = json.access_token as string;
  accessTokenExpiresAt = json.expires_at as number;
  return accessToken!;
}

async function fetchActivities(perPage = 30) {
  const token = await getAccessToken();
  const res = await fetch(`${STRAVA_ACTIVITIES_URL}?per_page=${perPage}`, {
    headers: { Authorization: `Bearer ${token}` },
    // Let Next cache *this* fetch via unstable_cache wrapper instead
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Strava activities error: ${await res.text()}`);
  const activities = await res.json();

  // minimize payload
  return (activities as any[]).map(a => ({
    id: a.id,
    type: a.type,
    start_date: a.start_date,
    distance: a.distance,
    moving_time: a.moving_time,
    average_speed: a.average_speed,
    map: a.map?.summary_polyline ?? null,
  }));
}

// 10-minute cached getter with a tag so we can purge later
export const getStravaActivitiesCached = unstable_cache(
  async (perPage: number) => fetchActivities(perPage),
  ['strava.activities'],
  { revalidate: 600, tags: ['strava'] }
);

// (optional) call this from a webhook/route to refresh immediately
export function revalidateStrava() {
  revalidateTag('strava', {});
}
