import { describe, it, expect } from "vitest";
import {
  healthColor,
  isCritical,
  advancePlantFx,
  HIT_SHAKE,
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

  it("returns no shake under reduced motion or when the plant is not shaking", () => {
    expect(shakeOffset({ shake: 1 }, true)).toBe(0);
    expect(shakeOffset({ shake: 0 }, false)).toBe(0);
    expect(shakeOffset({ shake: 0.5 }, false)).toBeLessThanOrEqual(3);
  });
});
