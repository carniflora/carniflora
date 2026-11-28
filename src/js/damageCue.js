// US 6.4 — damage cue (Part 1): when a plant loses health, mark it so the
// renderer can flash a red tint + white outline for a moment.
//
// This is pure simulation logic: no DOM, no canvas, no timing source of its
// own. It is shared by the normal battle (combat.js) and the boss battle
// (bossLevel.js). Every cue field is carried on the plant object itself, so
// the authoritative snapshot already syncs the cue to online players for free.

// How long a hit's red flash + white outline stays visible.
export const FLASH_DURATION = 0.3;
// How far two flashes on the same plant must be spaced apart. This same gap
// throttles continuous damage (mist, herbicide) to pulses rather than a
// per-frame flash.
export const FLASH_MIN_GAP = 0.4;

// Ensure a plant carries cue state. Idempotent: safe to call on a freshly
// created plant and on a plant restored from a snapshot.
export function initCue(plant) {
  const cue = plant.cue ?? (plant.cue = {});
  cue.flash = cue.flash ?? 0;
  cue.cd = cue.cd ?? 0;
  return cue;
}

// Advance a plant's cue timers by dt seconds. A no-op for a plant that has
// never lost health, so undamaged plants stay free of cue state.
export function advanceCue(plant, dt) {
  const cue = plant.cue;
  if (!cue) return;
  cue.flash = Math.max(0, cue.flash - dt);
  cue.cd = Math.max(0, cue.cd - dt);
}

// Register that a plant lost hpLost HP.
//
// Returns true when a fresh flash started. The rules:
//   - no health lost (hpLost <= 0) never flashes — a zero-damage hit or a heal
//     is not a cue;
//   - a hit inside FLASH_MIN_GAP of the previous start neither stacks a second
//     flash nor refreshes the current one, so repeat hits cannot pile up;
//   - continuous callers (mist, herbicide) are throttled to one flash per gap,
//     turning a per-frame drain into a steady pulse.
//
// Health itself is always applied by the caller before this runs; the cue is
// only a visual overlay and never changes how much is lost.
export function noteDamage(plant, hpLost) {
  if (!(hpLost > 0)) return false;
  const cue = initCue(plant);
  if (cue.cd > 0) return false;
  cue.flash = FLASH_DURATION;
  cue.cd = FLASH_MIN_GAP;
  return true;
}
