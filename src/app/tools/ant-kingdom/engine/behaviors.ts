// Per-role behaviour functions, dispatched through `behaviorByRole`.
//
// This map IS the documented extension point for Ant Wars: a hostile colony
// can reuse "forager"/"builder" as-is and only needs a smarter "soldier"
// (or new roles like "scout"/"raider") added here — the core loop in world.ts
// never changes.

import {
  BUILDER_SPEED,
  CARRY_CAPACITY,
  COLS,
  DIG_TIME,
  FORAGER_SPEED,
  SOLDIER_DPS,
  SOLDIER_SPEED,
  SURFACE_ROW,
} from "./constants";
import {
  adjacentPassable,
  antCell,
  bfs,
  cellCenter,
  isAdjacent,
} from "./nav";
import { deposit, strongestNeighbor } from "./pheromone";
import {
  addFood,
  completeDig,
  foodCell,
  isDay,
  nearestFood,
  nearestOpenJob,
  randomWanderCell,
  soldierBonus,
} from "./helpers";
import type { Ant, Behavior, Colony, Role, World } from "./types";

type MoveResult = "idle" | "moving" | "arrived";

const colonyOf = (world: World, ant: Ant): Colony =>
  world.colonies.find((c) => c.id === ant.colonyId) ?? world.colonies[0];

const needsPath = (ant: Ant): boolean => !ant.path;

function setPath(world: World, ant: Ant, goal: number): boolean {
  const path = bfs(world, antCell(ant.pos), goal);
  if (path === null) {
    ant.path = null;
    ant.pathIdx = 0;
    return false;
  }
  ant.path = path;
  ant.pathIdx = 0;
  return true;
}

function moveAlong(world: World, ant: Ant, speed: number, dt: number): MoveResult {
  void world;
  if (!ant.path) return "idle";
  if (ant.pathIdx >= ant.path.length) {
    ant.path = null;
    return "arrived";
  }
  const target = cellCenter(ant.path[ant.pathIdx]);
  const dx = target.x - ant.pos.x;
  const dy = target.y - ant.pos.y;
  const dist = Math.hypot(dx, dy);
  const stepLen = speed * dt;
  ant.facing = dx >= 0 ? 1 : -1;
  ant.wiggle += dt * 12;

  if (dist <= stepLen || dist < 1e-4) {
    ant.pos.x = target.x;
    ant.pos.y = target.y;
    ant.pathIdx++;
    if (ant.pathIdx >= ant.path.length) {
      ant.path = null;
      return "arrived";
    }
    return "moving";
  }
  ant.pos.x += (dx / dist) * stepLen;
  ant.pos.y += (dy / dist) * stepLen;
  return "moving";
}

function wander(world: World, ant: Ant, speed: number, dt: number): void {
  if (needsPath(ant)) {
    setPath(world, ant, randomWanderCell(world, antCell(ant.pos)));
  }
  moveAlong(world, ant, speed, dt);
}

function releaseJob(ant: Ant): void {
  if (ant.targetJob && ant.targetJob.claimedBy === ant.id) {
    ant.targetJob.claimedBy = null;
  }
  ant.targetJob = null;
}

// ---------------------------------------------------------------- forager ---

const forager: Behavior = (ant, world, dt) => {
  const colony = colonyOf(world, ant);
  const day = isDay(world);
  const raining = world.weather === "rain";

  // Night or rain sends foragers home and underground.
  if ((!day || raining) && ant.state === "seek") {
    ant.state = ant.carrying > 0 ? "return" : "rest";
    ant.path = null;
  }

  if (ant.state === "return") {
    deposit(world, antCell(ant.pos));
    if (needsPath(ant) && !setPath(world, ant, colony.queenCell)) {
      wander(world, ant, FORAGER_SPEED, dt);
      return;
    }
    if (moveAlong(world, ant, FORAGER_SPEED, dt) === "arrived") {
      addFood(world, colony, ant.carrying);
      ant.carrying = 0;
      ant.state = day && !raining ? "seek" : "rest";
    }
    return;
  }

  if (ant.state === "rest") {
    if (day && !raining) {
      ant.state = ant.carrying > 0 ? "return" : "seek";
      ant.path = null;
      return;
    }
    // Get off the surface, then idle in the tunnels.
    const here = antCell(ant.pos);
    if (Math.floor(here / COLS) <= SURFACE_ROW) {
      if (needsPath(ant)) setPath(world, ant, colony.queenCell);
      moveAlong(world, ant, FORAGER_SPEED, dt);
    } else {
      wander(world, ant, FORAGER_SPEED * 0.7, dt);
    }
    return;
  }

  // state === "seek"
  if (ant.targetFood && ant.targetFood.amount > 0) {
    if (needsPath(ant) && !setPath(world, ant, foodCell(ant.targetFood))) {
      ant.targetFood = null;
      return;
    }
    if (moveAlong(world, ant, FORAGER_SPEED, dt) === "arrived") {
      const take = Math.min(CARRY_CAPACITY, ant.targetFood.amount);
      ant.targetFood.amount -= take;
      ant.carrying = take;
      ant.targetFood = null;
      ant.state = "return";
      ant.path = null;
    }
    return;
  }

  // No known food: claim the nearest source, else follow the scent trail.
  const here = antCell(ant.pos);
  const food = nearestFood(world, here);
  if (food) {
    ant.targetFood = food;
    ant.path = null;
    return;
  }
  if (needsPath(ant)) {
    const scent = strongestNeighbor(world, here);
    setPath(world, ant, scent !== -1 ? scent : randomWanderCell(world, here));
  }
  moveAlong(world, ant, FORAGER_SPEED, dt);
};

// ---------------------------------------------------------------- builder ---

const builder: Behavior = (ant, world, dt) => {
  switch (ant.state) {
    case "find": {
      const job = nearestOpenJob(world, antCell(ant.pos));
      if (!job) {
        ant.state = "rest";
        return;
      }
      job.claimedBy = ant.id;
      ant.targetJob = job;
      const work = adjacentPassable(world, job.cell);
      if (work === -1 || !setPath(world, ant, work)) {
        releaseJob(ant);
        ant.state = "rest";
        return;
      }
      ant.state = "travel";
      return;
    }
    case "travel": {
      const job = ant.targetJob;
      if (!job || job.done) {
        releaseJob(ant);
        ant.state = "find";
        return;
      }
      if (needsPath(ant)) {
        const work = adjacentPassable(world, job.cell);
        if (work === -1 || !setPath(world, ant, work)) {
          releaseJob(ant);
          ant.state = "find";
          return;
        }
      }
      if (moveAlong(world, ant, BUILDER_SPEED, dt) === "arrived") {
        ant.state = isAdjacent(antCell(ant.pos), job.cell) ? "dig" : "travel";
      }
      return;
    }
    case "dig": {
      const job = ant.targetJob;
      if (!job || job.done) {
        releaseJob(ant);
        ant.state = "find";
        return;
      }
      if (!isAdjacent(antCell(ant.pos), job.cell)) {
        ant.state = "travel";
        ant.path = null;
        return;
      }
      job.progress += dt / DIG_TIME;
      ant.wiggle += dt * 16;
      if (job.progress >= 1) {
        completeDig(world, job.cell);
        job.done = true;
        ant.targetJob = null;
        ant.state = "find";
      }
      return;
    }
    default: {
      // "rest"
      if (nearestOpenJob(world, antCell(ant.pos))) {
        ant.state = "find";
        return;
      }
      wander(world, ant, BUILDER_SPEED * 0.7, dt);
      return;
    }
  }
};

// ---------------------------------------------------------------- soldier ---

const soldier: Behavior = (ant, world, dt) => {
  const spider = world.spider;
  if (!spider) {
    ant.state = "patrol";
    wander(world, ant, SOLDIER_SPEED * 0.8, dt);
    return;
  }

  ant.state = "engage";
  const dist = Math.hypot(ant.pos.x - spider.pos.x, ant.pos.y - spider.pos.y);
  if (dist < 1.6) {
    spider.hp -= SOLDIER_DPS * (1 + soldierBonus(world)) * dt;
    ant.path = null; // hold position and keep biting
    ant.facing = spider.pos.x >= ant.pos.x ? 1 : -1;
    ant.wiggle += dt * 20;
    return;
  }
  if (needsPath(ant)) {
    setPath(world, ant, antCell(spider.pos));
  }
  if (moveAlong(world, ant, SOLDIER_SPEED, dt) === "arrived") {
    ant.path = null; // recompute toward the spider's new position
  }
};

export const behaviorByRole: Record<Role, Behavior> = {
  forager,
  builder,
  soldier,
};
