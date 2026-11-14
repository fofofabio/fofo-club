import "server-only";

import { query } from "@/lib/db";

export type WowState = {
  level: number;
  engineeringSkill: number;
  libraryBooks: number;
  // ids of checked milestone goals
  checked: string[];
  // armory slug: "name-surname", lowercase; empty = sync disabled
  characterSlug: string;
  // last successful armory sync (ISO timestamp) and equipped ranged weapon
  syncedAt: string;
  equippedRanged: string;
  // armory snapshot extras; 0 / "" = unknown
  experience: number;
  experienceLevel: number; // the level `experience` was measured at
  guild: string;
  itemLevel: number;
  lastLogin: string;
  petName: string;
  petFamily: string;
  petLevel: number;
};

export const DEFAULT_WOW_STATE: WowState = {
  level: 33,
  engineeringSkill: 0,
  libraryBooks: 0,
  checked: [],
  characterSlug: "",
  syncedAt: "",
  equippedRanged: "",
  experience: 0,
  experienceLevel: 0,
  guild: "",
  itemLevel: 0,
  lastLogin: "",
  petName: "",
  petFamily: "",
  petLevel: 0,
};

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" ? Math.round(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function sanitizeWowState(input: unknown): WowState {
  const raw = (input ?? {}) as Partial<WowState>;
  const checked = Array.isArray(raw.checked)
    ? raw.checked.filter((id): id is string => typeof id === "string" && id.length <= 64).slice(0, 200)
    : [];
  const text = (value: unknown, max: number) =>
    typeof value === "string" ? value.slice(0, max) : "";
  return {
    level: clampInt(raw.level, 1, 60, DEFAULT_WOW_STATE.level),
    engineeringSkill: clampInt(raw.engineeringSkill, 0, 300, 0),
    libraryBooks: clampInt(raw.libraryBooks, 0, 25, 0),
    checked,
    characterSlug: text(raw.characterSlug, 64).toLowerCase().trim(),
    syncedAt: text(raw.syncedAt, 40),
    equippedRanged: text(raw.equippedRanged, 120),
    experience: clampInt(raw.experience, 0, 1_000_000, 0),
    experienceLevel: clampInt(raw.experienceLevel, 0, 60, 0),
    guild: text(raw.guild, 80),
    itemLevel: clampInt(raw.itemLevel, 0, 1000, 0),
    lastLogin: text(raw.lastLogin, 40),
    petName: text(raw.petName, 40),
    petFamily: text(raw.petFamily, 40),
    petLevel: clampInt(raw.petLevel, 0, 60, 0),
  };
}

export async function getWowState(userId: string): Promise<WowState> {
  const result = await query<{ data: unknown }>(
    `select data from workspace_wow_state where user_id = $1`,
    [userId],
  );
  if (result.rows.length === 0) return DEFAULT_WOW_STATE;
  return sanitizeWowState(result.rows[0].data);
}

export async function setWowState(userId: string, state: unknown): Promise<WowState> {
  const clean = sanitizeWowState(state);
  await query(
    `insert into workspace_wow_state (user_id, data)
     values ($1, $2::jsonb)
     on conflict (user_id) do update
       set data = excluded.data, updated_at = now()`,
    [userId, JSON.stringify(clean)],
  );
  return clean;
}
