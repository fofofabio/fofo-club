"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import SectionFade from "@/components/Sectionfade";
import Footer from "@/components/Footer";
import Link from "next/link";

type Tile = {
  id: number;
  value: number;
  row: number; // 0..3
  col: number; // 0..3
  justSpawned?: boolean;
  justMerged?: boolean;
};

type Dir = "up" | "down" | "left" | "right";

const size = 4;

function rngChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function emptyPositions(tiles: Tile[]): Array<{ row: number; col: number }> {
  const occupied = new Set(tiles.map((t) => `${t.row}-${t.col}`));
  const spots: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!occupied.has(`${r}-${c}`)) spots.push({ row: r, col: c });
    }
  }
  return spots;
}

function spawnRandom(tiles: Tile[], nextId: () => number): Tile[] {
  const spots = emptyPositions(tiles);
  if (spots.length === 0) return tiles;
  const pos = rngChoice(spots);
  const value = Math.random() < 0.9 ? 2 : 4;
  return [...tiles, { id: nextId(), value, row: pos.row, col: pos.col, justSpawned: true }];
}

function byDirection(dir: Dir): { rows: number[]; cols: number[]; vec: { dr: number; dc: number } } {
  const range = [0, 1, 2, 3];
  const rev = [3, 2, 1, 0];
  switch (dir) {
    case "left":
      return { rows: range, cols: range, vec: { dr: 0, dc: -1 } };
    case "right":
      return { rows: range, cols: rev, vec: { dr: 0, dc: 1 } };
    case "up":
      return { rows: range, cols: range, vec: { dr: -1, dc: 0 } };
    case "down":
      return { rows: rev, cols: range, vec: { dr: 1, dc: 0 } };
  }
}

function moveTiles(tiles: Tile[], dir: Dir, nextId: () => number): { moved: boolean; tiles: Tile[]; scoreDelta: number } {
  let moved = false;
  let scoreDelta = 0;
  // grid copy with flags reset
  const grid: (Tile | null)[][] = Array.from({ length: size }, () => Array<Tile | null>(size).fill(null));
  tiles.forEach((t) => {
    grid[t.row][t.col] = { ...t, justMerged: false, justSpawned: false };
  });
  const { rows, cols, vec } = byDirection(dir);

  for (const r of rows) {
    for (const c of cols) {
      let tile = grid[r][c];
      if (!tile) continue;
      let nr = r;
      let nc = c;
      while (true) {
        const tr = nr + vec.dr;
        const tc = nc + vec.dc;
        if (tr < 0 || tr >= size || tc < 0 || tc >= size) break;
        const next = grid[tr][tc];
        if (!next) {
          const cur = tile as Tile;
          grid[tr][tc] = { ...cur, row: tr, col: tc };
          grid[nr][nc] = null;
          nr = tr; nc = tc;
          moved = true;
          tile = grid[nr][nc];
        } else if (next.value === (tile as Tile).value && !next.justMerged && !(tile as Tile).justMerged) {
          const cur = tile as Tile;
          const mergedValue = cur.value * 2;
          grid[tr][tc] = { ...next, id: nextId(), value: mergedValue, row: tr, col: tc, justMerged: true };
          grid[nr][nc] = null;
          scoreDelta += mergedValue;
          moved = true;
          break;
        } else {
          break;
        }
      }
    }
  }

  const out: Tile[] = [];
  for (let rr = 0; rr < size; rr++) {
    for (let cc = 0; cc < size; cc++) {
      const t = grid[rr][cc];
      if (t) out.push(t);
    }
  }
  return { moved, tiles: out, scoreDelta };
}

function canMove(tiles: Tile[]): boolean {
  if (emptyPositions(tiles).length > 0) return true;
  const grid: (Tile | null)[][] = Array.from({ length: size }, () => Array<Tile | null>(size).fill(null));
  tiles.forEach((t) => (grid[t.row][t.col] = t));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const t = grid[r][c];
      if (!t) continue;
      if (r + 1 < size && grid[r + 1][c]?.value === t.value) return true;
      if (c + 1 < size && grid[r][c + 1]?.value === t.value) return true;
    }
  }
  return false;
}

function tileClasses(value: number) {
  const map: Record<number, string> = {
    2: "bg-amber-50 text-black",
    4: "bg-amber-100 text-black",
    8: "bg-amber-300 text-white",
    16: "bg-orange-400 text-white",
    32: "bg-orange-500 text-white",
    64: "bg-orange-600 text-white",
    128: "bg-amber-400 text-white",
    256: "bg-amber-500 text-white",
    512: "bg-amber-600 text-white",
    1024: "bg-yellow-500 text-white",
    2048: "bg-yellow-600 text-white",
  };
  return map[value] || "bg-yellow-700 text-white";
}

export default function Game2048Page() {
  const nextIdRef = useRef(1);
  const nextId = useCallback(() => nextIdRef.current++, []);

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  // Initialize with 0 on both server and first client render to avoid hydration mismatch
  const [best, setBest] = useState<number>(0);
  const [gameOver, setGameOver] = useState(false);

  // init
  useEffect(() => {
    setTiles((prev) => {
      if (prev.length > 0) return prev;
      let t: Tile[] = [];
      t = spawnRandom(t, nextId);
      t = spawnRandom(t, nextId);
      return t;
    });
  }, [nextId]);

  useEffect(() => {
    // load best on mount (client-side only)
    try {
      const s = window.localStorage.getItem("game2048-best");
      if (s) setBest(parseInt(s, 10) || 0);
    } catch {}
  }, []);

  useEffect(() => {
    // persist best
    try { window.localStorage.setItem("game2048-best", String(best)); } catch {}
  }, [best]);

  const doMove = useCallback((dir: Dir) => {
    if (gameOver) return;
    setTiles((currentTiles) => {
      const { moved, tiles: movedTiles, scoreDelta } = moveTiles(currentTiles, dir, nextId);
      if (!moved) return currentTiles;
      const withSpawn = spawnRandom(movedTiles, nextId);
      setScore((s) => {
        const ns = s + scoreDelta;
        if (ns > best) setBest(ns);
        return ns;
      });
      setGameOver(!canMove(withSpawn));
      return withSpawn;
    });
  }, [best, gameOver, nextId]);

  // keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key;
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","a","d","w","s"].includes(key)) {
        e.preventDefault();
        const map: Record<string, Dir> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down" };
        doMove(map[key]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doMove]);

  // touch
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    // If the finger is moving enough to be a swipe, prevent the page from scrolling
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - touchStart.current.x);
    const dy = Math.abs(t.clientY - touchStart.current.y);
    if (dx > 6 || dy > 6) {
      if (e.cancelable) e.preventDefault();
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const threshold = 24;
    if (ax < threshold && ay < threshold) return;
    if (ax > ay) doMove(dx > 0 ? "right" : "left");
    else doMove(dy > 0 ? "down" : "up");
    touchStart.current = null;
  };

  const reset = () => {
    setScore(0);
    setGameOver(false);
    nextIdRef.current = 1;
    let t: Tile[] = [];
    t = spawnRandom(t, () => nextIdRef.current++);
    t = spawnRandom(t, () => nextIdRef.current++);
    setTiles(t);
  };

  return (
    <PageTransition>
      <div className="flex min-h-dvh flex-col">
        <main className="relative isolate mx-auto w-full max-w-2xl px-4 sm:px-6 py-10 sm:py-14 flex-1">
          <SectionFade once threshold={0.12}>
            <header className="mb-6 sm:mb-8 flex items-center justify-between gap-3">
              <div>
                <p className="meta text-fofo-blue">TOOLS • 2048</p>
                <h1 className="mt-2 font-semibold leading-tight tracking-tight text-3xl sm:text-4xl">2048</h1>
                <p className="mt-3 text-black/60">Swipe or use arrow keys. Merge to 2048.</p>
              </div>
              <Link
                href="/tools"
                aria-label="Back to tools"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-fofo-blue text-white shadow-sm transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fofo-blue/60"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
            </header>

            <div className="mx-auto w-full max-w-xs sm:max-w-sm select-none">
              {/* Score */}
              <div className="mb-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-black/5 px-2 py-1 text-black/70">Score: {score}</span>
                  <span className="rounded-md bg-black/5 px-2 py-1 text-black/70">Best: {best}</span>
                </div>
                <button onClick={reset} className="rounded-full border border-black/10 bg-white px-3 py-1 shadow-sm text-black/70 hover:-translate-y-0.5 hover:shadow transition">New game</button>
              </div>

              {/* Board */}
              <div
                className="relative rounded-2xl bg-black/5 p-2 sm:p-3"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
              >
                {/* Background grid */}
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-xl border border-black/10 bg-white/50" />
                  ))}
                </div>

                {/* Tiles overlay aligned via same inner padding */}
                <div className="pointer-events-none absolute inset-0 p-2 sm:p-3">
                  <div className="grid h-full grid-cols-4 grid-rows-4 gap-2 sm:gap-3">
                    {tiles.map((t) => {
                      const merged = !!t.justMerged;
                      return (
                        <motion.div
                          key={t.id}
                          layout
                          initial={{ scale: t.justSpawned ? 0.6 : 1 }}
                          animate={{ scale: merged ? [1, 1.12, 1] : 1 }}
                          transition={{
                            layout: { type: "spring", stiffness: 400, damping: 30 },
                            scale: merged ? { type: "tween", duration: 0.22, ease: "easeOut", times: [0, 0.5, 1] } : { type: "tween", duration: 0 }
                          }}
                          style={{ gridColumnStart: t.col + 1, gridRowStart: t.row + 1 }}
                          className={`w-full h-full rounded-xl shadow-sm font-semibold text-lg sm:text-2xl grid place-items-center ${tileClasses(t.value)}`}
                        >
                          {t.value}
                        </motion.div>
                      );})}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center text-sm text-black/60">Touch: swipe anywhere • Keyboard: arrows</div>
              {gameOver && (<div className="mt-3 text-center text-black/70">No more moves. Start a new game.</div>)}
            </div>
          </SectionFade>
        </main>

      </div>
    </PageTransition>
  );
}
