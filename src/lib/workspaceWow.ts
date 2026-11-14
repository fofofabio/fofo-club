import "server-only";

import { query } from "@/lib/db";

export type WowState = {
  level: number;
  engineeringSkill: number;
  libraryBooks: number;
  // talent row id -> points spent
  talents: Record<string, number>;
  // ids of checked weapon steps / don't-miss items
  checked: string[];
  // armory slug: "name-surname", lowercase; empty = sync disabled
  characterSlug: string;
  // last successful armory sync (ISO timestamp) and equipped ranged weapon
  syncedAt: string;
  equippedRanged: string;
};

export const DEFAULT_WOW_STATE: WowState = {
  level: 33,
  engineeringSkill: 0,
  libraryBooks: 0,
  talents: {},
  checked: [],
  characterSlug: "",
  syncedAt: "",
  equippedRanged: "",
};

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" ? Math.round(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function sanitizeWowState(input: unknown): WowState {
  const raw = (input ?? {}) as Partial<WowState>;
  const talents: Record<string, number> = {};
  if (raw.talents && typeof raw.talents === "object") {
    for (const [key, value] of Object.entries(raw.talents)) {
      if (typeof key === "string" && key.length <= 64) {
        talents[key] = clampInt(value, 0, 5, 0);
      }
    }
  }
  const checked = Array.isArray(raw.checked)
    ? raw.checked.filter((id): id is string => typeof id === "string" && id.length <= 64).slice(0, 200)
    : [];
  const text = (value: unknown, max: number) =>
    typeof value === "string" ? value.slice(0, max) : "";
  return {
    level: clampInt(raw.level, 1, 60, DEFAULT_WOW_STATE.level),
    engineeringSkill: clampInt(raw.engineeringSkill, 0, 300, 0),
    libraryBooks: clampInt(raw.libraryBooks, 0, 25, 0),
    talents,
    checked,
    characterSlug: text(raw.characterSlug, 64).toLowerCase().trim(),
    syncedAt: text(raw.syncedAt, 40),
    equippedRanged: text(raw.equippedRanged, 120),
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
