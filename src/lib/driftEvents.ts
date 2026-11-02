/* The modes the club runs, and the one fact that shapes everything else: a
   drift run is won by the HIGHEST number and every other mode by the LOWEST.
   Ranking, parsing, formatting and validation all read from here rather than
   each deciding for themselves.

   These are the five Quick Race modes. Outrun, SUV and URL are career-only in
   Underground 2, so they cannot be set up as a fair repeatable event and are
   deliberately left out. */

export type ScoreKind = "points" | "time";
export type ModeId = "drift" | "circuit" | "sprint" | "street-x" | "drag";

export type DriftMode = {
  id: ModeId;
  name: string;
  kind: ScoreKind;
  /** What the results screen gives you, in the words the game uses. */
  unit: string;
  blurb: string;
  /** Only lap-based modes have a best lap worth recording. */
  hasBestLap: boolean;
};

export const MODES: DriftMode[] = [
  {
    id: "drift",
    name: "Drift",
    kind: "points",
    unit: "points",
    blurb: "Most points once the laps are done",
    hasBestLap: true,
  },
  {
    id: "circuit",
    name: "Circuit",
    kind: "time",
    unit: "time",
    blurb: "Laps around a loop, first to finish",
    hasBestLap: true,
  },
  {
    id: "sprint",
    name: "Sprint",
    kind: "time",
    unit: "time",
    blurb: "Point to point, no second chances",
    hasBestLap: false,
  },
  {
    id: "street-x",
    name: "Street X",
    kind: "time",
    unit: "time",
    blurb: "Tight enclosed loop, laps counted",
    hasBestLap: true,
  },
  {
    id: "drag",
    name: "Drag",
    kind: "time",
    unit: "time",
    blurb: "Shift well or blow the engine",
    hasBestLap: false,
  },
];

export const MODES_BY_ID = new Map(MODES.map((mode) => [mode.id, mode]));

export const DEFAULT_MODE: ModeId = "drift";
export const DEFAULT_TRACK = "Stadium Drift 2";
export const DEFAULT_TRACK_KEY = "stadium-drift-2";

export function isModeId(value: string): value is ModeId {
  return MODES_BY_ID.has(value as ModeId);
}

export function modeOf(id: string) {
  return MODES_BY_ID.get(id as ModeId);
}

export function scoreKind(id: string): ScoreKind {
  return modeOf(id)?.kind ?? "points";
}

/* Track names are typed by hand, so they get folded to a key before anything
   groups by them. Without this, "Stadium Drift 2" and "stadium  drift 2" would
   quietly become two separate leaderboards. */
export function trackKey(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* Accepts what a results screen shows and what people type from it:
   "1:23.45", "1:23", "1:23:450", "83.45", "83".

   A colon means minutes are present, a dot means the fraction is starting, so
   the two forms are parsed separately. Bare seconds are allowed to run past 59
   ("83.45"), which is a normal way to copy a short time down. */
export function parseTime(input: string): number | null {
  const text = input.trim();
  if (!text) return null;

  // "4" means .400, "45" means .450, "456" means .456.
  const toMillis = (frac?: string) => (frac ? Number(frac.padEnd(3, "0").slice(0, 3)) : 0);

  const withMinutes = text.match(/^(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?$/);
  if (withMinutes) {
    const [, mm, ss, frac] = withMinutes;
    if (Number(ss) > 59) return null;
    const total = Number(mm) * 60_000 + Number(ss) * 1000 + toMillis(frac);
    return total > 0 ? total : null;
  }

  const secondsOnly = text.match(/^(\d{1,4})(?:\.(\d{1,3}))?$/);
  if (secondsOnly) {
    const [, ss, frac] = secondsOnly;
    const total = Number(ss) * 1000 + toMillis(frac);
    return total > 0 ? total : null;
  }

  return null;
}

export function formatTime(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  const tail = `${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;

  return minutes > 0 ? `${minutes}:${tail}` : tail;
}

const numberFormat = new Intl.NumberFormat("en-GB");

/** The headline figure for a run, formatted the way its mode is read. */
export function formatValue(mode: string, score: number | null, timeMs: number | null) {
  if (scoreKind(mode) === "time") return timeMs === null ? "—" : formatTime(timeMs);
  return score === null ? "—" : numberFormat.format(score);
}

/* Sorts a mode's runs best-first. The whole point of this module: points go
   down from the top, times go up from the bottom. */
export function compareRuns(
  mode: string,
  a: { score: number | null; timeMs: number | null; createdAt: string },
  b: { score: number | null; timeMs: number | null; createdAt: string },
) {
  if (scoreKind(mode) === "time") {
    const left = a.timeMs ?? Number.POSITIVE_INFINITY;
    const right = b.timeMs ?? Number.POSITIVE_INFINITY;
    if (left !== right) return left - right;
  } else {
    const left = a.score ?? Number.NEGATIVE_INFINITY;
    const right = b.score ?? Number.NEGATIVE_INFINITY;
    if (left !== right) return right - left;
  }

  // Tie on the figure: whoever posted it first keeps the better place.
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}

/** True when `candidate` beats `held` in this mode. */
export function beats(
  mode: string,
  candidate: { score: number | null; timeMs: number | null },
  held: { score: number | null; timeMs: number | null },
) {
  if (scoreKind(mode) === "time") {
    return (candidate.timeMs ?? Infinity) < (held.timeMs ?? Infinity);
  }
  return (candidate.score ?? -Infinity) > (held.score ?? -Infinity);
}
