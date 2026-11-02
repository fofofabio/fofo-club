import { query } from "@/lib/db";

export type DriftRun = {
  id: string;
  driver: string;
  carId: string;
  mode: string;
  track: string;
  trackKey: string;
  /** Points, for drift. Null in timed modes. */
  score: number | null;
  /** Milliseconds, for timed modes. Null for drift. */
  timeMs: number | null;
  bestLap: number | null;
  note: string;
  hasShot: boolean;
  createdAt: string;
};

type DriftRunRow = {
  id: string;
  driver: string;
  car_id: string;
  mode: string;
  track: string;
  track_key: string;
  score: number | null;
  time_ms: number | null;
  best_lap: number | null;
  note: string;
  has_shot: boolean;
  created_at: Date;
};

const SELECT_COLUMNS = `id, driver, car_id, mode, track, track_key, score, time_ms,
         best_lap, note, (shot_data is not null) as has_shot, created_at`;

function mapRun(row: DriftRunRow): DriftRun {
  return {
    id: row.id,
    driver: row.driver,
    carId: row.car_id,
    mode: row.mode,
    track: row.track,
    trackKey: row.track_key,
    score: row.score === null ? null : Number(row.score),
    timeMs: row.time_ms === null ? null : Number(row.time_ms),
    bestLap: row.best_lap === null ? null : Number(row.best_lap),
    note: row.note,
    hasShot: row.has_shot,
    createdAt: row.created_at.toISOString(),
  };
}

/* Ordering is left to the caller: points and times rank in opposite
   directions, so a single ORDER BY here would be wrong for half the modes.
   See compareRuns in driftEvents. */
export async function listDriftRuns(): Promise<DriftRun[]> {
  const result = await query<DriftRunRow>(
    `select ${SELECT_COLUMNS} from drift_runs order by created_at desc`,
  );

  return result.rows.map(mapRun);
}

export async function createDriftRun(input: {
  driver: string;
  carId: string;
  mode: string;
  track: string;
  trackKey: string;
  score: number | null;
  timeMs: number | null;
  bestLap: number | null;
  note: string;
  shot: { data: Buffer; mime: string } | null;
}): Promise<DriftRun> {
  const result = await query<DriftRunRow>(
    `insert into drift_runs
       (driver, car_id, mode, track, track_key, score, time_ms, best_lap, note, shot_data, shot_mime)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     returning ${SELECT_COLUMNS}`,
    [
      input.driver,
      input.carId,
      input.mode,
      input.track,
      input.trackKey,
      input.score,
      input.timeMs,
      input.bestLap,
      input.note,
      input.shot?.data ?? null,
      input.shot?.mime ?? null,
    ],
  );

  return mapRun(result.rows[0]);
}

export async function deleteDriftRun(id: string) {
  await query(`delete from drift_runs where id = $1`, [id]);
}

export async function getDriftRunShot(id: string) {
  const result = await query<{ shot_data: Buffer | null; shot_mime: string | null }>(
    `select shot_data, shot_mime from drift_runs where id = $1`,
    [id],
  );

  const row = result.rows[0];
  if (!row?.shot_data) return null;

  return { data: row.shot_data, mime: row.shot_mime ?? "image/jpeg" };
}

/** How often a driver has posted in the last `windowMinutes`. Keeps the open form honest. */
export async function countRecentRunsByDriver(driver: string, windowMinutes: number) {
  const result = await query<{ count: string }>(
    `select count(*)::text as count
       from drift_runs
      where lower(driver) = lower($1)
        and created_at > now() - make_interval(mins => $2)`,
    [driver, windowMinutes],
  );

  return Number(result.rows[0]?.count ?? 0);
}
