import { query } from "@/lib/db";

export type DriftRun = {
  id: string;
  driver: string;
  carId: string;
  score: number;
  bestLap: number | null;
  note: string;
  hasShot: boolean;
  createdAt: string;
};

type DriftRunRow = {
  id: string;
  driver: string;
  car_id: string;
  score: number;
  best_lap: number | null;
  note: string;
  has_shot: boolean;
  created_at: Date;
};

function mapRun(row: DriftRunRow): DriftRun {
  return {
    id: row.id,
    driver: row.driver,
    carId: row.car_id,
    score: Number(row.score),
    bestLap: row.best_lap === null ? null : Number(row.best_lap),
    note: row.note,
    hasShot: row.has_shot,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listDriftRuns(): Promise<DriftRun[]> {
  const result = await query<DriftRunRow>(
    `select id, driver, car_id, score, best_lap, note,
            (shot_data is not null) as has_shot, created_at
       from drift_runs
      order by score desc, created_at asc`,
  );

  return result.rows.map(mapRun);
}

export async function createDriftRun(input: {
  driver: string;
  carId: string;
  score: number;
  bestLap: number | null;
  note: string;
  shot: { data: Buffer; mime: string } | null;
}): Promise<DriftRun> {
  const result = await query<DriftRunRow>(
    `insert into drift_runs (driver, car_id, score, best_lap, note, shot_data, shot_mime)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id, driver, car_id, score, best_lap, note,
               (shot_data is not null) as has_shot, created_at`,
    [
      input.driver,
      input.carId,
      input.score,
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
