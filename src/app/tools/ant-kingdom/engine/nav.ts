// Grid helpers + BFS pathfinding over passable cells.
// The grid is small (COLS*ROWS ≈ 1.3k cells) so a fresh BFS per re-path is cheap.

import { COLS, GROUND_ROW, ROWS, SURFACE_ROW } from "./constants";
import type { Vec, World } from "./types";

export const cellIndex = (col: number, row: number): number => row * COLS + col;
export const cellCol = (i: number): number => i % COLS;
export const cellRow = (i: number): number => Math.floor(i / COLS);

export const cellCenter = (i: number): Vec => ({
  x: (i % COLS) + 0.5,
  y: Math.floor(i / COLS) + 0.5,
});

/** Can an ant stand in / walk through this cell? */
export function passable(world: World, col: number, row: number): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  if (row === SURFACE_ROW) return true; // the open surface lane
  if (row < GROUND_ROW) return false; // sky — ants can't fly
  const t = world.grid[row * COLS + col];
  return t === "tunnel" || t === "chamber";
}

export function passableCell(world: World, i: number): boolean {
  return passable(world, i % COLS, Math.floor(i / COLS));
}

const NEIGHBOR_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

/**
 * Breadth-first path from `start` cell to `goal` cell over passable cells.
 * Returns the list of cell indices to walk (excluding start, including goal),
 * or null if unreachable. Returns [] when already at the goal.
 */
export function bfs(world: World, start: number, goal: number): number[] | null {
  if (start === goal) return [];
  const n = COLS * ROWS;
  const prev = new Int32Array(n).fill(-1);
  const seen = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;

  queue[tail++] = start;
  seen[start] = 1;

  while (head < tail) {
    const cur = queue[head++];
    const col = cur % COLS;
    const row = (cur - col) / COLS;
    for (const [dc, dr] of NEIGHBOR_OFFSETS) {
      const nc = col + dc;
      const nr = row + dr;
      if (!passable(world, nc, nr)) continue;
      const ni = nr * COLS + nc;
      if (seen[ni]) continue;
      seen[ni] = 1;
      prev[ni] = cur;
      if (ni === goal) {
        // reconstruct
        const path: number[] = [];
        let p = goal;
        while (p !== start) {
          path.push(p);
          p = prev[p];
        }
        path.reverse();
        return path;
      }
      queue[tail++] = ni;
    }
  }
  return null;
}

/** Nearest passable cell 4-adjacent to a (typically soil) cell, or -1. */
export function adjacentPassable(world: World, cell: number): number {
  const col = cell % COLS;
  const row = Math.floor(cell / COLS);
  for (const [dc, dr] of NEIGHBOR_OFFSETS) {
    const nc = col + dc;
    const nr = row + dr;
    if (passable(world, nc, nr)) return nr * COLS + nc;
  }
  return -1;
}

/** Is cell `a` 4-adjacent to cell `b`? */
export function isAdjacent(a: number, b: number): boolean {
  const ac = a % COLS;
  const ar = Math.floor(a / COLS);
  const bc = b % COLS;
  const br = Math.floor(b / COLS);
  return Math.abs(ac - bc) + Math.abs(ar - br) === 1;
}

export function antCell(pos: Vec): number {
  const col = Math.min(COLS - 1, Math.max(0, Math.floor(pos.x)));
  const row = Math.min(ROWS - 1, Math.max(0, Math.floor(pos.y)));
  return row * COLS + col;
}
