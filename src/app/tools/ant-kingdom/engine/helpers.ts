// Mutation helpers shared by the core loop, the behaviours, and the UI.
// Deliberately free of any dependency on behaviors.ts / world.ts to avoid
// import cycles.

import {
  ANT_MAX_HP,
  ANTS_PER_CELL,
  BARRACKS_SOLDIER_CAP,
  BARRACKS_SOLDIER_FACTOR,
  BASE_ANT_CAP,
  BASE_FOOD_CAP,
  CACHE_BASE_CHANCE,
  CACHE_DEPTH_BONUS,
  CACHE_MAX,
  CACHE_MIN,
  COLS,
  DAY_FRACTION,
  DAY_LENGTH,
  DIG_FOOD_COST,
  EGG_INTERVAL,
  FOOD_PER_CELL,
  FOOD_SOURCE_AMOUNT,
  GRANARY_FOOD_CAP,
  GROUND_ROW,
  HAZARD_CHANCE,
  MAX_ANTS,
  NURSERY_EGG_FACTOR,
  NURSERY_EGG_FLOOR,
  ROOM_CODES,
  ROOM_COST,
  ROWS,
  SURFACE_ROW,
} from "./constants";
import { adjacentPassable, antCell, cellCenter, passable } from "./nav";
import type { Ant, Colony, DigJob, FoodSource, Role, RoomType, World } from "./types";

// --- Capacity, storage & room-derived stats ---------------------------------

/** Maximum ants the dug nest can support (hard-capped by MAX_ANTS). */
export function antCapacity(world: World): number {
  return Math.min(MAX_ANTS, Math.floor(BASE_ANT_CAP + world.dugCells * ANTS_PER_CELL));
}

/** Maximum food the colony can store (granaries add a big bonus). */
export function foodCapacity(world: World): number {
  return Math.floor(
    BASE_FOOD_CAP + world.dugCells * FOOD_PER_CELL + world.roomCounts.granary * GRANARY_FOOD_CAP,
  );
}

/** Egg interval after nursery speed-ups. */
export function effectiveEggInterval(world: World): number {
  const factor = Math.max(NURSERY_EGG_FLOOR, 1 - world.roomCounts.nursery * NURSERY_EGG_FACTOR);
  return EGG_INTERVAL * factor;
}

/** Bonus multiplier (0..cap) to soldier damage from barracks. */
export function soldierBonus(world: World): number {
  return Math.min(BARRACKS_SOLDIER_CAP, world.roomCounts.barracks * BARRACKS_SOLDIER_FACTOR);
}

/** Add food to the colony, clamped to storage. Returns the amount that fit. */
export function addFood(world: World, colony: Colony, amount: number): number {
  const cap = foodCapacity(world);
  const before = colony.food;
  colony.food = Math.min(cap, colony.food + amount);
  const stored = colony.food - before;
  if (amount - stored > 0.001 && world.spoilTimer <= 0) {
    world.spoilTimer = 6;
    log(world, "Storage is full — surplus food spoils. Dig a granary!");
  }
  return stored;
}

const ROOM_BY_CODE: Record<number, RoomType> = {
  [ROOM_CODES.nursery]: "nursery",
  [ROOM_CODES.granary]: "granary",
  [ROOM_CODES.barracks]: "barracks",
};

/** Deterministic, seedable PRNG (mulberry32). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 0..1 through the current day/night cycle. */
export function dayPhase(world: World): number {
  return (world.time % DAY_LENGTH) / DAY_LENGTH;
}

export function isDay(world: World): boolean {
  return dayPhase(world) < DAY_FRACTION;
}

export function log(world: World, message: string): void {
  world.log.unshift(message);
  if (world.log.length > 6) world.log.length = 6;
}

export function spawnAnt(world: World, colony: Colony, role: Role): Ant | null {
  if (world.ants.length >= MAX_ANTS) return null;
  const center = cellCenter(colony.queenCell);
  const ant: Ant = {
    id: world.nextId++,
    colonyId: colony.id,
    role,
    pos: { x: center.x, y: center.y },
    facing: world.rng() < 0.5 ? -1 : 1,
    wiggle: world.rng() * Math.PI * 2,
    hp: ANT_MAX_HP,
    path: null,
    pathIdx: 0,
    state: role === "forager" ? "seek" : role === "builder" ? "find" : "patrol",
    carrying: 0,
    targetFood: null,
    targetJob: null,
  };
  world.ants.push(ant);
  world.totalHatched++;
  return ant;
}

/** Choose the next egg's role by the largest proportional deficit vs weights. */
export function pickEggRole(world: World, colony: Colony): Role {
  const roles: Role[] = ["forager", "builder", "soldier"];
  const counts: Record<Role, number> = { forager: 0, builder: 0, soldier: 0 };
  for (const a of world.ants) {
    if (a.colonyId === colony.id) counts[a.role]++;
  }
  const totalWeight =
    colony.roleWeights.forager + colony.roleWeights.builder + colony.roleWeights.soldier || 1;
  const totalAnts = world.ants.filter((a) => a.colonyId === colony.id).length || 1;

  let bestRole: Role = "forager";
  let bestDeficit = -Infinity;
  for (const r of roles) {
    const want = (colony.roleWeights[r] / totalWeight) * totalAnts;
    const deficit = want - counts[r];
    // Weight 0 means "never make this role" unless nothing else qualifies.
    const adjusted = colony.roleWeights[r] === 0 ? -Infinity : deficit;
    if (adjusted > bestDeficit) {
      bestDeficit = adjusted;
      bestRole = r;
    }
  }
  return bestRole;
}

/**
 * Whether a dig could be queued on `cell` right now: it must be soil, not
 * already queued, touch a passable cell, and be affordable. Pure (no mutation).
 */
export function canQueueDig(world: World, colony: Colony, cell: number): boolean {
  if (cell < 0 || cell >= COLS * ROWS) return false;
  if (world.grid[cell] !== "soil") return false;
  if (world.digJobs.some((j) => j.cell === cell && !j.done)) return false;
  if (adjacentPassable(world, cell) === -1) return false;
  if (colony.food < DIG_FOOD_COST) return false;
  return true;
}

/**
 * Queue a dig on a soil cell. Valid only if the cell is soil and touches an
 * already-passable cell, and the colony can afford it. Returns true on success.
 */
export function tryQueueDig(world: World, colony: Colony, cell: number): boolean {
  if (!canQueueDig(world, colony, cell)) return false;
  colony.food -= DIG_FOOD_COST;
  world.digJobs.push({
    id: world.nextId++,
    cell,
    progress: 0,
    claimedBy: null,
    done: false,
  });
  return true;
}

export function spawnFood(world: World): void {
  const col = 2 + Math.floor(world.rng() * (COLS - 4));
  // Merge into an existing nearby source instead of stacking duplicates.
  const existing = world.foods.find((f) => Math.abs(f.col - col) <= 1);
  if (existing) {
    existing.amount += FOOD_SOURCE_AMOUNT;
    return;
  }
  world.foods.push({ id: world.nextId++, col, amount: FOOD_SOURCE_AMOUNT });
}

/** A random reachable cell for idle wandering, biased to stay underground. */
export function randomWanderCell(world: World, from: number): number {
  const fromRow = Math.floor(from / COLS);
  for (let tries = 0; tries < 12; tries++) {
    const col = Math.floor(world.rng() * COLS);
    // Prefer underground unless we're already up on the surface.
    const row =
      fromRow <= SURFACE_ROW && world.rng() < 0.5
        ? SURFACE_ROW
        : SURFACE_ROW + 1 + Math.floor(world.rng() * (ROWS - SURFACE_ROW - 1));
    if (passable(world, col, row)) return row * COLS + col;
  }
  return from;
}

export function nearestFood(world: World, from: number): FoodSource | null {
  const col = from % COLS;
  let best: FoodSource | null = null;
  let bestDist = Infinity;
  for (const f of world.foods) {
    if (f.amount <= 0) continue;
    const d = Math.abs(f.col - col);
    if (d < bestDist) {
      bestDist = d;
      best = f;
    }
  }
  return best;
}

export function foodCell(food: FoodSource): number {
  return SURFACE_ROW * COLS + food.col;
}

export function antCellOf(ant: Ant): number {
  return antCell(ant.pos);
}

/**
 * Finish excavating a cell: open it up, grow the nest, and roll for a buried
 * cache (richer the deeper you dig). Called by the builder behaviour.
 */
export function completeDig(world: World, cell: number): void {
  if (world.grid[cell] !== "soil") return;
  world.grid[cell] = "tunnel";
  world.dugCells++;

  const depth = Math.max(0, Math.floor(cell / COLS) - GROUND_ROW);
  const roll = world.rng();
  if (roll < CACHE_BASE_CHANCE + depth * CACHE_DEPTH_BONUS) {
    const amount = CACHE_MIN + Math.floor(world.rng() * (CACHE_MAX - CACHE_MIN + 1));
    const stored = addFood(world, world.colonies[0], amount);
    world.cacheFlashes.push({ cell, ttl: 1.3 });
    log(world, `Diggers struck a buried cache! +${stored} food`);
  } else if (roll > 1 - HAZARD_CHANCE) {
    world.cacheFlashes.push({ cell, ttl: 0.8 });
    log(world, "A damp pocket — nothing but wet soil here.");
  }
}

export function canDesignateRoom(
  world: World,
  colony: Colony,
  cell: number,
  type: RoomType,
): boolean {
  if (cell < 0 || cell >= COLS * ROWS) return false;
  const t = world.grid[cell];
  if (t !== "tunnel" && t !== "chamber") return false; // must already be dug
  if (cell === colony.queenCell) return false; // protect the throne
  if (world.rooms[cell] === ROOM_CODES[type]) return false; // already this room
  if (colony.food < ROOM_COST) return false;
  return true;
}

/** Convert a dug cell into a specialised room. Returns true on success. */
export function designateRoom(
  world: World,
  colony: Colony,
  cell: number,
  type: RoomType,
): boolean {
  if (!canDesignateRoom(world, colony, cell, type)) return false;
  const prev = world.rooms[cell];
  if (prev && ROOM_BY_CODE[prev]) world.roomCounts[ROOM_BY_CODE[prev]]--;
  world.rooms[cell] = ROOM_CODES[type];
  world.roomCounts[type]++;
  world.grid[cell] = "chamber"; // rooms read as carved chambers
  colony.food -= ROOM_COST;
  log(world, `Designated a ${type}.`);
  return true;
}

/** Unclaimed dig job whose adjacent work cell is reachable, nearest to `from`. */
export function nearestOpenJob(world: World, from: number): DigJob | null {
  const col = from % COLS;
  const row = Math.floor(from / COLS);
  let best: DigJob | null = null;
  let bestDist = Infinity;
  for (const j of world.digJobs) {
    if (j.done || j.claimedBy !== null) continue;
    if (adjacentPassable(world, j.cell) === -1) continue;
    const jc = j.cell % COLS;
    const jr = Math.floor(j.cell / COLS);
    const d = Math.abs(jc - col) + Math.abs(jr - row);
    if (d < bestDist) {
      bestDist = d;
      best = j;
    }
  }
  return best;
}
