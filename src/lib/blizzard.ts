import "server-only";

// Minimal Blizzard API client for the WoW Forever armory.
// Uses client-credentials OAuth; the profile-forever-* namespace is
// undocumented community knowledge and may change.

const REGION = process.env.BLIZZARD_REGION ?? "eu";
const NAMESPACE = process.env.BLIZZARD_FOREVER_NAMESPACE ?? `profile-forever-${REGION}`;

type CachedToken = { token: string; expiresAt: number };
declare global {
  var __fofoBlizzardToken: CachedToken | undefined;
}

async function getAccessToken(): Promise<string> {
  const cached = global.__fofoBlizzardToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Blizzard API is not configured. Set BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET.");
  }

  const response = await fetch(`https://oauth.battle.net/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Blizzard token request failed (${response.status}).`);
  const body = (await response.json()) as { access_token: string; expires_in: number };
  global.__fofoBlizzardToken = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return body.access_token;
}

async function profileFetch<T>(path: string): Promise<T | null> {
  const token = await getAccessToken();
  const url = new URL(`https://${REGION}.api.blizzard.com${path}`);
  url.searchParams.set("namespace", NAMESPACE);
  url.searchParams.set("locale", "en_GB");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Blizzard API request failed (${response.status}) for ${path}.`);
  return (await response.json()) as T;
}

export type ArmoryCharacter = {
  level: number | null;
  name: string | null;
  equippedRanged: string | null;
  engineeringSkill: number | null;
};

type CharacterProfile = { name?: string; level?: number };
type EquipmentResponse = {
  equipped_items?: Array<{ slot?: { type?: string }; name?: string }>;
};
type ProfessionsResponse = {
  primaries?: Array<{
    profession?: { name?: string };
    skill_points?: number;
    max_skill_points?: number;
    tiers?: Array<{ skill_points?: number; tier?: { name?: string } }>;
  }>;
};

// slug: "name-surname", lowercase (Forever characters are realmless).
export async function fetchForeverCharacter(slug: string): Promise<ArmoryCharacter | null> {
  const base = `/profile/wow/character/${encodeURIComponent(slug)}`;
  const profile = await profileFetch<CharacterProfile>(base);
  if (!profile) return null;

  const [equipment, professions] = await Promise.all([
    profileFetch<EquipmentResponse>(`${base}/equipment`).catch(() => null),
    profileFetch<ProfessionsResponse>(`${base}/professions`).catch(() => null),
  ]);

  const ranged = equipment?.equipped_items?.find((item) => item.slot?.type === "RANGED")?.name ?? null;

  let engineeringSkill: number | null = null;
  const engineering = professions?.primaries?.find((entry) =>
    (entry.profession?.name ?? "").toLowerCase().includes("engineering"),
  );
  if (engineering) {
    engineeringSkill =
      engineering.skill_points ??
      engineering.tiers?.reduce((max, tier) => Math.max(max, tier.skill_points ?? 0), 0) ??
      null;
  }

  return {
    level: typeof profile.level === "number" ? profile.level : null,
    name: profile.name ?? null,
    equippedRanged: ranged,
    engineeringSkill,
  };
}
