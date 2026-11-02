"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CARS_BY_ID, DRIFT_CARS, type DriftCar } from "@/lib/driftCars";
import {
  beats,
  compareRuns,
  coursesByDistrict,
  coursesFor,
  DEFAULT_MODE,
  DEFAULT_TRACK,
  DEFAULT_TRACK_KEY,
  formatTime,
  formatValue,
  MODES,
  modeOf,
  scoreKind,
  trackKey as toTrackKey,
} from "@/lib/driftEvents";
import type { DriftRun } from "@/lib/driftRuns";

import Crown from "./Crown";
import styles from "./drift.module.css";

const MAX_EDGE = 1600;
const TARGET_TYPE = "image/jpeg";
const TARGET_QUALITY = 0.82;
const NAME_KEY = "drift-club:driver";
/** Sentinel for the track select: anything the course list does not name. */
const OTHER_TRACK = "__other__";

type Tab = "board" | "rules" | "cars" | "post";

const TABS: { id: Tab; label: string }[] = [
  { id: "board", label: "Leaderboard" },
  { id: "rules", label: "Rules" },
  { id: "cars", label: "Cars" },
  { id: "post", label: "Post a run" },
];

type Props = {
  initialRuns: DriftRun[];
  canModerate: boolean;
};

const fmt = new Intl.NumberFormat("en-GB");

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/* Scores roll up from zero the way a results screen tallies them, instead of
   simply being printed. */
function useCountUp(target: number, delayMs = 0) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    let frame = 0;
    let startedAt = 0;
    const duration = 850;

    setValue(0);

    const tick = (now: number) => {
      if (!startedAt) startedAt = now;
      const elapsed = now - startedAt - delayMs;

      if (elapsed < 0) {
        frame = window.requestAnimationFrame(tick);
        return;
      }

      const t = Math.min(1, elapsed / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));

      if (t < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target, delayMs]);

  return value;
}

function Odometer({ value, delay }: { value: number; delay?: number }) {
  return <>{fmt.format(useCountUp(value, delay))}</>;
}

/* A run's headline figure. Points tally up the way a results screen counts
   them; a lap time does not, because a clock running backwards to your time
   reads as the timer still going rather than as a score being totted up. */
function RunValue({ run, delay }: { run: DriftRun; delay?: number }) {
  if (scoreKind(run.mode) === "time") {
    return <>{formatValue(run.mode, run.score, run.timeMs)}</>;
  }
  return <Odometer value={run.score ?? 0} delay={delay} />;
}

/* A one-word read on a score. Nobody needs it, everybody will check it. */
function verdict(score: number) {
  if (score >= 90_000) return "menace";
  if (score >= 70_000) return "sideways merchant";
  if (score >= 50_000) return "respectable";
  if (score >= 30_000) return "getting there";
  if (score >= 15_000) return "tourist";
  return "mostly straight";
}

/* Picking the Escalade is a decision, and the board should acknowledge it. */
function carAside(carId: string) {
  if (carId === "escalade") return "chose violence";
  if (carId === "corolla") return "the hard way";
  return null;
}

/* Photos off a phone are 4 MB of nothing. Shrink in the browser so the upload
   stays small and the 3 MB server cap never becomes the thing that stops
   anyone posting a run. */
async function prepareShot(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file is not an image"));
    img.src = dataUrl;
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));

  // Already small enough, and a format we accept: ship the original bytes.
  if (scale === 1 && file.size < 2_000_000 && file.type === TARGET_TYPE) {
    return { file, preview: dataUrl };
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that image");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, TARGET_TYPE, TARGET_QUALITY),
  );
  if (!blob) throw new Error("Could not process that image");

  return {
    file: new File([blob], "run.jpg", { type: TARGET_TYPE }),
    // data: URL, not blob: — the site CSP allows the former in img-src.
    preview: canvas.toDataURL(TARGET_TYPE, 0.7),
  };
}

/* Abstract arcs and nodes drifting behind the menu. Drawn here so they scale
   with the viewport and cost nothing to ship. */
function Backdrop({ near }: { near?: boolean }) {
  return (
    <svg
      className={`${styles.wire} ${near ? styles.wireNear : ""}`}
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <g strokeWidth="1.1">
        <path d="M-60 250 C 220 120, 420 360, 700 210 S 1120 120, 1300 260" />
        <path d="M-60 300 C 230 180, 430 420, 710 270 S 1130 185, 1310 320" opacity="0.6" />
        <path d="M-40 640 C 260 540, 480 720, 760 600 S 1120 520, 1290 620" opacity="0.75" />
        <path d="M980 -40 C 900 160, 1080 300, 1010 500 S 900 700, 960 860" opacity="0.5" />
        <path d="M190 -40 C 250 190, 90 320, 170 520 S 260 700, 200 860" opacity="0.45" />
      </g>
      <g strokeWidth="1.4">
        <circle cx="700" cy="210" r="7" />
        <circle cx="700" cy="210" r="15" opacity="0.5" />
        <circle cx="170" cy="520" r="5" opacity="0.7" />
        <circle cx="1010" cy="500" r="9" opacity="0.6" />
        <circle cx="760" cy="600" r="5" opacity="0.5" />
      </g>
    </svg>
  );
}

/* Wet tarmac below the horizon. Pure CSS, built in the stylesheet; this just
   puts the layer in the tree. */
function Ground() {
  return <div className={styles.ground} aria-hidden />;
}

/* Film grain, generated rather than shipped as a texture. */
function Grain() {
  return (
    <svg className={styles.grain} aria-hidden>
      <filter id="dc-grain-noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#dc-grain-noise)" opacity="0.5" />
    </svg>
  );
}

/* Each panel is framed as a small window, caption bar and all. */
function Panel({
  name,
  flush,
  className,
  children,
}: {
  name: string;
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${styles.panel} ${flush ? styles.panelFlush : ""} ${className ?? ""}`}>
      <header className={styles.winBar}>
        <span className={styles.winName}>
          <span className={styles.winDot} aria-hidden />
          {name}
        </span>
        <span className={styles.winGlyphs} aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </header>
      <div className={styles.winBody}>{children}</div>
    </section>
  );
}

/* Original line glyphs for the strip, one weight, one size. */
function TileGlyph({ tab }: { tab: Tab }) {
  const common = {
    className: styles.tileGlyph,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (tab === "board") {
    return (
      <svg {...common}>
        <path d="M5 20v-6M12 20V5M19 20v-9" />
        <path d="M3 20h18" />
      </svg>
    );
  }

  if (tab === "rules") {
    return (
      <svg {...common}>
        <path d="M6 3h12v18H6z" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </svg>
    );
  }

  if (tab === "cars") {
    return (
      <svg {...common}>
        <path d="M3 14l1.6-4.4A2 2 0 016.5 8h11a2 2 0 011.9 1.6L21 14v4h-3M3 18v-4m0 4h3" />
        <path d="M6 18h12" />
        <circle cx="7.5" cy="16.5" r="1.6" />
        <circle cx="16.5" cy="16.5" r="1.6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 16V4" />
      <path d="M7.5 8.5L12 4l4.5 4.5" />
      <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
    </svg>
  );
}

export default function DriftBoard({ initialRuns, canModerate }: Props) {
  const [runs, setRuns] = useState(initialRuns);
  const [tab, setTab] = useState<Tab>("board");
  const [shot, setShot] = useState<{ file: File; preview: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<DriftRun | null>(null);
  const [savedName, setSavedName] = useState("");
  const [attract, setAttract] = useState<number | null>(null);
  // Which board you are looking at. Stadium Drift 2 is the house standard.
  const [mode, setMode] = useState<string>(DEFAULT_MODE);
  const [track, setTrack] = useState<string>(DEFAULT_TRACK_KEY);
  // The post form picks its own mode, so you can log a sprint while reading
  // the drift board.
  const [formMode, setFormMode] = useState<string>(DEFAULT_MODE);
  const [formTrack, setFormTrack] = useState<string>(DEFAULT_TRACK);

  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  /* Pointer parallax for the backdrop layers. Written straight to CSS custom
     properties through a rAF so React never re-renders on mouse move. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;

    const onMove = (event: PointerEvent) => {
      if (frame) return;

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const x = event.clientX / window.innerWidth - 0.5;
        const y = event.clientY / window.innerHeight - 0.5;
        root.style.setProperty("--px", x.toFixed(3));
        root.style.setProperty("--py", y.toFixed(3));
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Bottom left of a game menu says whose profile is loaded. Same here.
  useEffect(() => {
    try {
      setSavedName(window.localStorage.getItem(NAME_KEY) ?? "");
    } catch {
      /* private window, no profile slot, nothing breaks */
    }
  }, []);

  /* Attract mode. Leave the page alone for a while and it starts walking a
     highlight down the standings, the way an arcade cabinet runs a demo when
     nobody is playing. Any input at all puts it away. */
  useEffect(() => {
    if (tab !== "board" || prefersReducedMotion()) return;

    let idle: ReturnType<typeof setTimeout>;
    let cycle: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
      if (cycle) window.clearInterval(cycle);
      cycle = undefined;
      setAttract((held) => (held === null ? held : null));
    };

    const start = () => {
      let index = 0;
      setAttract(0);
      cycle = window.setInterval(() => {
        index += 1;
        setAttract(index);
      }, 2400) as unknown as ReturnType<typeof setInterval>;
    };

    const bump = () => {
      stop();
      window.clearTimeout(idle);
      idle = setTimeout(start, 45_000);
    };

    const events = ["pointermove", "pointerdown", "keydown", "scroll", "wheel"];
    events.forEach((name) => window.addEventListener(name, bump, { passive: true }));
    bump();

    return () => {
      events.forEach((name) => window.removeEventListener(name, bump));
      window.clearTimeout(idle);
      if (cycle) window.clearInterval(cycle);
    };
  }, [tab]);

  /* Every event anyone has posted to, plus the house standard so the default
     board exists on an empty database. */
  const events = useMemo(() => {
    const found = new Map<string, { mode: string; track: string; trackKey: string; runs: number }>();
    found.set(`${DEFAULT_MODE}:${DEFAULT_TRACK_KEY}`, {
      mode: DEFAULT_MODE,
      track: DEFAULT_TRACK,
      trackKey: DEFAULT_TRACK_KEY,
      runs: 0,
    });

    for (const run of runs) {
      const id = `${run.mode}:${run.trackKey}`;
      const held = found.get(id);
      if (held) held.runs += 1;
      else found.set(id, { mode: run.mode, track: run.track, trackKey: run.trackKey, runs: 1 });
    }

    return [...found.values()];
  }, [runs]);

  const tracksInMode = useMemo(
    () => events.filter((event) => event.mode === mode).sort((a, b) => b.runs - a.runs),
    [events, mode],
  );

  const currentEvent = useMemo(
    () => tracksInMode.find((event) => event.trackKey === track) ?? tracksInMode[0],
    [tracksInMode, track],
  );

  /* One line per driver: their best run on THIS event. Points rank downward
     and times upward, which is why the comparison is delegated rather than
     written as a sort here. */
  const standings = useMemo(() => {
    if (!currentEvent) return [];
    const best = new Map<string, DriftRun>();

    for (const run of runs) {
      if (run.mode !== currentEvent.mode || run.trackKey !== currentEvent.trackKey) continue;
      const key = run.driver.toLowerCase();
      const held = best.get(key);
      if (!held || beats(run.mode, run, held)) best.set(key, run);
    }

    return [...best.values()].sort((a, b) => compareRuns(currentEvent.mode, a, b));
  }, [runs, currentEvent]);

  const kind = currentEvent ? scoreKind(currentEvent.mode) : "points";
  // The form follows its own mode, which need not be the board being read.
  const formKind = scoreKind(formMode);
  const formHasBestLap = modeOf(formMode)?.hasBestLap ?? false;

  /* Everything posted lately, newest first, for the crawl. Unlike the
     standings this keeps repeat runs, which is the point: it shows the board
     is being used, not just who is winning. */
  const recent = useMemo(
    () =>
      [...runs]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 12),
    [runs],
  );

  // Front drive is a genuinely harder bracket, so the board notes who leads it.
  const bestFwdId = useMemo(() => {
    const fwd = standings.find((run) => CARS_BY_ID.get(run.carId)?.drivetrain === "FWD");
    return fwd && fwd !== standings[0] ? fwd.id : null;
  }, [standings]);

  const pickShot = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    try {
      setShot(await prepareShot(file));
    } catch (cause) {
      setShot(null);
      setError(cause instanceof Error ? cause.message : "Could not read that file");
    }
  }, []);

  useEffect(() => {
    if (!lightbox) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const data = new FormData(form);

    if (!shot) {
      setError("Add the screenshot of your results screen");
      return;
    }

    data.set("shot", shot.file);
    setBusy(true);
    setError(null);
    setPosted(null);

    try {
      const response = await fetch("/api/drift/runs", { method: "POST", body: data });
      const payload = (await response.json()) as { run?: DriftRun; error?: string };

      if (!response.ok || !payload.run) {
        setError(payload.error ?? "Could not post that run");
        return;
      }

      const run = payload.run;
      // Leading is per event, so compare against the top of the board this run
      // actually belongs to rather than whatever is on screen.
      const sameEvent = standings.filter(
        (held) => held.mode === run.mode && held.trackKey === run.trackKey,
      );
      const tookIt = !sameEvent[0] || beats(run.mode, run, sameEvent[0]);
      const shown = formatValue(run.mode, run.score, run.timeMs);

      setRuns((current) => [run, ...current]);
      setPosted(
        tookIt
          ? `${run.driver} takes ${run.track} with ${shown}`
          : `Posted, ${shown} on ${run.track}`,
      );

      // Drop the reader on the board they just posted to.
      setMode(run.mode);
      setTrack(run.trackKey);

      try {
        window.localStorage.setItem(NAME_KEY, run.driver);
      } catch {
        /* no profile slot available, carry on */
      }
      setSavedName(run.driver);

      form.reset();
      setShot(null);
      setTab("board");
    } catch {
      setError("Network dropped, try that again");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(run: DriftRun) {
    const shown = formatValue(run.mode, run.score, run.timeMs);
    if (!window.confirm(`Delete the ${shown} run by ${run.driver} on ${run.track}?`)) return;

    const response = await fetch(`/api/drift/runs/${run.id}`, { method: "DELETE" });
    if (response.ok) setRuns((current) => current.filter((item) => item.id !== run.id));
  }

  const legalCars = DRIFT_CARS.filter((car) => car.legality !== "banned");
  const [leader, ...rest] = standings;
  const leaderCar = leader ? CARS_BY_ID.get(leader.carId) : undefined;
  const current = TABS.find((entry) => entry.id === tab);

  const tileCount: Record<Tab, string> = {
    board: `${standings.length} ${standings.length === 1 ? "driver" : "drivers"}`,
    rules: "6 of them",
    cars: `${legalCars.length} allowed`,
    post: "one try",
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <Backdrop />
      <Backdrop near />
      <Ground />
      <Grain />
      <div className={styles.frame}>
        <div className={styles.titleBar}>
          <span className={styles.titleWrap}>
            <h1 className={styles.title}>Drift Club</h1>
          </span>
          <div className={styles.track} aria-hidden>
            <span className={styles.trackNub} />
          </div>
        </div>

        <nav className={styles.strip} aria-label="Sections">
          <div className={styles.tiles}>
            {TABS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`${styles.tile} ${tab === entry.id ? styles.tileActive : ""}`}
                aria-current={tab === entry.id ? "page" : undefined}
                onClick={() => setTab(entry.id)}
              >
                <TileGlyph tab={entry.id} />
                {entry.label}
                <span className={styles.tileCount}>{tileCount[entry.id]}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.stripArrow}
            aria-label="Next section"
            onClick={() => {
              const index = TABS.findIndex((entry) => entry.id === tab);
              setTab(TABS[(index + 1) % TABS.length].id);
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M10 8l4 4-4 4" />
            </svg>
          </button>
        </nav>

        <p className={styles.currentName}>{current?.label}</p>

        <div className={styles.body}>
          {tab === "board" ? (
            <>
              <div className={styles.picker}>
                <div className={styles.pickerGroup}>
                  <span className={styles.pickerLabel}>Mode</span>
                  {MODES.map((entry) => {
                    const has = events.some((event) => event.mode === entry.id);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        className={`${styles.modeChip} ${
                          mode === entry.id ? styles.modeChipOn : ""
                        }`}
                        title={entry.blurb}
                        onClick={() => {
                          setMode(entry.id);
                          // Jump to that mode's busiest board rather than
                          // leaving a track key that belongs to another mode.
                          const first = events
                            .filter((event) => event.mode === entry.id)
                            .sort((a, b) => b.runs - a.runs)[0];
                          setTrack(first ? first.trackKey : DEFAULT_TRACK_KEY);
                        }}
                      >
                        {entry.name}
                        {has ? "" : " ·"}
                      </button>
                    );
                  })}
                </div>

                <div className={styles.pickerGroup}>
                  <span className={styles.pickerLabel}>Track</span>
                  <select
                    className={styles.trackSelect}
                    value={currentEvent?.trackKey ?? ""}
                    onChange={(event) => setTrack(event.target.value)}
                    aria-label="Track"
                  >
                    {tracksInMode.length === 0 ? (
                      <option value="">Nothing posted yet</option>
                    ) : (
                      tracksInMode.map((event) => (
                        <option key={event.trackKey} value={event.trackKey}>
                          {event.track}
                          {event.runs ? ` (${event.runs})` : ""}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <span className={styles.pickerNote}>
                  {kind === "time" ? "Lowest time wins" : "Highest points win"}
                </span>
              </div>

              {!leader ? (
                <Panel name="standings.dat">
                  <p className={styles.empty}>
                    Nothing posted on this one yet. Somebody has to go first.
                  </p>
                </Panel>
              ) : (
              <>
                <div className={styles.split}>
                  <Panel name={`${leader.driver.toLowerCase()}_run.jpg`} flush>
                    {leader.hasShot ? (
                      <button
                        type="button"
                        className={styles.preview}
                        onClick={() => setLightbox(leader)}
                        aria-label={`Open the results screen posted by ${leader.driver}`}
                      >
                        {/* Same file, blurred out behind itself, so an oddly
                            shaped capture does not leave the panel half empty.
                            Decorative: the real one below carries the alt. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className={styles.previewHaze} src={`/api/drift/shot/${leader.id}`} alt="" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className={styles.previewImg}
                          src={`/api/drift/shot/${leader.id}`}
                          alt={`Results screen, ${formatValue(leader.mode, leader.score, leader.timeMs)}`}
                        />
                        <span className={styles.plate}>
                          <Crown className={styles.plateCrown} />
                          <span>
                            <span className={styles.plateName}>{leader.driver}</span>
                            <span className={styles.plateUnder}>
                              Holds the board since {formatDate(leader.createdAt)}
                            </span>
                          </span>
                        </span>
                      </button>
                    ) : (
                      <div className={styles.previewEmpty}>No screenshot</div>
                    )}
                  </Panel>

                  <Panel name="run_details">
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>
                        {kind === "time" ? "Time" : "Points"}
                      </span>
                      <span className={styles.fieldBox}>
                        <span className={`${styles.fieldValue} ${styles.fieldValueBig}`}>
                          <RunValue run={leader} delay={220} />
                        </span>
                        {leader.score !== null ? (
                          <span className={styles.fieldSuffix}>{verdict(leader.score)}</span>
                        ) : null}
                      </span>
                    </div>

                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Car</span>
                      <span className={styles.fieldBox}>
                        <span className={styles.fieldValue}>
                          {leaderCar?.name ?? leader.carId}
                        </span>
                        {leaderCar ? (
                          <span className={styles.fieldSuffix}>
                            {leaderCar.drivetrain}
                            {carAside(leader.carId) ? `, ${carAside(leader.carId)}` : ""}
                          </span>
                        ) : null}
                      </span>
                    </div>

                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Best lap</span>
                      <span className={styles.fieldBox}>
                        <span
                          className={`${styles.fieldValue} ${
                            leader.bestLap ? "" : styles.fieldEmpty
                          }`}
                        >
                          {leader.bestLap
                            ? kind === "time"
                              ? formatTime(leader.bestLap)
                              : fmt.format(leader.bestLap)
                            : "not given"}
                        </span>
                      </span>
                    </div>

                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Track</span>
                      <span className={styles.fieldBox}>
                        {/* The board's name, not whichever spelling the
                            current leader happened to type. */}
                        <span className={styles.fieldValue}>
                          {currentEvent?.track ?? leader.track}
                        </span>
                        <span className={styles.fieldSuffix}>
                          quick race, {modeOf(leader.mode)?.name.toLowerCase() ?? leader.mode}
                        </span>
                      </span>
                    </div>
                  </Panel>
                </div>

                {rest.length > 0 ? (
                  <Panel name="the_chasing_pack">
                    <div className={styles.list}>
                      {rest.map((run, index) => {
                        const car = CARS_BY_ID.get(run.carId);

                        return (
                          <div
                            className={`${styles.listRow} ${
                              attract !== null && attract % rest.length === index
                                ? styles.listRowAttract
                                : ""
                            }`}
                            key={run.id}
                          >
                            <span className={styles.listPos}>{index + 2}</span>

                            {run.hasShot ? (
                              <button
                                type="button"
                                className={styles.listThumb}
                                onClick={() => setLightbox(run)}
                                aria-label={`Open the results screen posted by ${run.driver}`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`/api/drift/shot/${run.id}`} alt="" />
                              </button>
                            ) : (
                              <span className={styles.listThumbEmpty} />
                            )}

                            <span>
                              <span className={styles.listName}>{run.driver}</span>
                              <span className={styles.listUnder}>
                                {car?.name ?? run.carId}
                                {car ? ` · ${car.drivetrain}` : ""}
                                {run.id === bestFwdId ? " · leads front drive" : ""}
                                {run.note ? ` · ${run.note}` : ""}
                              </span>
                              {canModerate ? (
                                <span className={styles.rowTools}>
                                  <button
                                    type="button"
                                    className={styles.linkButton}
                                    onClick={() => handleDelete(run)}
                                  >
                                    Delete
                                  </button>
                                </span>
                              ) : null}
                            </span>

                            <span>
                              <span className={styles.listScore}>
                                <RunValue run={run} delay={340 + index * 110} />
                              </span>
                              <span className={styles.listUnder} style={{ display: "block", textAlign: "right" }}>
                                {run.bestLap
                                  ? `best lap ${
                                      kind === "time"
                                        ? formatTime(run.bestLap)
                                        : fmt.format(run.bestLap)
                                    }`
                                  : formatDate(run.createdAt)}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                ) : null}
              </>
              )}
            </>
          ) : null}

          {tab === "rules" ? (
            <Panel name="house_rules.txt">
              <ol className={styles.rules}>
                {[
                  <>
                    <b>Stadium Drift 2 is the house standard.</b> It is the board that settles
                    arguments. Anything else from Quick Race is fair game and keeps its own
                    board
                  </>,
                  <>
                    <b>One track, one mode, one board.</b> A time on a reversed route is a
                    different event from the forward one, so post it as its own track
                  </>,
                  <>
                    <b>One try.</b> Whatever the results screen says is your run. No restarting a
                    bad first lap
                  </>,
                  <>
                    <b>Start-grid cars only.</b> The eight a fresh save gives you. The stage 4
                    unlocks are out
                  </>,
                  <>
                    <b>Tuning is your business.</b> Say nothing and we assume stock. Nobody is
                    checking your bodykit
                  </>,
                  <>
                    <b>Screenshot or it did not happen.</b> The results screen, total readable, one
                    run per post
                  </>,
                  <>
                    <b>Your best run stands.</b> Post as often as you like, the board keeps the
                    highest
                  </>,
                ].map((text, index) => (
                  <li className={styles.rule} key={index}>
                    <span className={styles.ruleText}>{text}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          ) : null}

          {tab === "cars" ? (
            <Panel name="car_list">
              <CarGroup
                label="Allowed, and there from a fresh save"
                cars={DRIFT_CARS.filter((car) => car.legality === "legal")}
              />
              <CarGroup
                label="Allowed, but it will cost you"
                cars={DRIFT_CARS.filter((car) => car.legality === "novelty")}
              />
              <CarGroup
                label="Banned, unlocked in stage 4"
                cars={DRIFT_CARS.filter((car) => car.legality === "banned")}
              />
            </Panel>
          ) : null}

          {tab === "post" ? (
            <form className={styles.split} ref={formRef} onSubmit={handleSubmit} id="post-run">
              <Panel name="upload_proof">
                <span className={styles.fieldLabel}>Results screen</span>
                <button
                  type="button"
                  className={`${styles.drop} ${dragging ? styles.dropActive : ""}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    void pickShot(event.dataTransfer.files?.[0]);
                  }}
                >
                  {shot ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      className={styles.previewPick}
                      src={shot.preview}
                      alt="The screenshot you picked"
                    />
                  ) : (
                    <>
                      <span>Drop your screenshot here</span>
                      <span className={styles.dropSub}>or click to choose a file</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => void pickShot(event.target.files?.[0])}
                />

                {error ? <p className={`${styles.feedback} ${styles.error}`}>{error}</p> : null}
              </Panel>

              <Panel name="new_entry">
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="driver">
                    Driver
                  </label>
                  <input
                    id="driver"
                    name="driver"
                    className={styles.input}
                    maxLength={24}
                    required
                    autoComplete="off"
                    defaultValue={savedName}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="carId">
                    Car
                  </label>
                  <select id="carId" name="carId" className={styles.select} required defaultValue="">
                    <option value="" disabled>
                      Choose
                    </option>
                    {legalCars.map((car) => (
                      <option key={car.id} value={car.id}>
                        {car.name} ({car.drivetrain})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="mode">
                    Mode
                  </label>
                  <select
                    id="mode"
                    name="mode"
                    className={styles.select}
                    value={formMode}
                    onChange={(event) => {
                      const next = event.target.value;
                      setFormMode(next);
                      // A drift course is not a circuit course, so the track
                      // cannot carry over to the new mode.
                      setFormTrack(coursesFor(next)[0]?.name ?? OTHER_TRACK);
                    }}
                  >
                    {MODES.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} — {entry.blurb.toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="track">
                    Track
                  </label>
                  {/* The game's own course list for this mode, grouped by
                      district. A menu rather than a text box, so nobody has to
                      spell "Hollyburn Ridge" correctly at midnight. */}
                  <select
                    id="track"
                    className={styles.select}
                    value={formTrack}
                    onChange={(event) => setFormTrack(event.target.value)}
                  >
                    {coursesByDistrict(formMode).map(([district, courses]) => (
                      <optgroup key={district} label={district}>
                        {courses.map((course) => (
                          <option key={course.name} value={course.name}>
                            {course.name} — {course.miles.toFixed(2)} mi
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {/* Reverse configurations are not named in the source, so
                        there has to be a way out of the list. */}
                    <option value={OTHER_TRACK}>Something else…</option>
                  </select>

                  {formTrack === OTHER_TRACK ? (
                    <input
                      name="track"
                      className={styles.input}
                      maxLength={48}
                      required
                      autoComplete="off"
                      placeholder="Name the track"
                      style={{ marginTop: 8 }}
                    />
                  ) : (
                    <input type="hidden" name="track" value={formTrack} />
                  )}
                </div>

                <div className={styles.field}>
                  <div className={formKind === "time" && !formHasBestLap ? "" : styles.pair}>
                    <span>
                      <label className={styles.fieldLabel} htmlFor="value">
                        {formKind === "time" ? "Time" : "Points"}
                      </label>
                      <input
                        id="value"
                        name="value"
                        className={styles.input}
                        inputMode={formKind === "time" ? "text" : "numeric"}
                        required
                        autoComplete="off"
                        placeholder={formKind === "time" ? "1:23.45" : "53,108"}
                      />
                    </span>
                    {formHasBestLap ? (
                      <span>
                        <label className={styles.fieldLabel} htmlFor="bestLap">
                          Best lap
                        </label>
                        <input
                          id="bestLap"
                          name="bestLap"
                          className={styles.input}
                          inputMode={formKind === "time" ? "text" : "numeric"}
                          autoComplete="off"
                          placeholder={formKind === "time" ? "0:27.90" : "18,357"}
                        />
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="note">
                    Note
                  </label>
                  <input
                    id="note"
                    name="note"
                    className={styles.input}
                    maxLength={120}
                    autoComplete="off"
                  />
                </div>
              </Panel>
            </form>
          ) : null}
        </div>

        {recent.length > 0 ? (
          <div className={styles.ticker} aria-hidden>
            {/* Doubled so the crawl meets itself with no gap. */}
            <div className={styles.tickerTrack}>
              {[...recent, ...recent].map((run, index) => (
                <span className={styles.tickerItem} key={`${run.id}-${index}`}>
                  <b>{run.driver}</b> {formatValue(run.mode, run.score, run.timeMs)} on{" "}
                  {run.track} in the {CARS_BY_ID.get(run.carId)?.name ?? run.carId}
                  {run.note ? ` — ${run.note}` : ""}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <footer className={styles.footer}>
          <div className={styles.driverSlot}>
            {savedName ? (
              <>
                <b>{savedName}</b>
                <span className={styles.driverSlotHint}>Profile on this machine</span>
              </>
            ) : (
              <>
                No profile
                <span className={styles.driverSlotHint}>Post a run and this remembers you</span>
              </>
            )}
          </div>

          <div className={styles.actions}>
            {/* Where the game actually runs. The whole loop starts here. */}
            <a
              className={styles.btn}
              href="https://nfsu2.xyz/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className={styles.btnKey} aria-hidden>
                Y
              </span>
              Launch the game
            </a>

            {tab === "post" ? (
              <>
                <button type="button" className={styles.btn} onClick={() => setTab("board")}>
                  <span className={styles.btnKey} aria-hidden>
                    B
                  </span>
                  Back
                </button>
                <button
                  type="submit"
                  form="post-run"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={busy}
                >
                  <span className={styles.btnKey} aria-hidden>
                    A
                  </span>
                  {busy ? "Posting" : "Post run"}
                </button>
              </>
            ) : (
              <>
                {tab !== "board" ? (
                  <button type="button" className={styles.btn} onClick={() => setTab("board")}>
                    <span className={styles.btnKey} aria-hidden>
                      B
                    </span>
                    Back
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => setTab("post")}
                >
                  <span className={styles.btnKey} aria-hidden>
                    A
                  </span>
                  Post a run
                </button>
              </>
            )}
          </div>

          {posted ? <p className={`${styles.feedback} ${styles.ok}`}>{posted}</p> : null}

          <p className={styles.colophon}>
            Unlisted page, no index and no link from the site. The URL is the whole door. Car
            figures are the game&rsquo;s own stock numbers.
          </p>
        </footer>
      </div>

      {lightbox ? (
        <button
          className={styles.lightbox}
          onClick={() => setLightbox(null)}
          aria-label="Close the screenshot"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.lightboxImg}
            src={`/api/drift/shot/${lightbox.id}`}
            alt={`Results screen posted by ${lightbox.driver}`}
          />
          <span className={styles.lightboxCap}>
            {lightbox.driver} · {formatValue(lightbox.mode, lightbox.score, lightbox.timeMs)} ·{" "}
            {lightbox.track} · click anywhere to close
          </span>
        </button>
      ) : null}
    </div>
  );
}

function CarGroup({ label, cars }: { label: string; cars: DriftCar[] }) {
  return (
    <>
      <p className={styles.carGroup}>{label}</p>
      <div className={styles.carList}>
        {cars.map((car) => (
          <div
            className={`${styles.carRow} ${car.legality === "banned" ? styles.carBanned : ""}`}
            key={car.id}
          >
            <span className={styles.carName}>{car.name}</span>
            <span className={styles.carFigs}>
              {car.drivetrain} · {Math.round(car.bhp)} bhp · {car.topSpeedMph} mph · handling{" "}
              {car.handling.toFixed(1)}
            </span>
            <span className={styles.carWhy}>{car.verdict}</span>
          </div>
        ))}
      </div>
    </>
  );
}
