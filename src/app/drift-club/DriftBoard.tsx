"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CARS_BY_ID, DRIFT_CARS, type DriftCar } from "@/lib/driftCars";
import type { DriftRun } from "@/lib/driftRuns";

import Crown from "./Crown";
import styles from "./drift.module.css";

const MAX_EDGE = 1600;
const TARGET_TYPE = "image/jpeg";
const TARGET_QUALITY = 0.82;
const NAME_KEY = "drift-club:driver";

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

  /* One line per driver: their best run. Everything else stays in the database
     as history but does not clog the board. */
  const standings = useMemo(() => {
    const best = new Map<string, DriftRun>();

    for (const run of runs) {
      const key = run.driver.toLowerCase();
      const held = best.get(key);
      if (!held || run.score > held.score) best.set(key, run);
    }

    return [...best.values()].sort((a, b) => b.score - a.score);
  }, [runs]);

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
      const tookIt = run.score >= (standings[0]?.score ?? 0);

      setRuns((current) => [...current, run].sort((a, b) => b.score - a.score));
      setPosted(
        tookIt
          ? `${run.driver} takes the board with ${fmt.format(run.score)}`
          : `Posted, ${fmt.format(run.score)} points`,
      );

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
    if (!window.confirm(`Delete the ${fmt.format(run.score)} run by ${run.driver}?`)) return;

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
            !leader ? (
              <Panel name="standings.dat">
                <p className={styles.empty}>No runs posted yet. Somebody has to go first.</p>
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
                          alt={`Results screen, ${fmt.format(leader.score)} points`}
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
                      <span className={styles.fieldLabel}>Points</span>
                      <span className={styles.fieldBox}>
                        <span className={`${styles.fieldValue} ${styles.fieldValueBig}`}>
                          <Odometer value={leader.score} delay={220} />
                        </span>
                        <span className={styles.fieldSuffix}>{verdict(leader.score)}</span>
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
                          {leader.bestLap ? fmt.format(leader.bestLap) : "not given"}
                        </span>
                      </span>
                    </div>

                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Track</span>
                      <span className={styles.fieldBox}>
                        <span className={styles.fieldValue}>Stadium Drift 2</span>
                        <span className={styles.fieldSuffix}>quick race, drift</span>
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
                                <Odometer value={run.score} delay={340 + index * 110} />
                              </span>
                              <span className={styles.listUnder} style={{ display: "block", textAlign: "right" }}>
                                {run.bestLap ? `best lap ${fmt.format(run.bestLap)}` : formatDate(run.createdAt)}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                ) : null}
              </>
            )
          ) : null}

          {tab === "rules" ? (
            <Panel name="house_rules.txt">
              <ol className={styles.rules}>
                {[
                  <>
                    <b>Stadium Drift 2 only</b>, from Quick Race. No other track counts, including
                    the other stadium layout
                  </>,
                  <>
                    <b>Three laps, one try.</b> Whatever the results screen says is your run. No
                    restarting a bad first lap
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
                  <div className={styles.pair}>
                    <span>
                      <label className={styles.fieldLabel} htmlFor="score">
                        Points
                      </label>
                      <input
                        id="score"
                        name="score"
                        className={styles.input}
                        inputMode="numeric"
                        required
                        autoComplete="off"
                        placeholder="53,108"
                      />
                    </span>
                    <span>
                      <label className={styles.fieldLabel} htmlFor="bestLap">
                        Best lap
                      </label>
                      <input
                        id="bestLap"
                        name="bestLap"
                        className={styles.input}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="18,357"
                      />
                    </span>
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
                  <b>{run.driver}</b> {fmt.format(run.score)} in the{" "}
                  {CARS_BY_ID.get(run.carId)?.name ?? run.carId}
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
            {lightbox.driver} · {fmt.format(lightbox.score)} points · click anywhere to close
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
