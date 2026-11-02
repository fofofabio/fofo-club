import { NextResponse } from "next/server";

import { isLegalCar } from "@/lib/driftCars";
import { countRecentRunsByDriver, createDriftRun, listDriftRuns } from "@/lib/driftRuns";

const MAX_SHOT_BYTES = 3_000_000;
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const COOLDOWN_MINUTES = 2;
const MAX_RUNS_PER_COOLDOWN = 3;

export async function GET() {
  const runs = await listDriftRuns();

  return NextResponse.json(
    { runs },
    { headers: { "Cache-Control": "no-store" } },
  );
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
  const score = parsePoints(form.get("score"));
  const bestLapRaw = form.get("bestLap");
  const bestLap =
    typeof bestLapRaw === "string" && bestLapRaw.trim() ? parsePoints(bestLapRaw) : null;

  if (!driver) return bad("Add your name.");
  if (driver.length > 24) return bad("Name is longer than 24 characters.");
  if (!carId) return bad("Pick the car you drove.");
  if (!isLegalCar(carId)) return bad("That car is not allowed in this league.");
  if (score === null) return bad("Enter the total score from the results screen.");
  if (score > 10_000_000) return bad("That score is not real.");
  if (bestLapRaw && typeof bestLapRaw === "string" && bestLapRaw.trim() && bestLap === null) {
    return bad("Best lap has to be a number.");
  }
  if (bestLap !== null && bestLap > score) return bad("Best lap cannot beat the three-lap total.");
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

  if (!shot) return bad("A screenshot of the results screen is required.");

  const run = await createDriftRun({ driver, carId, score, bestLap, note, shot });

  return NextResponse.json({ run });
}
