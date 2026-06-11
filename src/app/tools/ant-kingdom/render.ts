// Canvas renderer for the Ant Kingdom world.
// Works in CSS-pixel space; the page applies devicePixelRatio scaling and
// disables image smoothing so everything stays crisp and pixel-y.

import {
  COLS,
  DAY_FRACTION,
  GROUND_ROW,
  ROOM_CODES,
  ROWS,
  STORAGE_PER_CELL,
  SURFACE_ROW,
  dayPhase,
} from "./engine";
import type { Ant, World } from "./engine";

type RGB = [number, number, number];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: RGB, b: RGB, t: number): string =>
  `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(
    lerp(a[2], b[2], t),
  )})`;

const SKY_TOP_DAY: RGB = [150, 205, 255];
const SKY_BOT_DAY: RGB = [223, 240, 255];
const SKY_TOP_NIGHT: RGB = [9, 13, 33];
const SKY_BOT_NIGHT: RGB = [27, 34, 62];

const ROLE_COLOR: Record<string, string> = {
  forager: "#d98a2b",
  builder: "#9fce4e",
  soldier: "#d6452f",
};

/** Smooth 0..1 daylight factor (1 = noon, 0 = deep night). */
export function daylight(world: World): number {
  const p = dayPhase(world);
  const edge = 0.06;
  if (p < edge) return p / edge; // dawn
  if (p < DAY_FRACTION - edge) return 1; // day
  if (p < DAY_FRACTION) return (DAY_FRACTION - p) / edge; // dusk
  return 0; // night
}

function drawSky(ctx: CanvasRenderingContext2D, world: World, cs: number, light: number): void {
  const w = COLS * cs;
  const skyH = SURFACE_ROW * cs + cs * 0.5;
  const grad = ctx.createLinearGradient(0, 0, 0, skyH);
  grad.addColorStop(0, mix(SKY_TOP_NIGHT, SKY_TOP_DAY, light));
  grad.addColorStop(1, mix(SKY_BOT_NIGHT, SKY_BOT_DAY, light));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, skyH);

  const p = dayPhase(world);
  // Sun (day) or moon (night) tracking across the sky.
  const isDayTime = p < DAY_FRACTION;
  const arcT = isDayTime ? p / DAY_FRACTION : (p - DAY_FRACTION) / (1 - DAY_FRACTION);
  const bx = arcT * w;
  const by = skyH * 0.7 - Math.sin(arcT * Math.PI) * skyH * 0.55;
  if (isDayTime) {
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.arc(bx, by, cs * 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#e8ecf5";
    ctx.beginPath();
    ctx.arc(bx, by, cs * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stars fade in at night.
  if (light < 0.6) {
    ctx.fillStyle = `rgba(255,255,235,${(0.6 - light) * 0.9})`;
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 71 + 13) % (COLS * 10)) / 10;
      const sy = ((i * 37 + 5) % (SURFACE_ROW * 10)) / 10;
      ctx.fillRect(sx * cs, sy * cs, 1.5, 1.5);
    }
  }
}

function drawGround(ctx: CanvasRenderingContext2D, cs: number): void {
  const w = COLS * cs;
  // Grass lip along the surface lane.
  ctx.fillStyle = "#3f7d2e";
  ctx.fillRect(0, SURFACE_ROW * cs + cs * 0.55, w, cs * 0.45);
  ctx.fillStyle = "#2f5f22";
  ctx.fillRect(0, GROUND_ROW * cs - 2, w, 3);

  // Soil, banded darker with depth.
  const soilTop: RGB = [92, 58, 28];
  const soilBot: RGB = [44, 27, 12];
  for (let row = GROUND_ROW; row < ROWS; row++) {
    const t = (row - GROUND_ROW) / (ROWS - GROUND_ROW);
    ctx.fillStyle = mix(soilTop, soilBot, t);
    ctx.fillRect(0, row * cs, w, cs + 1);
  }
}

function drawTunnels(ctx: CanvasRenderingContext2D, world: World, cs: number): void {
  for (let i = 0; i < world.grid.length; i++) {
    const cell = world.grid[i];
    if (cell === "soil") continue;
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * cs;
    const y = row * cs;
    ctx.fillStyle = cell === "chamber" ? "#3a2412" : "#1f1308";
    ctx.fillRect(x, y, cs + 1, cs + 1);
    // Soft inner shading for a carved look.
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x + cs * 0.15, y + cs * 0.15, cs * 0.7, cs * 0.7);
  }
}

const ROOM_TINT: Record<number, string> = {
  [ROOM_CODES.nursery]: "#5a4a6e",
  [ROOM_CODES.granary]: "#5a3f12",
  [ROOM_CODES.barracks]: "#4a201b",
};

function drawRooms(ctx: CanvasRenderingContext2D, world: World, cs: number): void {
  for (let i = 0; i < world.rooms.length; i++) {
    const code = world.rooms[i];
    if (!code) continue;
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * cs;
    const y = row * cs;
    ctx.fillStyle = ROOM_TINT[code] ?? "#3a2412";
    ctx.fillRect(x, y, cs + 1, cs + 1);
    // Small pictogram so each room reads at a glance.
    if (code === ROOM_CODES.nursery) {
      ctx.fillStyle = "#e9dcae";
      ctx.fillRect(x + cs * 0.28, y + cs * 0.3, cs * 0.18, cs * 0.24);
      ctx.fillRect(x + cs * 0.54, y + cs * 0.4, cs * 0.18, cs * 0.24);
    } else if (code === ROOM_CODES.granary) {
      ctx.fillStyle = "#e9a93a";
      ctx.fillRect(x + cs * 0.3, y + cs * 0.5, cs * 0.18, cs * 0.18);
      ctx.fillRect(x + cs * 0.5, y + cs * 0.5, cs * 0.18, cs * 0.18);
      ctx.fillRect(x + cs * 0.4, y + cs * 0.32, cs * 0.18, cs * 0.18);
    } else {
      ctx.strokeStyle = "#e0705a";
      ctx.lineWidth = Math.max(1, cs * 0.08);
      ctx.beginPath();
      ctx.moveTo(x + cs * 0.3, y + cs * 0.62);
      ctx.lineTo(x + cs * 0.5, y + cs * 0.3);
      ctx.lineTo(x + cs * 0.7, y + cs * 0.62);
      ctx.stroke();
    }
  }
}

/** Visible food piles: stored food drawn as growing mounds in chamber cells. */
function drawStorage(ctx: CanvasRenderingContext2D, world: World, cs: number): void {
  let remaining = world.colonies[0].food;
  if (remaining <= 0) return;
  for (let i = 0; i < world.grid.length && remaining > 0; i++) {
    if (world.grid[i] !== "chamber") continue;
    if (i === world.colonies[0].queenCell) continue; // leave room for the queen
    const perCell = world.rooms[i] === ROOM_CODES.granary ? STORAGE_PER_CELL * 2 : STORAGE_PER_CELL;
    const here = Math.min(perCell, remaining);
    remaining -= here;
    const ratio = here / perCell;
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * cs;
    const baseY = row * cs + cs;
    // Up to three rows of little amber grains, filling bottom-up.
    const grains = Math.ceil(ratio * 6);
    ctx.fillStyle = "#f0b94a";
    for (let g = 0; g < grains; g++) {
      const gx = x + (g % 3) * cs * 0.3 + cs * 0.12;
      const gy = baseY - Math.floor(g / 3) * cs * 0.26 - cs * 0.24;
      ctx.fillRect(gx, gy, cs * 0.22, cs * 0.2);
    }
  }
}

function drawCacheFlashes(ctx: CanvasRenderingContext2D, world: World, cs: number): void {
  for (const f of world.cacheFlashes) {
    const col = f.cell % COLS;
    const row = Math.floor(f.cell / COLS);
    const cx = (col + 0.5) * cs;
    const cy = (row + 0.5) * cs;
    const t = Math.max(0, Math.min(1, f.ttl / 1.3));
    ctx.strokeStyle = `rgba(255,220,120,${t})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, (1 - t) * cs * 1.4 + cs * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    // little sparkle cross
    ctx.fillStyle = `rgba(255,240,180,${t})`;
    ctx.fillRect(cx - cs * 0.06, cy - cs * 0.3, cs * 0.12, cs * 0.6);
    ctx.fillRect(cx - cs * 0.3, cy - cs * 0.06, cs * 0.6, cs * 0.12);
  }
}

function drawPheromone(ctx: CanvasRenderingContext2D, world: World, cs: number): void {
  const p = world.pheromone;
  for (let i = 0; i < p.length; i++) {
    const v = p[i];
    if (v < 0.12) continue;
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    ctx.fillStyle = `rgba(240,180,70,${Math.min(0.35, v * 0.09)})`;
    ctx.fillRect(col * cs, row * cs, cs, cs);
  }
}

function drawFood(ctx: CanvasRenderingContext2D, world: World, cs: number): void {
  for (const f of world.foods) {
    const x = f.col * cs;
    const y = (SURFACE_ROW + 0.5) * cs;
    const n = Math.min(5, Math.ceil(f.amount / 2));
    ctx.fillStyle = "#e9a93a";
    for (let k = 0; k < n; k++) {
      const ox = ((k % 3) - 1) * cs * 0.28;
      const oy = -Math.floor(k / 3) * cs * 0.3;
      ctx.fillRect(x + ox, y + oy - cs * 0.2, cs * 0.24, cs * 0.24);
    }
  }
}

function drawDigJobs(ctx: CanvasRenderingContext2D, world: World, cs: number): void {
  for (const j of world.digJobs) {
    const col = j.cell % COLS;
    const row = Math.floor(j.cell / COLS);
    const x = col * cs;
    const y = row * cs;
    ctx.strokeStyle = "rgba(245,210,120,0.8)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1.5, y + 1.5, cs - 3, cs - 3);
    // Progress fills from the bottom up.
    const h = (cs - 4) * j.progress;
    ctx.fillStyle = "rgba(245,210,120,0.28)";
    ctx.fillRect(x + 2, y + (cs - 2) - h, cs - 4, h);
  }
}

function drawAnt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: number,
  color: string,
  wiggle: number,
  carrying: boolean,
  scale: number,
): void {
  const s = scale;
  const f = facing;
  // Body: abdomen, thorax, head along the facing direction.
  ctx.fillStyle = color;
  ctx.fillRect(x - f * s * 0.5 - s * 0.18, y - s * 0.18, s * 0.36, s * 0.36); // abdomen
  ctx.fillRect(x - s * 0.16, y - s * 0.14, s * 0.32, s * 0.28); // thorax
  ctx.fillStyle = "#241006";
  ctx.fillRect(x + f * s * 0.34, y - s * 0.13, s * 0.26, s * 0.26); // head
  // Legs (tiny wiggle).
  const lw = Math.sin(wiggle) * s * 0.12;
  ctx.strokeStyle = "#1a0d04";
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.1, y);
  ctx.lineTo(x - s * 0.1, y + s * 0.4 + lw);
  ctx.moveTo(x + s * 0.1, y);
  ctx.lineTo(x + s * 0.1, y + s * 0.4 - lw);
  ctx.stroke();
  if (carrying) {
    ctx.fillStyle = "#f0c14b";
    ctx.fillRect(x + f * s * 0.45, y - s * 0.5, s * 0.3, s * 0.3);
  }
}

function drawQueen(ctx: CanvasRenderingContext2D, world: World, cs: number): void {
  const colony = world.colonies[0];
  const x = (colony.queenCol + 0.5) * cs;
  const y = (colony.queenRow + 0.5) * cs;
  ctx.fillStyle = "#7a3fa0";
  ctx.fillRect(x - cs * 0.5, y - cs * 0.3, cs * 0.9, cs * 0.6); // long abdomen
  ctx.fillStyle = "#9a55c8";
  ctx.fillRect(x - cs * 0.1, y - cs * 0.25, cs * 0.4, cs * 0.5);
  ctx.fillStyle = "#241006";
  ctx.fillRect(x + cs * 0.3, y - cs * 0.2, cs * 0.3, cs * 0.4); // head
  // Crown marking.
  ctx.fillStyle = "#ffd35a";
  ctx.fillRect(x + cs * 0.36, y - cs * 0.42, cs * 0.18, cs * 0.18);
}

function drawSpider(ctx: CanvasRenderingContext2D, world: World, cs: number): void {
  const s = world.spider;
  if (!s) return;
  const x = s.pos.x * cs;
  const y = s.pos.y * cs;
  ctx.strokeStyle = "#1a0f0f";
  ctx.lineWidth = Math.max(1, cs * 0.08);
  for (let i = 0; i < 4; i++) {
    const a = 0.4 + i * 0.25;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - cs * a, y - cs * 0.4);
    ctx.moveTo(x, y);
    ctx.lineTo(x + cs * a, y - cs * 0.4);
    ctx.stroke();
  }
  ctx.fillStyle = "#241414";
  ctx.beginPath();
  ctx.arc(x, y, cs * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d6452f";
  ctx.fillRect(x - cs * 0.18, y - cs * 0.1, cs * 0.12, cs * 0.12);
  ctx.fillRect(x + cs * 0.06, y - cs * 0.1, cs * 0.12, cs * 0.12);
  // Health pip.
  const hp = Math.max(0, s.hp);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(x - cs * 0.6, y - cs * 1.1, cs * 1.2, cs * 0.18);
  ctx.fillStyle = "#d6452f";
  ctx.fillRect(x - cs * 0.6, y - cs * 1.1, cs * 1.2 * (hp / 9), cs * 0.18);
}

function drawRain(ctx: CanvasRenderingContext2D, world: World, cs: number): void {
  if (world.weather !== "rain") return;
  const w = COLS * cs;
  const h = ROWS * cs;
  ctx.fillStyle = "rgba(20,30,60,0.18)";
  ctx.fillRect(0, 0, w, GROUND_ROW * cs);
  ctx.strokeStyle = "rgba(180,205,255,0.5)";
  ctx.lineWidth = 1;
  const t = world.time * 14;
  for (let i = 0; i < 60; i++) {
    const sx = (i * 53 + (t % 100)) % w;
    const sy = (i * 89 + t * 3) % (GROUND_ROW * cs);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - cs * 0.3, sy + cs * 0.8);
    ctx.stroke();
  }
  void h;
}

export interface DrawOpts {
  hover?: { col: number; row: number; valid: boolean } | null;
}

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  world: World,
  cs: number,
  opts: DrawOpts = {},
): void {
  const light = daylight(world);
  drawSky(ctx, world, cs, light);
  drawGround(ctx, cs);
  drawTunnels(ctx, world, cs);
  drawRooms(ctx, world, cs);
  drawPheromone(ctx, world, cs);
  drawDigJobs(ctx, world, cs);
  drawStorage(ctx, world, cs);
  drawFood(ctx, world, cs);
  drawQueen(ctx, world, cs);

  // Ants.
  for (const ant of world.ants as Ant[]) {
    drawAnt(
      ctx,
      ant.pos.x * cs,
      ant.pos.y * cs,
      ant.facing,
      ROLE_COLOR[ant.role] ?? "#d98a2b",
      ant.wiggle,
      ant.carrying > 0,
      cs * 0.95,
    );
  }

  drawCacheFlashes(ctx, world, cs);
  drawSpider(ctx, world, cs);
  drawRain(ctx, world, cs);

  // Hover highlight for the dig tool.
  if (opts.hover) {
    const { col, row, valid } = opts.hover;
    ctx.strokeStyle = valid ? "rgba(120,255,160,0.9)" : "rgba(255,120,120,0.7)";
    ctx.lineWidth = 2;
    ctx.strokeRect(col * cs + 1, row * cs + 1, cs - 2, cs - 2);
  }

  // Night veil over the whole scene for mood.
  if (light < 1) {
    ctx.fillStyle = `rgba(8,12,30,${(1 - light) * 0.28})`;
    ctx.fillRect(0, 0, COLS * cs, ROWS * cs);
  }
}

export { ROLE_COLOR };
