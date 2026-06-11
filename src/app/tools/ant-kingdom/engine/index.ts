// Public surface of the Ant Kingdom engine, consumed by the React page.

export * from "./constants";
export * from "./types";
export { createWorld, step } from "./world";
export {
  tryQueueDig,
  canQueueDig,
  designateRoom,
  canDesignateRoom,
  antCapacity,
  foodCapacity,
  effectiveEggInterval,
  soldierBonus,
  isDay,
  dayPhase,
  foodCell,
} from "./helpers";
export { antCell, cellIndex, cellCol, cellRow } from "./nav";
export { behaviorByRole } from "./behaviors";
