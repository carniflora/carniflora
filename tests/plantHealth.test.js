import { describe, it, expect } from "vitest";
import {
  healthColor,
  isCritical,
  advancePlantFx,
  HIT_SHAKE,
  HIT_SHAKE_PX,
  HEALTH_BAR_W,
  HEALTH_BAR_H,
  GHOST_HOLD,
  shakeOffset,
} from "../src/js/plantHealth.js";

// US 6.4 Part 2 — the plant-only health display (separately droppable).
// These are the pure, DOM-free helpers that back the renderer.
describe("US 6.4 Part 2 — plant health display logic", () => {
  it("uses a fixed 28x5 bar for plants", () => {
    expect(HEALTH_BAR_W).toBe(28);
    expect(HEALTH_BAR_H).toBe(5);
  });

  it("colours bars green above 50%, amber to 30%, red at 30% or less", () => {
    expect(healthColor(1)).toBe("#8fd45a"); // green
    expect(healthColor(0.51)).toBe("#8fd45a"); // still green
    expect(healthColor(0.5)).toBe("#e8b04a"); // 50% is amber, not green
    expect(healthColor(0.4)).toBe("#e8b04a"); // amber
    expect(healthColor(0.3)).toBe("#e05a4a"); // 30% is red
    expect(healthColor(0.05)).toBe("#e05a4a"); // red
    expect(healthColor(0)).toBe("#e05a4a"); // red
  });

  it("flags the low-health pulse ring at 30% or below", () => {
    expect(isCritical(0.3)).toBe(true);
    expect(isCritical(0.31)).toBe(false);
    expect(isCritical(0.05)).toBe(true);
  });

  it("holds lost health in a ghost that then shrinks back to the real value", () => {
    const p = { hp: 100 };
    advancePlantFx(p, 0);
    expect(p.ghost).toBe(100); // ghost initialised to full HP
    p.hp = 40; // lose 60 HP
    advancePlantFx(p, 0.1);
    expect(p.ghost).toBeGreaterThan(p.hp); // still showing the old reading
    advancePlantFx(p, 5); // enough time to ease away
    expect(p.ghost).toBe(p.hp); // ghost has shrunk to real HP
  });

  it("holds a fresh loss for GHOST_HOLD before the ghost starts shrinking", () => {
    const p = { hp: 100 };
    advancePlantFx(p, 0); // ghost initialised at full HP
    p.hp = 40; // lose 60 HP
    advancePlantFx(p, 0.05); // hit frame: hold is armed
    expect(p.ghostHold).toBeGreaterThan(0);
    const held = p.ghost;
    // no shrink while inside the hold...
    advancePlantFx(p, GHOST_HOLD - 0.1);
    expect(p.ghost).toBe(held);
    // ...then it eases down.
    advancePlantFx(p, 0.2);
    expect(p.ghost).toBeLessThan(held);
  });

  // Repeat-hit rule: a fresh or deepening loss re-arms the hold. When a second
  // hit lands after the first ghost has fully shrunk back to hp, the ghost
  // shows the pre-hit reading again and stays above hp for a full GHOST_HOLD
  // before shrinking; it is NOT shrunk immediately (ghostHold is no longer 0).
  it("re-arms the ghost hold on a second hit after the first ghost fully shrank", () => {
    const p = { hp: 100 };
    advancePlantFx(p, 0); // ghost = 100
    p.hp = 90; // first hit
    advancePlantFx(p, 0.05); // hold armed
    // let the first ghost fully shrink back to hp
    advancePlantFx(p, GHOST_HOLD + 1);
    advancePlantFx(p, 1);
    expect(p.ghost).toBe(90); // ghost caught up; hold cleared

    p.hp = 70; // second hit after the first ghost has fully shrunk
    advancePlantFx(p, 0.05);
    const rearmed = p.ghost;
    expect(p.ghost).toBe(90); // white chip shown again at the old reading
    expect(p.ghost).toBeGreaterThan(p.hp);
    expect(p.ghostHold).toBeGreaterThan(0); // hold re-armed, not 0

    // ghost stays above hp for GHOST_HOLD, then shrinks
    advancePlantFx(p, GHOST_HOLD - 0.1); // inside the re-armed hold
    expect(p.ghost).toBe(rearmed); // no shrink yet
    advancePlantFx(p, 0.2); // hold now expired
    expect(p.ghost).toBeLessThan(rearmed); // shrinking toward hp
    expect(p.ghost).toBeGreaterThanOrEqual(p.hp);
  });

  it("snaps the ghost up when healed so a recovering plant shows no white chip", () => {
    const p = { hp: 100 };
    advancePlantFx(p, 0);
    advancePlantFx(p, 5);
    p.hp = 130; // healed above the old reading
    advancePlantFx(p, 0.1);
    expect(p.ghost).toBe(130);
  });

  it("decays a hit shake on its own timer", () => {
    const p = { hp: 100 };
    advancePlantFx(p, 0); // initialise transient timers
    p.shake = HIT_SHAKE;
    expect(p.shake).toBeGreaterThan(0);
    advancePlantFx(p, HIT_SHAKE + 0.1);
    expect(p.shake).toBe(0);
  });

  // The magnitude is pinned with a controllable random source so exact offsets
  // are testable: full timer => ±HIT_SHAKE_PX, half => ±HIT_SHAKE_PX/2, zero => 0.
  it("pins the shake magnitude with a controllable random source", () => {
    const max = HIT_SHAKE_PX; // 3px
    const full = { shake: HIT_SHAKE };
    const half = { shake: HIT_SHAKE / 2 };
    const none = { shake: 0 };
    // full strength: the extremes are exactly ±HIT_SHAKE_PX
    expect(shakeOffset(full, false, () => 1)).toBeCloseTo(max, 6);
    expect(shakeOffset(full, false, () => 0)).toBeCloseTo(-max, 6);
    expect(shakeOffset(full, false, () => 0.5)).toBe(0); // mid random is centred
    // half the timer fades linearly toward the cap
    expect(shakeOffset(half, false, () => 1)).toBeCloseTo(max / 2, 6);
    expect(shakeOffset(half, false, () => 0)).toBeCloseTo(-max / 2, 6);
    // a never-shaking plant never moves
    expect(shakeOffset(none, false, () => 1)).toBe(0);
    expect(shakeOffset(none, false, () => 0.5)).toBe(0);
  });

  // Upper limit is exactly HIT_SHAKE_PX at a full hit; an over-driven timer is
  // clamped so it can never exceed the cap in either direction.
  it("caps the magnitude at HIT_SHAKE_PX (timer ratio clamped to [0,1])", () => {
    const over = { shake: HIT_SHAKE * 10 }; // a timer far past its own limit
    expect(shakeOffset(over, false, () => 1)).toBeCloseTo(HIT_SHAKE_PX, 6);
    expect(shakeOffset(over, false, () => 0)).toBeCloseTo(-HIT_SHAKE_PX, 6);
    // no random draw can exceed the cap in magnitude
    for (let i = 0; i < 300; i++) {
      const o = shakeOffset(over, false, () => Math.random());
      expect(Math.abs(o)).toBeLessThanOrEqual(HIT_SHAKE_PX + 1e-9);
    }
  });

  it("returns 0 for reduced motion, or missing / zero / negative shake", () => {
    expect(shakeOffset({ shake: 1 }, true, () => 1)).toBe(0); // reduced motion
    expect(shakeOffset({}, false, () => 1)).toBe(0); // shake missing
    expect(shakeOffset({ shake: 0 }, false, () => 1)).toBe(0); // zero
    expect(shakeOffset({ shake: -5 }, false, () => 1)).toBe(0); // negative
    expect(shakeOffset({ shake: 2 }, true)).toBe(0); // reduced motion wins
  });
});
