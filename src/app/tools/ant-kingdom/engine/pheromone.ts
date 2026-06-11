// Food-trail pheromone field.
//
// Foragers carrying food home deposit scent in the cell they're standing in.
// Searching foragers that have lost their target bias their wander toward the
// strongest neighbouring scent — an emergent trail to the food. The field
// decays every tick so abandoned trails fade. This is a real per-cell field
// (not faked waypoints), which is what makes it reusable for Ant Wars later.

import { COLS, PHEROMONE_DECAY, PHEROMONE_DEPOSIT, PHEROMONE_MAX, ROWS } from "./constants";
import { passable } from "./nav";
import type { World } from "./types";

export function deposit(world: World, cell: number, amount = PHEROMONE_DEPOSIT): void {
  const v = world.pheromone[cell] + amount;
  world.pheromone[cell] = v > PHEROMONE_MAX ? PHEROMONE_MAX : v;
}

export function decay(world: World): void {
  const p = world.pheromone;
  for (let i = 0; i < p.length; i++) {
    const v = p[i];
    if (v > 0.001) p[i] = v * PHEROMONE_DECAY;
    else if (v !== 0) p[i] = 0;
  }
}

/**
 * From `cell`, the passable 4-neighbour with the most scent. Returns the cell
 * index, or -1 if no neighbour carries a meaningful trail.
 */
export function strongestNeighbor(world: World, cell: number): number {
  const col = cell % COLS;
  const row = Math.floor(cell / COLS);
  let best = -1;
  let bestVal = 0.05; // ignore near-zero noise
  const offsets = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  for (const [dc, dr] of offsets) {
    const nc = col + dc;
    const nr = row + dr;
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
    if (!passable(world, nc, nr)) continue;
    const ni = nr * COLS + nc;
    const v = world.pheromone[ni];
    if (v > bestVal) {
      bestVal = v;
      best = ni;
    }
  }
  return best;
}
