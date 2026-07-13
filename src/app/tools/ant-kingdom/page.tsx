"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import SectionFade from "@/components/Sectionfade";
import {
  COLS,
  DIG_FOOD_COST,
  GRID_SIZES,
  ROOM_COST,
  ROWS,
  SIM_DT,
  antCapacity,
  canDesignateRoom,
  canQueueDig,
  cellIndex,
  createAutopilotState,
  createWorld,
  designateRoom,
  foodCapacity,
  isDay,
  step,
  stepAutopilot,
  tryQueueDig,
  type AutopilotState,
  type GridSizeKey,
  type Role,
  type RoomType,
  type World,
} from "./engine";
import { drawWorld, ROLE_COLOR } from "./render";

type Speed = 1 | 2 | 4;
type Tool = "dig" | RoomType;

const SIZE_KEYS: GridSizeKey[] = ["small", "medium", "large"];

interface Hud {
  food: number;
  foodCap: number;
  population: number;
  antCap: number;
  peak: number;
  day: boolean;
  weather: "clear" | "rain";
  spider: boolean;
  atCapacity: boolean;
  gameOver: boolean;
  weights: Record<Role, number>;
  rooms: Record<RoomType, number>;
  log: string[];
}

const ROLES: Role[] = ["forager", "builder", "soldier"];
const BEST_KEY = "ant-kingdom-best";

const TOOLS: { id: Tool; label: string; color: string; hint: string }[] = [
  { id: "dig", label: "Dig", color: "#caa15a", hint: `${DIG_FOOD_COST} food · grows the nest` },
  { id: "nursery", label: "Nursery", color: "#9a7bc8", hint: `${ROOM_COST} food · faster eggs` },
  { id: "granary", label: "Granary", color: "#e9a93a", hint: `${ROOM_COST} food · +food storage` },
  { id: "barracks", label: "Barracks", color: "#d6452f", hint: `${ROOM_COST} food · tougher soldiers` },
];

function readHud(world: World): Hud {
  const c = world.colonies[0];
  return {
    food: Math.floor(c.food),
    foodCap: foodCapacity(world),
    population: world.population,
    antCap: antCapacity(world),
    peak: world.peakPopulation,
    day: isDay(world),
    weather: world.weather,
    spider: !!world.spider,
    atCapacity: world.atCapacity,
    gameOver: world.gameOver,
    weights: { ...c.roleWeights },
    rooms: { ...world.roomCounts },
    log: world.log.slice(0, 4),
  };
}

export default function AntKingdomPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<World | null>(null);
  const cellSizeRef = useRef<number>(12);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const accRef = useRef<number>(0);
  const hudTimerRef = useRef<number>(0);
  const hoverRef = useRef<{ col: number; row: number; valid: boolean } | null>(null);

  const pausedRef = useRef(false);
  const speedRef = useRef<Speed>(1);
  const toolRef = useRef<Tool>("dig");
  const sizeRef = useRef<GridSizeKey>("medium");
  const autopilotRef = useRef(false);
  const apStateRef = useRef<AutopilotState>(createAutopilotState());

  const [hud, setHud] = useState<Hud | null>(null);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [tool, setTool] = useState<Tool>("dig");
  const [size, setSize] = useState<GridSizeKey>("medium");
  const [autopilot, setAutopilot] = useState(false);
  const [best, setBest] = useState(0);

  // Keep refs in sync with control state for the animation loop.
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    autopilotRef.current = autopilot;
  }, [autopilot]);

  // Load best score.
  useEffect(() => {
    try {
      const s = window.localStorage.getItem(BEST_KEY);
      if (s) setBest(parseInt(s, 10) || 0);
    } catch {}
  }, []);

  const persistBest = useCallback((peak: number) => {
    setBest((prev) => {
      if (peak <= prev) return prev;
      try {
        window.localStorage.setItem(BEST_KEY, String(peak));
      } catch {}
      return peak;
    });
  }, []);

  // Size the canvas to its container (responsive), keeping the world aspect.
  const resize = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const cssW = Math.min(container.clientWidth, 760);
    const cs = cssW / COLS;
    const cssH = cs * ROWS;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    }
    cellSizeRef.current = cs;
  }, []);

  // Main loop: fixed-timestep simulation + render.
  useEffect(() => {
    worldRef.current = createWorld(Date.now(), sizeRef.current);
    setHud(readHud(worldRef.current));
    resize();

    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);

    const loop = (tMs: number) => {
      const world = worldRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!world || !ctx) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const now = tMs / 1000;
      const frameDt = Math.min(0.1, now - (lastRef.current || now));
      lastRef.current = now;

      if (!pausedRef.current && !world.gameOver) {
        accRef.current += frameDt * speedRef.current;
        let n = 0;
        while (accRef.current >= SIM_DT && n < 400) {
          step(world, SIM_DT);
          accRef.current -= SIM_DT;
          n++;
        }
        if (autopilotRef.current && n > 0) {
          stepAutopilot(world, apStateRef.current, n * SIM_DT);
        }
      } else {
        accRef.current = 0;
      }

      drawWorld(ctx, world, cellSizeRef.current, { hover: hoverRef.current });

      // Throttle React HUD updates (~7/sec).
      hudTimerRef.current += frameDt;
      if (hudTimerRef.current >= 0.14) {
        hudTimerRef.current = 0;
        setHud(readHud(world));
        persistBest(world.peakPopulation);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [resize, persistBest]);

  const eventToCell = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cs = cellSizeRef.current;
    const col = Math.floor((e.clientX - rect.left) / cs);
    const row = Math.floor((e.clientY - rect.top) / cs);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return { col, row };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const world = worldRef.current;
      const pos = eventToCell(e);
      if (!world || !pos) {
        hoverRef.current = null;
        return;
      }
      const cell = cellIndex(pos.col, pos.row);
      const colony = world.colonies[0];
      const t = toolRef.current;
      hoverRef.current = {
        col: pos.col,
        row: pos.row,
        valid:
          t === "dig"
            ? canQueueDig(world, colony, cell)
            : canDesignateRoom(world, colony, cell, t),
      };
    },
    [eventToCell],
  );

  const onPointerLeave = useCallback(() => {
    hoverRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const world = worldRef.current;
      const pos = eventToCell(e);
      if (!world || !pos) return;
      const cell = cellIndex(pos.col, pos.row);
      const colony = world.colonies[0];
      const t = toolRef.current;
      if (t === "dig") tryQueueDig(world, colony, cell);
      else designateRoom(world, colony, cell, t);
      setHud(readHud(world));
    },
    [eventToCell],
  );

  const adjustWeight = useCallback((role: Role, delta: number) => {
    const world = worldRef.current;
    if (!world) return;
    const c = world.colonies[0];
    c.roleWeights[role] = Math.max(0, Math.min(8, c.roleWeights[role] + delta));
    setHud(readHud(world));
  }, []);

  const reset = useCallback((sizeKey?: GridSizeKey) => {
    const key = sizeKey ?? sizeRef.current;
    const world = createWorld(Date.now(), key);
    worldRef.current = world;
    accRef.current = 0;
    lastRef.current = 0;
    apStateRef.current = createAutopilotState();
    setHud(readHud(world));
    setPaused(false);
    resize();
  }, [resize]);

  const chooseSize = useCallback(
    (key: GridSizeKey) => {
      sizeRef.current = key;
      setSize(key);
      reset(key);
    },
    [reset],
  );

  return (
    <PageTransition>
      <div className="flex min-h-dvh flex-col">
        <main className="relative isolate mx-auto w-full max-w-4xl px-4 sm:px-6 py-10 sm:py-14 flex-1">
          <SectionFade once threshold={0.12}>
            <header className="mb-6 flex items-start justify-between gap-3">
              <div>
                <span className="nb-eyebrow">Tools • Ant Kingdom</span>
                <h1 className="mt-3 font-display font-bold leading-none tracking-tight text-4xl sm:text-5xl">
                  Ant Kingdom
                </h1>
                <p className="mt-3 max-w-xl text-black/60">
                  A tiny pixel colony. Digging is everything: each tunnel raises your ant cap and
                  food storage, deeper digs strike buried caches, and dug cells can become
                  nurseries, granaries, or barracks.
                </p>
              </div>
              <Link
                href="/tools"
                aria-label="Back to tools"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center border-[2.5px] border-black bg-fofo-blue text-white transition-all hover:-translate-y-0.5 hover:shadow-brutal-sm focus:outline-none"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </Link>
            </header>

            {/* Stat bar */}
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <CapStat
                label="Ants"
                value={hud?.population ?? 0}
                cap={hud?.antCap ?? 0}
                tint="text-fofo-blue"
                warn={hud?.atCapacity}
              />
              <CapStat
                label="Food"
                value={hud?.food ?? 0}
                cap={hud?.foodCap ?? 0}
                tint="text-amber-600"
              />
              <Stat label="Peak" value={hud?.peak ?? 0} />
              <Stat label="Best" value={best} />
              <span className="border-[2px] border-black bg-white px-2 py-1 text-black/80">
                {hud?.day ? "☀ Day" : "☾ Night"}
                {hud?.weather === "rain" ? " · 🌧 Rain" : ""}
                {hud?.spider ? " · 🕷 Spider!" : ""}
              </span>
              {hud?.atCapacity && (
                <span className="border-[2px] border-black bg-fofo-yellow px-2 py-1 font-medium text-black">
                  Nest full, dig more space
                </span>
              )}
            </div>

            {/* Tool selector */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {TOOLS.map((t) => {
                const active = tool === t.id;
                const count =
                  t.id === "dig" ? null : (hud?.rooms[t.id as RoomType] ?? 0);
                return (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id)}
                    title={t.hint}
                    className={`flex items-center gap-2 border-[2px] border-black px-3 py-1.5 text-sm transition-all ${
                      active
                        ? "text-white shadow-brutal-sm"
                        : "bg-white text-black/80 hover:-translate-y-0.5 hover:shadow-brutal-sm"
                    }`}
                    style={active ? { background: t.color } : undefined}
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-sm"
                      style={{ background: t.color }}
                    />
                    {t.label}
                    {count !== null && count > 0 && (
                      <span
                        className={`tabular-nums ${active ? "text-white/80" : "text-black/40"}`}
                      >
                        ×{count}
                      </span>
                    )}
                  </button>
                );
              })}
              <span className="ml-auto text-xs text-black/50">
                {TOOLS.find((t) => t.id === tool)?.hint}
              </span>
            </div>

            {/* Canvas */}
            <div
              ref={containerRef}
              className="relative w-full overflow-hidden border-[2.5px] border-black bg-[#1a1208] shadow-brutal"
            >
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerLeave={onPointerLeave}
                className="block w-full cursor-crosshair touch-none select-none"
              />
              {hud?.gameOver && (
                <div className="absolute inset-0 grid place-items-center bg-black/55 text-center text-white">
                  <div>
                    <p className="meta text-white/70">COLONY FALLEN</p>
                    <p className="mt-1 text-3xl font-semibold">Peak: {hud.peak} ants</p>
                    <button
                      onClick={() => reset()}
                      className="mt-4 border-[2.5px] border-white bg-white px-5 py-2 font-pixel text-[11px] uppercase tracking-widest text-black transition-all hover:-translate-y-0.5 hover:bg-fofo-blue hover:text-white"
                    >
                      New colony
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {/* Workforce */}
              <div className="border-[2.5px] border-black bg-white p-4 shadow-brutal-sm">
                <p className="meta text-fofo-blue">WORKFORCE MIX</p>
                <p className="mt-1 text-xs text-black/50">
                  New eggs hatch toward these weights.
                </p>
                <div className="mt-3 space-y-2">
                  {ROLES.map((role) => (
                    <div key={role} className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-sm"
                        style={{ background: ROLE_COLOR[role] }}
                      />
                      <span className="w-16 text-sm capitalize text-black/70">{role}</span>
                      <button
                        onClick={() => adjustWeight(role, -1)}
                        className="h-7 w-7 border-[2px] border-black bg-white text-black/80 transition-all hover:bg-fofo-blue hover:text-white"
                        aria-label={`Fewer ${role}s`}
                      >
                        −
                      </button>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-black/10">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${((hud?.weights[role] ?? 0) / 8) * 100}%`,
                              background: ROLE_COLOR[role],
                            }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => adjustWeight(role, 1)}
                        className="h-7 w-7 border-[2px] border-black bg-white text-black/80 transition-all hover:bg-fofo-blue hover:text-white"
                        aria-label={`More ${role}s`}
                      >
                        +
                      </button>
                      <span className="w-4 text-right text-sm tabular-nums text-black/60">
                        {hud?.weights[role] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Play controls + log */}
              <div className="border-[2.5px] border-black bg-white p-4 shadow-brutal-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setAutopilot((a) => !a)}
                    className={`border-[2px] border-black px-3 py-1.5 text-sm transition-all ${
                      autopilot
                        ? "bg-fofo-blue text-white shadow-brutal-sm"
                        : "bg-white text-black/80 hover:-translate-y-0.5 hover:shadow-brutal-sm"
                    }`}
                  >
                    {autopilot ? "🤖 Autopilot on" : "🤖 Autopilot"}
                  </button>
                  <button
                    onClick={() => setPaused((p) => !p)}
                    className="border-[2px] border-black bg-white px-3 py-1.5 text-sm text-black/80 transition-all hover:-translate-y-0.5 hover:shadow-brutal-sm"
                  >
                    {paused ? "▶ Resume" : "⏸ Pause"}
                  </button>
                  <div className="flex overflow-hidden border-[2px] border-black">
                    {([1, 2, 4] as Speed[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        className={`px-3 py-1.5 text-sm transition ${
                          speed === s
                            ? "bg-fofo-blue text-white"
                            : "bg-white text-black/70 hover:bg-black/5"
                        }`}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => reset()}
                    className="border-[2px] border-black bg-white px-3 py-1.5 text-sm text-black/80 transition-all hover:-translate-y-0.5 hover:shadow-brutal-sm"
                  >
                    New colony
                  </button>
                </div>
                {/* Map size */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-black/50">Map</span>
                  <div className="flex overflow-hidden border-[2px] border-black">
                    {SIZE_KEYS.map((key) => (
                      <button
                        key={key}
                        onClick={() => chooseSize(key)}
                        className={`px-3 py-1.5 text-sm transition ${
                          size === key
                            ? "bg-fofo-blue text-white"
                            : "bg-white text-black/70 hover:bg-black/5"
                        }`}
                      >
                        {GRID_SIZES[key].label}
                      </button>
                    ))}
                  </div>
                  <span className="ml-auto text-xs text-black/50">
                    Dig cost: {DIG_FOOD_COST} food
                  </span>
                </div>
                <div className="mt-3 border-[2px] border-black bg-fofo-paper p-3 text-xs leading-relaxed text-black/70">
                  {(hud?.log ?? []).length === 0 ? (
                    <span className="text-black/40">The colony is quiet…</span>
                  ) : (
                    hud?.log.map((line, i) => (
                      <div key={i} className={i === 0 ? "text-black/80" : ""}>
                        {line}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-black/50">
              {tool === "dig"
                ? "Click soil next to a tunnel to dig · green = affordable, red = blocked · dig deep for buried caches"
                : `Click a dug tunnel to turn it into a ${tool} · green = ok, red = needs food or a dug cell`}
            </p>
          </SectionFade>
        </main>
      </div>
    </PageTransition>
  );
}

function Stat({ label, value, tint }: { label: string; value: number; tint?: string }) {
  return (
    <span className="border-[2px] border-black bg-white px-2 py-1 text-black/80">
      {label}: <span className={`font-bold tabular-nums ${tint ?? ""}`}>{value}</span>
    </span>
  );
}

function CapStat({
  label,
  value,
  cap,
  tint,
  warn,
}: {
  label: string;
  value: number;
  cap: number;
  tint?: string;
  warn?: boolean;
}) {
  return (
    <span className={`border-[2px] border-black px-2 py-1 text-black/80 ${warn ? "bg-fofo-yellow" : "bg-white"}`}>
      {label}:{" "}
      <span className={`font-bold tabular-nums ${tint ?? ""}`}>{value}</span>
      <span className="text-black/40"> / {cap}</span>
    </span>
  );
}
