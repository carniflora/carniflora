import { describe, it, expect } from "vitest";
import {
  noteDamage,
  advanceCue,
  FLASH_DURATION,
  FLASH_MIN_GAP,
} from "../src/js/damageCue.js";

// A throwaway plant-like object carrying only the fields the cue engine
// reads or writes, so these tests stay DOM/canvas free.
function plant(hp = 100) {
  return { hp };
}

describe("US 6.4 — damage-cue timing (Part 1)", () => {
  it("starts a red flash on a direct hit when health is lost", () => {
    const p = plant(100);
    const before = p.hp;
    p.hp -= 10; // a direct hit lost 10 HP
    const started = noteDamage(p, before - p.hp);
    expect(started).toBe(true);
    expect(p.cue.flash).toBe(FLASH_DURATION);
    expect(p.cue.cd).toBe(FLASH_MIN_GAP);
  });

  it("does not flash when no health is lost", () => {
    const p = plant(100);
    expect(noteDamage(p, 0)).toBe(false); // zero-loss hit
    expect(noteDamage(p, -5)).toBe(false); // a heal is not damage
    expect(p.cue).toBeUndefined(); // no cue state was created
  });

  it("does not stack or refresh a repeat hit inside the 0.4s gap", () => {
    const p = plant(100);
    noteDamage(p, 10); // start #1
    const firstFlash = p.cue.flash;
    advanceCue(p, 0.2); // still inside the gap
    expect(noteDamage(p, 10)).toBe(false); // blocked — no stack
    expect(p.cue.flash).toBeCloseTo(firstFlash - 0.2, 5); // timer not extended
    expect(p.cue.cd).toBeLessThan(FLASH_MIN_GAP); // gap keeps counting down
  });

  it("allows a new flash once 0.4s have passed", () => {
    const p = plant(100);
    noteDamage(p, 10); // start #1 at t=0
    advanceCue(p, 0.2); // t=0.2, still inside the gap
    expect(noteDamage(p, 10)).toBe(false); // blocked before 0.4s
    advanceCue(p, 0.3); // t=0.5, past the 0.4s gap
    expect(noteDamage(p, 10)).toBe(true); // start #2
    expect(p.cue.flash).toBe(FLASH_DURATION);
  });

  it("lets the flash timer expire after its duration", () => {
    const p = plant(100);
    noteDamage(p, 10);
    advanceCue(p, FLASH_DURATION - 0.01);
    expect(p.cue.flash).toBeGreaterThan(0);
    advanceCue(p, 0.011); // just past zero to avoid float epsilon
    expect(p.cue.flash).toBe(0);
  });

  it("pulses continuous damage at the limited rate, not every frame", () => {
    const p = plant(1000);
    const step = 0.05;
    const horizon = 1.3; // long enough for four pulses
    const starts = [];
    for (let t = 0; t < horizon; t += step) {
      const before = p.hp;
      p.hp -= 3; // continuous drain every frame
      if (noteDamage(p, before - p.hp)) starts.push(t);
      advanceCue(p, step);
    }
    expect(starts.length).toBeGreaterThanOrEqual(3);
    expect(starts.length).toBeLessThanOrEqual(4); // roughly every 0.4s
    expect(starts.length).toBeLessThan(horizon / step); // far fewer than frames
    for (let i = 1; i < starts.length; i++) {
      // consecutive starts are at least ~0.4s apart — no frame-by-frame pulses
      expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(0.39);
    }
  });

  it("never creates cue state for a plant that has not lost health", () => {
    const p = plant(100);
    advanceCue(p, 0.05);
    expect(p.cue).toBeUndefined();
  });

  it("reuses a cue object restored from a snapshot without error or stacking", () => {
    // A fresh client applies a plant whose cue arrived mid-flight in a snapshot.
    const p = { hp: 100, cue: { flash: 0.2, cd: 0.3 } };
    noteDamage(p, 10); // must not throw on a restored cue
    expect(noteDamage(p, 10)).toBe(false); // on cooldown → no stack, no refresh
    expect(p.cue.flash).toBe(0.2);
    advanceCue(p, 0.4); // flash fades, cooldown clears
    expect(p.cue.flash).toBe(0);
    expect(p.cue.cd).toBe(0);
  });
});
