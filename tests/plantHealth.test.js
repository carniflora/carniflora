import { describe, it, expect } from "vitest";
import {
  healthColor,
  isCritical,
  advancePlantFx,
  HIT_SHAKE,
  HEALTH_BAR_W,
  HEALTH_BAR_H,
  shakeOffset,
} from "../src/js/plantHealth.js";

// US 6.4 Part 2 — the plant-only health display (separately droppable).
// These are the pure, DOM-free helpers that back the renderer.
describe("US 6.4 Part 2 — plant health display logic", () => {
  it("uses a fixed 32x6 bar for plants", () => {
    expect(HEALTH_BAR_W).toBe(32);
    expect(HEALTH_BAR_H).toBe(6);
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
