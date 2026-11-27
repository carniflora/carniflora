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
  healthColor,
  isCritical,
  shakeOffset,
  CRING_RADIUS,
  CRING_PERIOD,
} from "./plantHealth.js";

const TAU = Math.PI * 2;
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const FLASH_OUTLINE_MAX = 4; // outline width at the start of a flash (px)
const FLASH_TINT_MAX = 0.6; // tint opacity at the start of a flash

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
export function drawDamageCue(ctx, x, y, radius, cue) {
  const a = flashAlpha(cue);
  if (!(a > 0)) return;
  ctx.save();
  ctx.globalAlpha = a * FLASH_TINT_MAX;
  ctx.fillStyle = "#ff2d00";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = a;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = a * FLASH_OUTLINE_MAX + 1;
  ctx.beginPath();
  ctx.arc(x, y, radius + 1, 0, TAU);
  ctx.stroke();
  ctx.restore();
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

// Part 2 — the plant-only health bar: fixed 32x6, green/amber/red by remaining
// fraction, with a white "lost" section (the ghost) that sits behind the real
// fill. Enemy bars are untouched.
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
export function drawPlantWithFx(
  ctx,
  plant,
  k,
  spriteTopY,
  reducedNow,
  now,
  { drawSprite },
) {
  const off = shakeOffset(plant, reducedNow); // Part 2 shake, draw-only
  ctx.save();
  ctx.translate(off, 0);
  drawSprite(ctx, plant, now);
  drawDamageCue(ctx, plant.x, plant.y, k.radius, plant.cue); // Part 1
  ctx.restore();
  // Part 2 — ring under + health bar above, in un-shaken UI space.
  drawCriticalRing(
    ctx,
    plant.x,
    plant.y + k.radius + 3,
    k.radius,
    reducedNow,
    now,
  );
  drawPlantHealthBar(ctx, plant.x, spriteTopY, plant, k);
  return off;
}

// Convenience: whether a plant is currently low on health (ring should show).
export function plantIsCritical(plant, k) {
  return isCritical(plant.hp / k.hp);
}
