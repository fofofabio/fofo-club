// World construction + the fixed-timestep simulation loop.

import {
  COLS,
  DAY_LENGTH,
  EGG_FOOD_COST,
  EGG_INTERVAL,
  EVENT_INTERVAL_MAX,
  EVENT_INTERVAL_MIN,
  FOOD_MAX_SOURCES,
  FOOD_SPAWN_INTERVAL,
  GROUND_ROW,
  RAIN_DURATION,
  ROWS,
  SPIDER_DPS,
  SPIDER_MAX_HP,
  SPIDER_SPEED,
  SPIDER_DURATION,
  START_ANTS,
  START_FOOD,
  SURFACE_ROW,
  setGridSize,
} from "./constants";
import { behaviorByRole } from "./behaviors";
import { antCell, cellIndex } from "./nav";
import { decay } from "./pheromone";
import {
  antCapacity,
  effectiveEggInterval,
  log,
  makeRng,
  nearestFood,
  pickEggRole,
  spawnAnt,
  spawnFood,
} from "./helpers";
import type { GridSizeKey } from "./constants";
import type { CellType, Colony, World } from "./types";

// Queen sits this many rows below the surface. Independent of grid size, so a
// taller map simply leaves more room to dig beneath her.
const CHAMBER_ROW = GROUND_ROW + 9;

function digStartingNest(grid: CellType[], centerCol: number): number {
  // Vertical shaft from the surface entrance down to the queen's chamber.
  for (let row = GROUND_ROW; row <= CHAMBER_ROW; row++) {
    grid[cellIndex(centerCol, row)] = "tunnel";
  }
  // 3-wide, 3-tall royal chamber.
  for (let r = CHAMBER_ROW - 1; r <= CHAMBER_ROW + 1; r++) {
    for (let c = centerCol - 1; c <= centerCol + 1; c++) {
      grid[cellIndex(c, r)] = "chamber";
    }
  }
  return cellIndex(centerCol, CHAMBER_ROW);
}

export function createWorld(seed = Date.now(), size?: GridSizeKey): World {
  if (size) setGridSize(size);
  const rng = makeRng(seed);
  const centerCol = Math.floor(COLS / 2);
  const grid: CellType[] = new Array(COLS * ROWS).fill("soil");
  const queenCell = digStartingNest(grid, centerCol);
  const startingDug = grid.reduce((n, c) => (c === "soil" ? n : n + 1), 0);

  const colony: Colony = {
    id: 0,
    food: START_FOOD,
    eggTimer: EGG_INTERVAL,
    queenCol: centerCol,
    queenRow: CHAMBER_ROW,
    queenCell,
    roleWeights: { forager: 3, builder: 1, soldier: 0 },
  };

  const world: World = {
    cols: COLS,
    rows: ROWS,
    grid,
    rooms: new Uint8Array(COLS * ROWS),
    pheromone: new Float32Array(COLS * ROWS),
    ants: [],
    colonies: [colony],
    foods: [],
    digJobs: [],
    spider: null,
    time: 0,
    weather: "clear",
    weatherTimer: 0,
    eventTimer: EVENT_INTERVAL_MIN + rng() * (EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN),
    foodTimer: FOOD_SPAWN_INTERVAL,
    dugCells: startingDug,
    roomCounts: { nursery: 0, granary: 0, barracks: 0 },
    cacheFlashes: [],
    atCapacity: false,
    spoilTimer: 0,
    population: 0,
    peakPopulation: 0,
    totalHatched: 0,
    gameOver: false,
    rng,
    nextId: 1,
    log: [],
  };

  // A few crumbs to forage on day one.
  for (let i = 0; i < 4; i++) spawnFood(world);

  // Starting workforce, distributed by the colony's role weights.
  for (let i = 0; i < START_ANTS; i++) {
    spawnAnt(world, colony, pickEggRole(world, colony));
  }
  world.population = world.ants.length;
  world.peakPopulation = world.population;
  log(world, "A new colony stirs beneath the soil.");

  return world;
}

function updateWeatherAndEvents(world: World, dt: number): void {
  // Resolve active rain.
  if (world.weather === "rain") {
    world.weatherTimer -= dt;
    if (world.weatherTimer <= 0) {
      world.weather = "clear";
      // The downpour turns up a feast of worms.
      for (let i = 0; i < 4; i++) spawnFood(world);
      log(world, "The rain clears — worms surface everywhere.");
    }
  }

  // Natural food trickles in (but not mid-downpour).
  if (world.weather !== "rain") {
    world.foodTimer -= dt;
    if (world.foodTimer <= 0) {
      if (world.foods.length < FOOD_MAX_SOURCES) spawnFood(world);
      world.foodTimer = FOOD_SPAWN_INTERVAL * (0.7 + world.rng() * 0.6);
    }
  }

  // Schedule the next hazard.
  world.eventTimer -= dt;
  if (world.eventTimer <= 0 && world.weather === "clear" && !world.spider) {
    if (world.rng() < 0.5) {
      world.weather = "rain";
      world.weatherTimer = RAIN_DURATION;
      log(world, "Rain drums down — foragers retreat underground.");
    } else {
      const col = 3 + Math.floor(world.rng() * (COLS - 6));
      world.spider = {
        pos: { x: col + 0.5, y: SURFACE_ROW + 0.5 },
        hp: SPIDER_MAX_HP,
        timeLeft: SPIDER_DURATION,
      };
      log(world, "A spider prowls the surface!");
    }
    world.eventTimer = EVENT_INTERVAL_MIN + world.rng() * (EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN);
  }
}

function updateSpider(world: World, dt: number): void {
  const s = world.spider;
  if (!s) return;

  s.timeLeft -= dt;
  if (s.hp <= 0) {
    world.spider = null;
    log(world, "The soldiers drove off the spider!");
    return;
  }
  if (s.timeLeft <= 0) {
    world.spider = null;
    log(world, "The spider skittered away.");
    return;
  }

  // Hunt the nearest ant exposed on the surface; otherwise stalk the food.
  let targetX = s.pos.x;
  let nearestDist = Infinity;
  for (const ant of world.ants) {
    if (Math.floor(ant.pos.y) > SURFACE_ROW) continue;
    const d = Math.abs(ant.pos.x - s.pos.x);
    if (d < nearestDist) {
      nearestDist = d;
      targetX = ant.pos.x;
    }
  }
  if (nearestDist === Infinity) {
    const f = nearestFood(world, antCell(s.pos));
    if (f) targetX = f.col + 0.5;
  }

  const dx = targetX - s.pos.x;
  if (Math.abs(dx) > 0.02) {
    s.pos.x += Math.sign(dx) * Math.min(SPIDER_SPEED * dt, Math.abs(dx));
  }
  s.pos.x = Math.max(1, Math.min(COLS - 1, s.pos.x));
  s.pos.y = SURFACE_ROW + 0.5;

  // Bite anything it can reach.
  for (const ant of world.ants) {
    if (Math.floor(ant.pos.y) > SURFACE_ROW) continue;
    const d = Math.hypot(ant.pos.x - s.pos.x, ant.pos.y - s.pos.y);
    if (d < 1.2) ant.hp -= SPIDER_DPS * dt;
  }
}

function produceEggs(world: World, dt: number): void {
  const cap = antCapacity(world);
  world.atCapacity = world.population >= cap;
  for (const colony of world.colonies) {
    colony.eggTimer -= dt;
    if (colony.eggTimer > 0) continue;
    colony.eggTimer = effectiveEggInterval(world);
    if (world.ants.length >= cap) continue; // nest is full — dig for more room
    if (colony.food < EGG_FOOD_COST) continue;
    colony.food -= EGG_FOOD_COST;
    spawnAnt(world, colony, pickEggRole(world, colony));
  }
}

function cleanup(world: World): void {
  // Reap dead ants and free any dig jobs they had claimed.
  if (world.ants.some((a) => a.hp <= 0)) {
    const deadIds = new Set(world.ants.filter((a) => a.hp <= 0).map((a) => a.id));
    for (const job of world.digJobs) {
      if (job.claimedBy !== null && deadIds.has(job.claimedBy)) job.claimedBy = null;
    }
    world.ants = world.ants.filter((a) => a.hp > 0);
  }

  // Drop finished dig jobs and emptied food.
  if (world.digJobs.some((j) => j.done)) {
    world.digJobs = world.digJobs.filter((j) => !j.done);
  }
  if (world.foods.some((f) => f.amount <= 0)) {
    world.foods = world.foods.filter((f) => f.amount > 0);
  }

  world.population = world.ants.length;
  if (world.population > world.peakPopulation) world.peakPopulation = world.population;
}

/** Advance the simulation by one fixed step (`dt` seconds). */
export function step(world: World, dt: number): void {
  if (world.gameOver) return;

  world.time += dt;
  decay(world);
  if (world.spoilTimer > 0) world.spoilTimer -= dt;
  if (world.cacheFlashes.length) {
    for (const f of world.cacheFlashes) f.ttl -= dt;
    if (world.cacheFlashes.some((f) => f.ttl <= 0)) {
      world.cacheFlashes = world.cacheFlashes.filter((f) => f.ttl > 0);
    }
  }
  updateWeatherAndEvents(world, dt);
  updateSpider(world, dt);
  produceEggs(world, dt);

  for (const ant of world.ants) {
    behaviorByRole[ant.role](ant, world, dt);
  }

  cleanup(world);

  // The colony dies only when there are no ants AND no food left to hatch more.
  if (world.population === 0 && world.colonies.every((c) => c.food < EGG_FOOD_COST)) {
    world.gameOver = true;
    log(world, "The colony has fallen silent.");
  }
}

export { DAY_LENGTH };
