// US 6.4 — the visual layer for damage-to-plants.
//
// This module does the canvas drawing only. The tunable timings, thresholds and
// colours live in the DOM/canvas-free modules (damageCue.js, plantHealth.js) so
// they stay unit-testable; here we just paint what those helpers decide. It is
// imported by both the normal battle renderer (ui/render.js) and the boss
// renderer (bossRenderer.js) so both modes share one look.
//
// Part 1 = the red tint + white outline flash (drawn when cue.flash > 0).
// Part 2 = the plant-only health bar with tiers + the "lost" white section, the
// low-health pulse ring, and the hit shake. Part 2 is separately droppable:
// deleting this module and the "US 6.4 Part 2" blocks in the renderers reverts
// to the original thin enemy-style bar (see healthBar()). Part 1 is kept.

import { FLASH_DURATION } from "./damageCue.js";
import {
  HEALTH_BAR_W,
  HEALTH_BAR_H,
  HEALTH_BAR_BORDER,
  healthColor,
  isCritical,
  shakeOffset,
  CRING_RADIUS,
  CRING_PERIOD,
} from "./plantHealth.js";

const TAU = Math.PI * 2;
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const FLASH_TINT_MAX = 0.6; // tint opacity at the start of a flash
// BUG 3 — shape-masked tint: recolour the plant's own sprite silhouette.
const FLASH_RED = "rgba(255,45,45,1)"; // red silhouette fill on the offscreen
const HALO_WHITE = "#ffffff"; // white halo silhouette fill on the offscreen
const FLASH_PAD = 4; // padding (px) around the sprite box on the offscreen
const HALO_SPREAD = 2; // halo silhouette drawn ~2px larger (dilated)
const SPRITE_SIZE_DEFAULT = 48; // sprite box size when the caller doesn't say
// 8-way neighbours + centre: dilates any silhouette by `spread` px.
const DILATE_OFFSETS = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

// prefers-reduced-motion, guarded so non-browser runtimes (and older engines)
// degrade to the animated default instead of throwing.
export function reducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return false;
  try {
    return window.matchMedia(REDUCED_QUERY).matches;
  } catch {
    return false;
  }
}

// Flash 1 -> 0 across the cue, so the renderer fades the tint + outline out.
function flashAlpha(cue) {
  return cue && cue.flash > 0 ? cue.flash / FLASH_DURATION : 0;
}

// Part 1 — a red tint + white outline over the plant's sprite when it is
// flashing. No-op when the plant is not flashing.
//
// BUG 3 — shape-masked tint: instead of a filled+outlined DISC over the plant,
// recolour the plant's OWN sprite silhouette. We render `tintDraw(ctx, x, y,
// size)` (the caller draws the sprite frame, or the fallback circle when the
// sprite hasn't loaded) onto a throwaway offscreen canvas, recolour it with
// globalCompositeOperation "source-in", and blit the result translucently so
// the face shows through. A SECOND offscreen buffer holds a slightly larger,
// white silhouette blitted first (behind) as an outline. Nothing touches the
// background and nothing covers the face. The offscreen mask never moves game
// state; `spriteY` shifts only where the flash is drawn (e.g. a bobbing boss).
//
// `spriteY` defaults to `y`. `spriteSize` is the sprite box (e.g. 48 + pad).
// `tintDraw` is optional; without it a filled circle of `radius` is masked.
// DOM/canvas-safe: if document.createElement / getContext("2d") is unavailable
// (headless), fall back to drawing the shape flat (red fill + white outline of
// its bounding circle) so unit tests without a canvas still work.
export function drawDamageCue(
  ctx,
  x,
  y,
  radius,
  cue,
  tintDraw,
  spriteY,
  spriteSize,
) {
  const a = flashAlpha(cue);
  if (!(a > 0)) return;

  const cy = spriteY ?? y;
  const size = spriteSize ?? SPRITE_SIZE_DEFAULT;
  const paint = tintDraw ?? flatCircleTint(radius); // shape source

  // Shape-masked silhouettes; null when no offscreen 2D canvas (headless).
  const halo = buildSilhouette(size, paint, HALO_WHITE, HALO_SPREAD);
  const core = buildSilhouette(size, paint, FLASH_RED, 0);

  ctx.save();
  if (halo && core) {
    // sprite top-left in ctx space; offscreen pad shifts the blit outward.
    const dx = x - size / 2 - FLASH_PAD;
    const dy = cy - size / 2 - FLASH_PAD;
    const box = size + FLASH_PAD * 2;
    ctx.globalAlpha = a; // white halo, behind
    ctx.drawImage(
      halo.canvas,
      dx - halo.spread,
      dy - halo.spread,
      box + halo.spread * 2,
      box + halo.spread * 2,
    );
    ctx.globalAlpha = a * FLASH_TINT_MAX; // translucent red tint, face shows
    ctx.drawImage(core.canvas, dx, dy, box, box);
  } else {
    // Headless: no offscreen canvas — draw the shape flat on `ctx`.
    ctx.globalAlpha = a * FLASH_TINT_MAX;
    ctx.fillStyle = FLASH_RED; // red fill of the shape
    ctx.beginPath();
    ctx.arc(x, cy, radius, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = a;
    ctx.strokeStyle = HALO_WHITE; // white outline of the shape bounding circle
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, cy, radius + 1, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

// Circle shape source (the fallback used before the sprite loads / no tintDraw).
function flatCircleTint(radius) {
  return (offCtx, x, y, size) => {
    offCtx.beginPath();
    offCtx.arc(x + size / 2, y + size / 2, radius, 0, TAU);
    offCtx.fill();
  };
}

// Build one throwaway silhouette buffer recoloured `color`. `spread` dilates
// the silhouette outward by that many px (the white halo). Returns null when no
// offscreen 2D canvas is available (headless), so the caller draws flat.
function buildSilhouette(size, paint, color, spread) {
  const pad = FLASH_PAD + spread; // room for padding + dilation
  const box = size + pad * 2;
  const off = makeOffscreenCanvas(box);
  if (!off) return null;

  // Draw the shape (sprite frame or fallback circle); `paint(ctx, x, y, size)`.
  if (spread > 0) {
    for (const [dx, dy] of DILATE_OFFSETS)
      paint(off.ctx, pad + dx * spread, pad + dy * spread, size);
  } else {
    paint(off.ctx, pad, pad, size);
  }

  // Recolour only the painted pixels; background stays transparent.
  off.ctx.globalCompositeOperation = "source-in";
  off.ctx.fillStyle = color;
  off.ctx.fillRect(0, 0, box, box);
  return { canvas: off.canvas, ctx: off.ctx, spread };
}

// Small throwaway 2D canvas; null when document/canvas is unavailable.
function makeOffscreenCanvas(size) {
  if (
    typeof document === "undefined" ||
    typeof document.createElement !== "function"
  )
    return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const cctx =
      typeof canvas.getContext === "function" ? canvas.getContext("2d") : null;
    return cctx ? { canvas, ctx: cctx } : null;
  } catch {
    return null;
  }
}

// Part 2 — a slow pulse ring beneath a plant while it is at or below the
// low-health threshold. Under prefers-reduced-motion it is a still ring.
export function drawCriticalRing(ctx, x, baseY, radius, reduced, now) {
  const breathe = reduced
    ? 1.5 // still ring: a fixed, gentle ring under reduced motion
    : 0.5 + 0.5 * Math.sin((now / 1000) * (TAU / CRING_PERIOD));
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = "#ff5a4a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(
    x,
    baseY,
    radius + CRING_RADIUS + breathe * 3,
    CRING_RADIUS + 2,
    0,
    0,
    TAU,
  );
  ctx.stroke();
  ctx.restore();
}

// Part 2 — the plant-only health bar: fixed 28x5, green/amber/red by remaining
// fraction, with a white "lost" section (the ghost) that sits behind the real
// fill and a 1px dark border around the whole bar. Enemy bars are untouched.
export function drawPlantHealthBar(ctx, x, topY, plant, k) {
  const w = HEALTH_BAR_W;
  const h = HEALTH_BAR_H;
  const left = x - w / 2;
  const frac = Math.max(0, Math.min(1, plant.hp / k.hp));
  const ghostFrac = Math.max(0, Math.min(1, (plant.ghost ?? plant.hp) / k.hp));

  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.fillRect(left, topY, w, h);
  if (ghostFrac > frac) {
    ctx.fillStyle = "rgba(255,255,255,.85)"; // white "lost" section
    ctx.fillRect(left, topY, w * ghostFrac, h);
  }
  ctx.fillStyle = healthColor(frac);
  ctx.fillRect(left, topY, w * frac, h);
  // 1px dark border just outside the bar so touching bars read as separate.
  ctx.strokeStyle = HEALTH_BAR_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(left - 0.5, topY - 0.5, w + 1, h + 1);
}

// Draw a plant with its US 6.4 visuals. Everything except the sprite itself is
// positioned in fixed UI space; hit shake only jitters the sprite + flash.
//
//    sprite: the existing drawPlant call the caller supplies (returns true when
//     a sprite is drawn). We draw the flash overlay over it, then translate the
//     bar + ring back to the un-shaken sprite centre.
//
// Returns the horizontal shake offset used, so the caller knows where the bar
// actually landed if it wants the icons to follow.
//
// BUG 3 — options: `tintDraw(ctx, x, y, size)` draws the sprite silhouette for
// the shape-masked flash; `spriteSize` is the sprite box (default 48); optional
// `spriteY` is the sprite's drawn centre-y for the flash position (default
// plant.y; e.g. a bobbing boss passes its bobbed y). Draw-only; never moves
// game logic.
export function drawPlantWithFx(
  ctx,
  plant,
  k,
  spriteTopY,
  reducedNow,
  now,
  { drawSprite, tintDraw, spriteSize, spriteY },
  spriteYArg,
) {
  // Shape radius field differs by mode: normal kinds use `radius`, boss kinds `r`.
  const r = k.radius ?? k.r;
  // `spriteY` may be passed inside options or as a trailing argument.
  const flashY = spriteY ?? spriteYArg ?? plant.y;
  const off = shakeOffset(plant, reducedNow); // Part 2 shake, draw-only
  ctx.save();
  ctx.translate(off, 0);
  drawSprite(ctx, plant, now);
  drawDamageCue(
    ctx,
    plant.x,
    plant.y,
    r,
    plant.cue,
    tintDraw,
    flashY,
    spriteSize,
  ); // Part 1
  ctx.restore();
  // Part 2 — ring under + health bar above, in un-shaken UI space.
  // BUG 2: the low-health ring shows only at 30% health or below.
  if (plantIsCritical(plant, k)) {
    drawCriticalRing(ctx, plant.x, plant.y + r + 3, r, reducedNow, now);
  }
  drawPlantHealthBar(ctx, plant.x, spriteTopY, plant, k);
  return off;
}

// Convenience: whether a plant is currently low on health (ring should show).
export function plantIsCritical(plant, k) {
  return isCritical(plant.hp / k.hp);
}
