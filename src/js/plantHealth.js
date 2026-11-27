// US 6.4 — plant health display (Part 2), separately droppable from Part 1.
//
// Pure, DOM/canvas-free helpers that back the renderer with the plant-only
// health bar, its colour tiers, the "lost health" ghost section, the low-health
// pulse ring and the hit shake. Enemy bars and Part 1's flash are untouched.
//
// The renderer consumes these; removing Part 2 means deleting this module and
// the clearly-marked "US 6.4 Part 2" blocks in the renderers and the sim
// advance calls.

// Plant-only bar size.
export const HEALTH_BAR_W = 28;
export const HEALTH_BAR_H = 5;

// 1px dark border around the bar so two touching bars read as separate.
export const HEALTH_BAR_BORDER = "#0b1710";

// Colours: green above 50%, amber from 30% up to 50%, red at 30% or below.
// The green matches the plant definition colour so it reads as full health.
export const HEALTH_COLOR_HIGH = "#8fd45a";
export const HEALTH_COLOR_MID = "#e8b04a";
export const HEALTH_COLOR_LOW = "#e05a4a";

// Tier thresholds. "green above 50%" excludes 50%; "amber up to 50%" includes
// it, so 0.5 is amber.
export const HEALTH_HIGH = 0.5;
// Ring + red threshold: 30% or below.
export const HEALTH_LOW = 0.3;

// A lost-HP ghost holds for this long, then eases back to the real reading.
export const GHOST_HOLD = 0.25;
// How quickly the ghost value shrinks toward the real hp once the hold ends.
// Fast enough that a lost-HP chip fades within the same second it was lost.
export const GHOST_EASE = 100;
// How long a hit shake lasts before it settles.
export const HIT_SHAKE = 0.22;
// The pulse ring's gentle radius breathing when a plant is low on health.
export const CRING_RADIUS = 3;
// Slow pulse period in seconds (renderers pass `now` in ms; the ring uses
// (now/1000) * (TAU / CRING_PERIOD), i.e. one full pulse per CRING_PERIOD s).
export const CRING_PERIOD = 2.4;

// Colour for a bar given the fraction of health remaining (0..1).
export function healthColor(ratio) {
  if (ratio > HEALTH_HIGH) return HEALTH_COLOR_HIGH; // >50% green
  if (ratio > HEALTH_LOW) return HEALTH_COLOR_MID; // 30%-50% amber
  return HEALTH_COLOR_LOW; // <=30% red
}

// True when a plant is at or below the low-health threshold: the renderer shows
// a slow pulse ring under it (a still ring under prefers-reduced-motion).
export function isCritical(ratio) {
  return ratio <= HEALTH_LOW;
}

// Advance a plant's transient Part 2 timers by dt. Both are carried on the
// plant so an applied snapshot restores them for online players.
//
//   - ghost: the last displayed reading. It holds the old (higher) value after
//     a hit, then shrinks toward the real hp, giving the white "lost" chip.
//     A heal snaps it up so a recovering plant shows no white section.
//   - shake: a hit shake timer the renderer decays into a ±3px jitter.
//   - prevHp: last frame's hp, kept so a fresh or deepening loss is detected.
//
// Repeat-hit rule: when hp < ghost AND hp < prevHp this frame (a fresh or
// deepening loss), ghostHold is re-armed to GHOST_HOLD — even if a previous
// ghost already fully shrank — so every new hit gets its own hold before the
// ghost shrinks. Otherwise ghostHold counts down by dt; once ghostHold <= 0
// the ghost eases down by GHOST_EASE*dt toward hp. Healing or catching up
// snaps the ghost up and clears the hold.
export function advancePlantFx(plant, dt) {
  const hp = plant.hp;
  if (plant.ghost === undefined) plant.ghost = hp;
  const prevHp = plant.prevHp ?? hp;
  if (hp >= plant.ghost) {
    plant.ghost = hp; // healed or caught up — snap up, no white chip
    plant.ghostHold = 0;
  } else {
    // still showing the old, higher reading...
    if (hp < prevHp) {
      plant.ghostHold = GHOST_HOLD; // fresh/deepening loss re-arms the hold
    } else {
      plant.ghostHold = (plant.ghostHold ?? GHOST_HOLD) - dt;
    }
    // ...hold it, then ease it down once the hold ends.
    if (plant.ghostHold <= 0) {
      plant.ghost = Math.max(hp, plant.ghost - GHOST_EASE * dt);
      plant.ghostHold = 0;
    }
  }
  plant.prevHp = hp; // remember for next frame's deepening-loss check

  if (plant.shake > 0) plant.shake = Math.max(0, plant.shake - dt);
}

// Start a hit shake. Called only when a damage cue starts (noteDamage true), so
// a plant shakes on a real hit and not on every frame of continuous damage.
export function hitShake(plant) {
  plant.shake = HIT_SHAKE;
}

// How far a hit jitters the *drawing* (px, per direction). The plant never moves
// in the game logic; this only offsets the canvas draw.
export const HIT_SHAKE_PX = 3;

// Draw-only jitter for a hit: 0 when the plant is not shaking or when the user
// has asked for reduced motion, otherwise a small decaying offset in the range
// [-HIT_SHAKE_PX, +HIT_SHAKE_PX]. Kept out of the sim so a hit never nudges a
// plant's real position.
export function shakeOffset(plant, reduced) {
  if (reduced || plant.shake <= 0) return 0;
  return (Math.random() - 0.5) * 2 * plant.shake * HIT_SHAKE_PX;
}
