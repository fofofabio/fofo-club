// Stock performance figures for the Stadium Drift 2 office league.
//
// Numbers are the in-game stock values for Need for Speed: Underground 2 as
// listed on the NFS wiki car list. `unlock` is what the career mode asks of you
// before the car shows up in a car lot, which is also the fairest line to draw
// a rules boundary along: the eight "start" cars are what everyone has on a
// fresh save, the rest are progression rewards.

export type Drivetrain = "FWD" | "RWD" | "AWD";
export type Legality = "legal" | "novelty" | "banned";

export type DriftCar = {
  id: string;
  name: string;
  drivetrain: Drivetrain;
  bhp: number;
  topSpeedMph: number;
  zeroToSixty: number;
  /** In-game stock ratings, 0-10 scale as shown on the car lot screen. */
  accel: number;
  topSpeed: number;
  handling: number;
  /** Career stage the car becomes buyable in. 0 = available from the start. */
  unlockStage: number;
  legality: Legality;
  /** Why the car sits where it sits. Shown on the rules card. */
  verdict: string;
};

export const DRIFT_CARS: DriftCar[] = [
  {
    id: "240sx",
    name: "Nissan 240SX",
    drivetrain: "RWD",
    bhp: 155.4,
    topSpeedMph: 130,
    zeroToSixty: 8.33,
    accel: 1.5,
    topSpeed: 0.7,
    handling: 3.7,
    unlockStage: 0,
    legality: "legal",
    verdict: "The pick. Rear drive, most power and the highest top speed of the start cars.",
  },
  {
    id: "miata",
    name: "Mazda Miata MX-5",
    drivetrain: "RWD",
    bhp: 128.1,
    topSpeedMph: 125,
    zeroToSixty: 7.73,
    accel: 1.2,
    topSpeed: 0.6,
    handling: 4.3,
    unlockStage: 0,
    legality: "legal",
    verdict: "Best handling of the rear-drive three. Slow, but it holds an angle forever.",
  },
  {
    id: "corolla",
    name: "Toyota Corolla",
    drivetrain: "RWD",
    bhp: 112.1,
    topSpeedMph: 125,
    zeroToSixty: 8.53,
    accel: 0.7,
    topSpeed: 0.7,
    handling: 3.8,
    unlockStage: 0,
    legality: "legal",
    verdict: "Rear drive but the weakest engine on the grid. Pure skill bracket.",
  },
  {
    id: "206",
    name: "Peugeot 206",
    drivetrain: "FWD",
    bhp: 138.0,
    topSpeedMph: 125,
    zeroToSixty: 8.32,
    accel: 1.5,
    topSpeed: 0.6,
    handling: 3.5,
    unlockStage: 0,
    legality: "legal",
    verdict: "Strongest front-drive motor. Has to be bullied into every corner.",
  },
  {
    id: "civic",
    name: "Honda Civic",
    drivetrain: "FWD",
    bhp: 158.7,
    topSpeedMph: 127,
    zeroToSixty: 7.24,
    accel: 1.2,
    topSpeed: 0.6,
    handling: 3.8,
    unlockStage: 0,
    legality: "legal",
    verdict: "Most power of any start car, but front drive wastes most of it here.",
  },
  {
    id: "focus",
    name: "Ford Focus",
    drivetrain: "FWD",
    bhp: 130.4,
    topSpeedMph: 125,
    zeroToSixty: 8.71,
    accel: 1.1,
    topSpeed: 0.7,
    handling: 3.6,
    unlockStage: 0,
    legality: "legal",
    verdict: "Middle of the front-drive pack in every direction.",
  },
  {
    id: "corsa",
    name: "Vauxhall Corsa 1.8",
    drivetrain: "FWD",
    bhp: 124.7,
    topSpeedMph: 138,
    zeroToSixty: 8.05,
    accel: 1.2,
    topSpeed: 1.4,
    handling: 4.1,
    unlockStage: 0,
    legality: "legal",
    verdict: "Surprising top speed for a start car, and it turns. Sleeper pick.",
  },
  {
    id: "106",
    name: "Peugeot 106",
    drivetrain: "FWD",
    bhp: 119.8,
    topSpeedMph: 141,
    zeroToSixty: 8.23,
    accel: 1.3,
    topSpeed: 1.6,
    handling: 4.2,
    unlockStage: 0,
    legality: "legal",
    verdict: "Highest top speed of all eight, lowest power. Carries momentum, hates reversals.",
  },
  {
    id: "escalade",
    name: "Cadillac Escalade",
    drivetrain: "AWD",
    bhp: 345.6,
    topSpeedMph: 125,
    zeroToSixty: 8.58,
    accel: 0.8,
    topSpeed: 0.6,
    handling: 1.2,
    unlockStage: 2,
    legality: "novelty",
    verdict: "345 bhp that goes nowhere: 1.2 handling, 0.6 top speed, two tonnes. A penalty, not an edge.",
  },
  {
    id: "350z",
    name: "Nissan 350Z",
    drivetrain: "RWD",
    bhp: 287.1,
    topSpeedMph: 155,
    zeroToSixty: 6.16,
    accel: 3.6,
    topSpeed: 3.0,
    handling: 3.3,
    unlockStage: 4,
    legality: "banned",
    verdict: "Double the power, 25 mph more top speed, rear drive. Nothing on the start grid touches it.",
  },
  {
    id: "gto",
    name: "Pontiac GTO",
    drivetrain: "RWD",
    bhp: 349.0,
    topSpeedMph: 155,
    zeroToSixty: 4.97,
    accel: 3.2,
    topSpeed: 3.0,
    handling: 2.2,
    unlockStage: 4,
    legality: "banned",
    verdict: "349 bhp of rear drive. Enters a drift by breathing on the throttle.",
  },
  {
    id: "evo8",
    name: "Lancer Evolution VIII",
    drivetrain: "AWD",
    bhp: 270.5,
    topSpeedMph: 155,
    zeroToSixty: 4.06,
    accel: 3.4,
    topSpeed: 3.0,
    handling: 4.5,
    unlockStage: 4,
    legality: "banned",
    verdict: "4.5 handling and 3.4 accel. Fastest and most forgiving car on the list.",
  },
];

export const CARS_BY_ID = new Map(DRIFT_CARS.map((car) => [car.id, car]));

export const LEGAL_CAR_IDS = new Set(
  DRIFT_CARS.filter((car) => car.legality !== "banned").map((car) => car.id),
);

export function isLegalCar(id: string) {
  return LEGAL_CAR_IDS.has(id);
}

export function carName(id: string) {
  return CARS_BY_ID.get(id)?.name ?? id;
}
