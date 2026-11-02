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

export type Course = {
  name: string;
  /** Route length as the track select screen reports it. */
  miles: number;
  district: string;
};

/* Every Quick Race course in the game, by mode, with the length the track
   select screen shows. Having the real list means the track field can be a
   menu instead of a text box, so nobody invents a spelling.

   Reverse configurations are not listed separately in the source and are not
   listed here either; post one as its own track if the club starts running
   them. */
export const COURSES: Record<ModeId, Course[]> = {
  drift: [
    { name: "Stadium Drift 1", miles: 0.18, district: "City Core" },
    { name: "Stadium Drift 2", miles: 0.3, district: "City Core" },
    { name: "Stadium Drift 3", miles: 0.37, district: "City Core" },
    { name: "Stadium Drift 4", miles: 0.4, district: "City Core" },
    { name: "Stadium Drift 5", miles: 0.5, district: "City Core" },
    { name: "Parkade Drift 1", miles: 0.31, district: "City Core" },
    { name: "Parkade Drift 2", miles: 0.58, district: "City Core" },
    { name: "Parkade Drift 3", miles: 0.61, district: "City Core" },
    { name: "Parkade Drift 4", miles: 0.76, district: "City Core" },
    { name: "Parkade Drift 5", miles: 0.87, district: "City Core" },
    { name: "Parkade Drift 6", miles: 1.16, district: "City Core" },
    { name: "Capilano Heights", miles: 3.96, district: "Jackson Heights" },
    { name: "City Lights", miles: 3.6, district: "Jackson Heights" },
    { name: "Hillside Manor", miles: 4.96, district: "Jackson Heights" },
    { name: "Hollyburn Ridge", miles: 3.96, district: "Jackson Heights" },
    { name: "Lighthouse", miles: 4.96, district: "Jackson Heights" },
    { name: "Powerline", miles: 3.6, district: "Jackson Heights" },
  ],
  circuit: [
    { name: "12th & Arbutus", miles: 4.51, district: "City Core" },
    { name: "Broad Street", miles: 3.26, district: "City Core" },
    { name: "Freemont", miles: 0.98, district: "City Core" },
    { name: "Freeway East", miles: 3.87, district: "City Core" },
    { name: "Freeway West", miles: 3.63, district: "City Core" },
    { name: "Garibaldi Run", miles: 4.66, district: "City Core" },
    { name: "Grandview Station", miles: 3.63, district: "City Core" },
    { name: "Jackpot", miles: 3.29, district: "City Core" },
    { name: "Lower Eastside", miles: 1.97, district: "City Core" },
    { name: "Outer Ring", miles: 3.9, district: "City Core" },
    { name: "Providencia", miles: 1.16, district: "City Core" },
    { name: "Resort Loop", miles: 1.86, district: "City Core" },
    { name: "Scenic Ride", miles: 1.37, district: "City Core" },
    { name: "University Hill", miles: 4.09, district: "City Core" },
    { name: "Woodbine Park", miles: 3.42, district: "City Core" },
    { name: "Ambassador Ridge", miles: 2.32, district: "Beacon Hill" },
    { name: "City Hall", miles: 1.86, district: "Beacon Hill" },
    { name: "Marine & 25th", miles: 3.22, district: "Beacon Hill" },
    { name: "Palm Highway", miles: 3.24, district: "Beacon Hill" },
    { name: "Park Drive", miles: 2.46, district: "Beacon Hill" },
    { name: "Shoreside", miles: 2.06, district: "Beacon Hill" },
    { name: "Switchback", miles: 1.77, district: "Beacon Hill" },
    { name: "Bayview Concrete", miles: 4.76, district: "Coal Harbor" },
    { name: "Boxcar", miles: 3.26, district: "Coal Harbor" },
    { name: "Phoenix Steel", miles: 3.66, district: "Coal Harbor" },
    { name: "Smokestack", miles: 3.46, district: "Coal Harbor" },
    { name: "Bayview Summit", miles: 3.88, district: "Jackson Heights" },
    { name: "Bellavista", miles: 4.87, district: "Jackson Heights" },
    { name: "Dockside", miles: 3.11, district: "Jackson Heights" },
    { name: "Observatory", miles: 1.95, district: "Jackson Heights" },
    { name: "Bayview International", miles: 4.56, district: "Airport" },
  ],
  sprint: [
    { name: "Bayview Plaza", miles: 2.75, district: "City Core" },
    { name: "Black Tusk", miles: 6.19, district: "City Core" },
    { name: "Broadway & Granville", miles: 4.17, district: "City Core" },
    { name: "Cypress Bowl", miles: 5.16, district: "City Core" },
    { name: "Grouse Grind", miles: 3.72, district: "City Core" },
    { name: "Sentinel Hill", miles: 3.22, district: "City Core" },
    { name: "South Junction", miles: 3.35, district: "City Core" },
    { name: "Tailgate", miles: 3.11, district: "City Core" },
    { name: "Upper Deck", miles: 4.95, district: "City Core" },
    { name: "Wall Center", miles: 2.42, district: "City Core" },
    { name: "Palm Hill", miles: 3.68, district: "Beacon Hill" },
    { name: "Palomino & 16th", miles: 2.62, district: "Beacon Hill" },
    { name: "Rockridge Cross", miles: 3.41, district: "Beacon Hill" },
    { name: "The Chief", miles: 4.55, district: "Beacon Hill" },
    { name: "2nd & Bellevue", miles: 6.39, district: "Coal Harbor" },
    { name: "Port Authority", miles: 3.58, district: "Coal Harbor" },
    { name: "Waste Management", miles: 3.82, district: "Coal Harbor" },
    { name: "Blackcomb Way", miles: 4.98, district: "Jackson Heights" },
    { name: "Eagleridge Estates", miles: 4.66, district: "Jackson Heights" },
    { name: "Marathon", miles: 6.08, district: "Jackson Heights" },
    { name: "Rollercoaster", miles: 4.17, district: "Jackson Heights" },
    { name: "Domestic Arrivals", miles: 3.38, district: "Airport" },
    { name: "Terminal & 2nd", miles: 2.78, district: "Airport" },
  ],
  "street-x": [
    { name: "Parkade Track 1", miles: 0.51, district: "City Core" },
    { name: "Parkade Track 2", miles: 0.8, district: "City Core" },
    { name: "Parkade Track 3", miles: 0.55, district: "City Core" },
    { name: "Parkade Track 4", miles: 0.56, district: "City Core" },
    { name: "Industrial Park Track 1", miles: 0.65, district: "Coal Harbor" },
    { name: "Industrial Park Track 2", miles: 0.3, district: "Coal Harbor" },
    { name: "Industrial Park Track 3", miles: 0.39, district: "Coal Harbor" },
    { name: "Industrial Park Track 4", miles: 0.54, district: "Coal Harbor" },
  ],
  drag: [
    { name: "North Freeway", miles: 1.53, district: "City Core" },
    { name: "Tunnel Construction", miles: 1.47, district: "City Core" },
    { name: "Airport Freeway", miles: 1.9, district: "Coal Harbor" },
    { name: "Central Station", miles: 1.06, district: "Coal Harbor" },
    { name: "Coastal Express", miles: 1.06, district: "Coal Harbor" },
    { name: "Switching Yard", miles: 1.0, district: "Coal Harbor" },
    { name: "Bayview Bridge", miles: 1.06, district: "Beacon Hill" },
    { name: "Runway 9", miles: 1.0, district: "Airport" },
    { name: "Runway 15", miles: 1.0, district: "Airport" },
    { name: "South Runway", miles: 1.0, district: "Airport" },
  ],
};

export function coursesFor(mode: string): Course[] {
  return COURSES[mode as ModeId] ?? [];
}

export function findCourse(mode: string, name: string) {
  const key = trackKey(name);
  return coursesFor(mode).find((course) => trackKey(course.name) === key);
}

/** Courses grouped by district, in the order the districts first appear. */
export function coursesByDistrict(mode: string) {
  const groups = new Map<string, Course[]>();

  for (const course of coursesFor(mode)) {
    const held = groups.get(course.district);
    if (held) held.push(course);
    else groups.set(course.district, [course]);
  }

  return [...groups.entries()];
}

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
