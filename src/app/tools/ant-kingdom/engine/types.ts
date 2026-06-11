// Ant Kingdom — shared types.
//
// Extension points for the future "Ant Wars" mode are baked in here:
//  - every Ant and Colony carries a `colonyId`, so a second hostile colony
//    is purely additive.
//  - ant behaviour is keyed by `role`, dispatched through a swappable map
//    (see engine/behaviors.ts), so new behaviours don't touch the core loop.

export type Role = "forager" | "builder" | "soldier";

export type CellType = "soil" | "tunnel" | "chamber";

/** A dug cell can be designated one of these specialised rooms. */
export type RoomType = "nursery" | "granary" | "barracks";

export interface Vec {
  x: number; // cell units (fractional)
  y: number;
}

export type ForagerState = "seek" | "return" | "rest";
export type BuilderState = "find" | "travel" | "dig" | "rest";
export type SoldierState = "patrol" | "engage";

export interface Ant {
  id: number;
  colonyId: number; // future Ant Wars: distinguishes rival colonies
  role: Role;
  pos: Vec;
  facing: 1 | -1;
  wiggle: number; // animation phase
  hp: number;

  // Pathing: a list of cell indices to walk through, and our cursor into it.
  path: number[] | null;
  pathIdx: number;

  // Per-role scratch state.
  state: string;
  carrying: number; // food units being carried home
  targetFood: FoodSource | null;
  targetJob: DigJob | null;
}

export interface FoodSource {
  id: number;
  col: number; // sits on the surface lane
  amount: number;
}

export interface DigJob {
  id: number;
  cell: number; // soil cell index being excavated
  progress: number; // 0..1
  claimedBy: number | null; // ant id
  done: boolean;
}

export interface Colony {
  id: number;
  food: number;
  eggTimer: number;
  queenCol: number;
  queenRow: number;
  queenCell: number;
  // Desired role weights; egg role is chosen by largest proportional deficit.
  roleWeights: Record<Role, number>;
}

export type WeatherKind = "clear" | "rain";

export interface Spider {
  pos: Vec;
  hp: number;
  timeLeft: number;
}

export interface CacheFlash {
  cell: number;
  ttl: number; // seconds of sparkle remaining
}

export interface World {
  cols: number;
  rows: number;
  grid: CellType[]; // length cols*rows
  rooms: Uint8Array; // parallel room codes (0 = none), length cols*rows
  pheromone: Float32Array; // food-trail field, length cols*rows

  ants: Ant[];
  colonies: Colony[];
  foods: FoodSource[];
  digJobs: DigJob[];
  spider: Spider | null;

  time: number; // seconds elapsed
  weather: WeatherKind;
  weatherTimer: number; // seconds left of current weather
  eventTimer: number; // seconds until next random event
  foodTimer: number;

  dugCells: number; // total excavated cells (drives capacity & storage)
  roomCounts: Record<RoomType, number>;
  cacheFlashes: CacheFlash[];
  atCapacity: boolean; // nest is full — HUD hint to dig
  spoilTimer: number; // throttles the "storage full" log

  population: number;
  peakPopulation: number;
  totalHatched: number;
  gameOver: boolean;

  rng: () => number;
  nextId: number;
  log: string[]; // short event feed (newest first)
}

/** A behaviour function for one role. Mutates the ant in place. */
export type Behavior = (ant: Ant, world: World, dt: number) => void;
