// Ant Kingdom — balance & world constants.
// All simulation values live here so the game is easy to tune.
// Positions in the engine are in *cell* units (not pixels); the renderer
// multiplies by a cellSize derived from the canvas width.

// Grid dimensions are mutable so the map can be resized at runtime. They are
// `let` exports: ES module live bindings mean every importer sees the current
// value after `setGridSize` (all engine code reads COLS/ROWS at call time, not
// at import time). Only one world exists at a time, so global grid dims are safe.
export let COLS = 44;
export let ROWS = 30;

export type GridSizeKey = "small" | "medium" | "large";

export const GRID_SIZES: Record<GridSizeKey, { cols: number; rows: number; label: string }> = {
  small: { cols: 36, rows: 24, label: "Small" },
  medium: { cols: 44, rows: 30, label: "Medium" },
  large: { cols: 60, rows: 40, label: "Large" },
};

export function setGridSize(key: GridSizeKey): void {
  COLS = GRID_SIZES[key].cols;
  ROWS = GRID_SIZES[key].rows;
}

// Row layout: sky on top, a single surface lane the ants walk on, then soil.
// These are independent of grid width/height, so a bigger ROWS just means a
// deeper nest to dig.
export const GROUND_ROW = 9; // first underground (soil) row
export const SURFACE_ROW = GROUND_ROW - 1; // ants walk here when above ground

export const MAX_ANTS = 130;

// Queen / population
export const EGG_INTERVAL = 6; // seconds between egg attempts
export const EGG_FOOD_COST = 4; // food spent per hatched ant
export const START_FOOD = 32;
export const START_ANTS = 6;

// Digging
export const DIG_FOOD_COST = 3; // food to queue one cell
export const DIG_TIME = 2.2; // builder-seconds to finish a cell

// Movement (cells / second)
export const FORAGER_SPEED = 6.5;
export const BUILDER_SPEED = 5.5;
export const SOLDIER_SPEED = 7.2;
export const CARRY_CAPACITY = 1; // food units per foraging trip

// Surface food
export const FOOD_SPAWN_INTERVAL = 3.2;
export const FOOD_MAX_SOURCES = 11;
export const FOOD_SOURCE_AMOUNT = 6;

// Pheromone field (food-trail). Decays multiplicatively each sim tick.
export const PHEROMONE_DECAY = 0.985;
export const PHEROMONE_DEPOSIT = 1.0;
export const PHEROMONE_MAX = 6;

// Day / night
export const DAY_LENGTH = 64; // seconds for a full cycle
export const DAY_FRACTION = 0.62; // portion of the cycle that is daytime

// Events
export const EVENT_INTERVAL_MIN = 22;
export const EVENT_INTERVAL_MAX = 40;
export const RAIN_DURATION = 12;
export const SPIDER_DURATION = 20;

// Combat
export const ANT_MAX_HP = 3;
export const SPIDER_MAX_HP = 9;
export const SPIDER_SPEED = 4.6;
export const SPIDER_DPS = 1.6; // damage to an ant per second when adjacent
export const SOLDIER_DPS = 2.4; // damage a soldier deals to the spider

// --- Dig economy: capacity, storage, rooms, caches ---------------------------

// Nest capacity. The colony can't hatch past this, so growth REQUIRES digging.
export const BASE_ANT_CAP = 10;
export const ANTS_PER_CELL = 0.5; // each dug cell supports this many ants

// Food storage. Surplus beyond the cap spoils, so storage must be expanded.
export const BASE_FOOD_CAP = 40;
export const FOOD_PER_CELL = 2; // each dug cell adds this much storage
export const STORAGE_PER_CELL = 14; // visual fill capacity per chamber cell

// Rooms (designated on already-dug cells).
export const ROOM_COST = 6; // food to designate one room cell
export const GRANARY_FOOD_CAP = 26; // bonus storage per granary cell
export const NURSERY_EGG_FACTOR = 0.09; // egg-interval reduction per nursery cell
export const NURSERY_EGG_FLOOR = 0.45; // fastest the interval can get (× base)
export const BARRACKS_SOLDIER_FACTOR = 0.13; // soldier-damage bonus per barracks cell
export const BARRACKS_SOLDIER_CAP = 1.5; // max soldier-damage bonus

// Buried caches uncovered when a dig completes (deeper = richer).
export const CACHE_BASE_CHANCE = 0.13;
export const CACHE_DEPTH_BONUS = 0.012; // added per row below the surface
export const CACHE_MIN = 4;
export const CACHE_MAX = 13;
export const HAZARD_CHANCE = 0.05; // flavour "damp pocket" with no payoff

// Fixed simulation timestep (seconds). The loop accumulates real time and
// steps in fixed chunks so behaviour is frame-rate independent.
export const SIM_DT = 1 / 60;

// Room type <-> numeric code used in the parallel `rooms` array.
export const ROOM_CODES = { nursery: 1, granary: 2, barracks: 3 } as const;
