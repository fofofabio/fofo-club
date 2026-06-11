// Autopilot — a lightweight controller that plays the colony for you.
//
// It issues the exact same actions a human can: it rebalances the role mix,
// queues expansion digs (biased deeper, for capacity + buried caches), and
// designates rooms when the colony needs them. It runs on its own decision
// cadence rather than every frame, and lives entirely outside the core sim, so
// it's purely a "driver" — the simulation doesn't know or care it's there.

import {
  COLS,
  DIG_FOOD_COST,
  EGG_FOOD_COST,
  GROUND_ROW,
  ROOM_COST,
} from "./constants";
import { adjacentPassable } from "./nav";
import { antCapacity, designateRoom, foodCapacity, tryQueueDig } from "./helpers";
import type { RoomType, World } from "./types";

export interface AutopilotState {
  timer: number;
}

export function createAutopilotState(): AutopilotState {
  return { timer: 0 };
}

const DECISION_INTERVAL = 1.1; // sim-seconds between decisions
const NURSERY_CAP = 3;
const GRANARY_CAP = 5;
const BARRACKS_CAP = 2;

/** Advance the autopilot by `dt` sim-seconds (call only while it's enabled). */
export function stepAutopilot(world: World, st: AutopilotState, dt: number): void {
  if (world.gameOver) return;
  st.timer -= dt;
  if (st.timer > 0) return;
  st.timer = DECISION_INTERVAL;

  const colony = world.colonies[0];
  const pendingJobs = world.digJobs.reduce((n, j) => (j.done ? n : n + 1), 0);

  // --- 1. Role mix: react to the current situation ---
  const starving = colony.food < EGG_FOOD_COST * 2;
  let forager = 3;
  let builder = 1;
  let soldier = 0;
  if (pendingJobs > 5) builder = 2;
  if (pendingJobs > 12) builder = 3;
  if (world.spider) soldier = 2;
  if (starving) {
    forager = 4;
    builder = 1;
  }
  colony.roleWeights.forager = forager;
  colony.roleWeights.builder = builder;
  colony.roleWeights.soldier = soldier;

  // --- 2. Expansion: keep capacity ahead of population ---
  const cap = antCapacity(world);
  const wantExpand = world.population >= cap - 3 || pendingJobs < 3;
  const reserve = EGG_FOOD_COST * 3; // always leave enough to keep hatching
  if (wantExpand && colony.food > reserve + DIG_FOOD_COST) {
    for (const cell of findDigTargets(world, 3)) {
      if (colony.food <= reserve + DIG_FOOD_COST) break;
      tryQueueDig(world, colony, cell);
    }
  }

  // --- 3. Rooms: build what the colony is short on ---
  maybeBuildRoom(world);
}

/** Soil cells on the dug frontier, preferring depth (capacity + caches). */
function findDigTargets(world: World, n: number): number[] {
  const candidates: { cell: number; score: number }[] = [];
  for (let i = 0; i < world.grid.length; i++) {
    if (world.grid[i] !== "soil") continue;
    if (adjacentPassable(world, i) === -1) continue;
    if (world.digJobs.some((j) => j.cell === i && !j.done)) continue;
    const depth = Math.floor(i / COLS) - GROUND_ROW;
    candidates.push({ cell: i, score: depth + world.rng() * 4 });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, n).map((c) => c.cell);
}

function maybeBuildRoom(world: World): void {
  const colony = world.colonies[0];
  if (colony.food < ROOM_COST) return;
  const r = world.roomCounts;

  let type: RoomType | null = null;
  if (colony.food >= foodCapacity(world) * 0.9 && r.granary < GRANARY_CAP) {
    type = "granary"; // storage keeps maxing out — bank more
  } else if (world.spider && r.barracks < BARRACKS_CAP) {
    type = "barracks"; // under threat — toughen the soldiers
  } else if (world.population > 8 && r.nursery < NURSERY_CAP) {
    type = "nursery"; // healthy colony — grow faster
  }
  if (!type) return;

  const cell = findRoomCell(world);
  if (cell !== -1) designateRoom(world, colony, cell, type);
}

/** Nearest plain dug corridor (a tunnel with no room) to the queen. */
function findRoomCell(world: World): number {
  const colony = world.colonies[0];
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < world.grid.length; i++) {
    if (world.grid[i] !== "tunnel") continue; // leave chambers & existing rooms
    if (world.rooms[i]) continue;
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const d = Math.abs(col - colony.queenCol) + Math.abs(row - colony.queenRow);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}
