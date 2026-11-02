import { NextResponse } from "next/server";

import { isLegalCar } from "@/lib/driftCars";
import {
  DEFAULT_MODE,
  DEFAULT_TRACK,
  isModeId,
  modeOf,
  parseTime,
  scoreKind,
  trackKey,
} from "@/lib/driftEvents";
import { countRecentRunsByDriver, createDriftRun, listDriftRuns } from "@/lib/driftRuns";

const MAX_SHOT_BYTES = 3_000_000;
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const COOLDOWN_MINUTES = 2;
const MAX_RUNS_PER_COOLDOWN = 3;
const MAX_TRACK_LENGTH = 48;

export async function GET() {
  const runs = await listDriftRuns();

  return NextResponse.json({ runs }, { headers: { "Cache-Control": "no-store" } });
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function parsePoints(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string") return null;

  // People paste straight off the results screen: "53,108" / "53.108" / "53 108".
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;

  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}

export async function POST(request: Request) {
  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return bad("Could not read the form.");
  }

  const driver = (form.get("driver") as string | null)?.trim() ?? "";
  const carId = (form.get("carId") as string | null)?.trim() ?? "";
  const note = ((form.get("note") as string | null) ?? "").trim();
  const mode = ((form.get("mode") as string | null) ?? DEFAULT_MODE).trim();
  // Collapse inner runs of whitespace too, not just the ends: "bayview  loop"
  // and "bayview loop" already share a key, so they should also share a name.
  const track = ((form.get("track") as string | null) ?? DEFAULT_TRACK)
    .replace(/\s+/g, " ")
    .trim();

  if (!driver) return bad("Add your name.");
  if (driver.length > 24) return bad("Name is longer than 24 characters.");
  if (!carId) return bad("Pick the car you drove.");
  if (!isLegalCar(carId)) return bad("That car is not allowed in this league.");
  if (!isModeId(mode)) return bad("Pick a mode the club actually runs.");
  if (!track) return bad("Name the track.");
  if (track.length > MAX_TRACK_LENGTH) return bad("That track name is too long.");

  const key = trackKey(track);
  if (!key) return bad("That track name has no letters or numbers in it.");

  /* Which figure a run carries is decided here by the mode, not by whatever
     the client happened to send, so a drift score can never land in a timed
     event or the other way round. */
  const kind = scoreKind(mode);
  let score: number | null = null;
  let timeMs: number | null = null;

  if (kind === "points") {
    score = parsePoints(form.get("value"));
    if (score === null) return bad("Enter the total score from the results screen.");
    if (score > 10_000_000) return bad("That score is not real.");
  } else {
    const raw = (form.get("value") as string | null) ?? "";
    timeMs = parseTime(raw);
    if (timeMs === null) return bad("Enter the time as m:ss.ms, for example 1:23.45.");
    if (timeMs > 36_000_000) return bad("That time is not real.");
  }

  // Best lap is points in drift and a time everywhere else, and only lap-based
  // modes have one at all.
  const modeInfo = modeOf(mode);
  const bestLapRaw = (form.get("bestLap") as string | null)?.trim() ?? "";
  let bestLap: number | null = null;

  if (bestLapRaw && modeInfo?.hasBestLap) {
    bestLap = kind === "points" ? parsePoints(bestLapRaw) : parseTime(bestLapRaw);
    if (bestLap === null) return bad("Best lap has to be a number.");
    if (kind === "points" && score !== null && bestLap > score) {
      return bad("Best lap cannot beat the three-lap total.");
    }
    if (kind === "time" && timeMs !== null && bestLap > timeMs) {
      return bad("A single lap cannot be slower than the whole run.");
    }
  }

  if (note.length > 120) return bad("Keep the note under 120 characters.");

  const recent = await countRecentRunsByDriver(driver, COOLDOWN_MINUTES);
  if (recent >= MAX_RUNS_PER_COOLDOWN) {
    return NextResponse.json(
      { error: `Slow down — ${MAX_RUNS_PER_COOLDOWN} runs per ${COOLDOWN_MINUTES} minutes.` },
      { status: 429 },
    );
  }

  const file = form.get("shot");
  let shot: { data: Buffer; mime: string } | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_SHOT_BYTES) return bad("Screenshot is larger than 3 MB.");
    if (!ALLOWED_MIMES.has(file.type)) return bad("Screenshot must be a JPEG, PNG or WebP.");

    shot = { data: Buffer.from(await file.arrayBuffer()), mime: file.type };
  }

  // Deliberately not required. Proof is wanted and the rules ask for it, but
  // a hard block just means a real run never gets posted at all, and a run
  // with no screenshot is still better than an empty board.

  const run = await createDriftRun({
    driver,
    carId,
    mode,
    track,
    trackKey: key,
    score,
    timeMs,
    bestLap,
    note,
    shot,
  });

  return NextResponse.json({ run });
}
