import { describe, test, expect, beforeEach } from "vitest";
import { effects, RNG, EVENTS } from "../src/effects.js";
import { state } from "../src/game.js";

// EPIC 4 — Random Buffs & Debuffs. Covers US 4.1/4.2/4.3/4.5/4.6.
// game.js/state import is side-effect free (no DOM access at import time),
// so tests run under node/vitest without a browser.

describe("EPIC 4 — seeded RNG (US 4.6)", () => {
  test("same seed produces the same sequence", () => {
    const a = new RNG(42);
    const b = new RNG(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  test("different seeds produce different sequences", () => {
    const a = new RNG(42);
    const b = new RNG(43);
    expect(a.next()).not.toBe(b.next());
  });

  test("values are within [0,1)", () => {
    const r = new RNG(7);
    for (let i = 0; i < 100; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("US 4.1 — a random buff/debuff can occur", () => {
  beforeEach(() => effects.reset());

  test("fire() adds an active effect", () => {
    effects.fire(EVENTS[0]);
    expect(effects.active.length).toBe(1);
    expect(effects.active[0].event.id).toBe("empowered");
    expect(effects.history.length).toBe(1);
  });

  test("update() auto-fires after the interval (4.1)", () => {
    effects.reset();
    // advance past the 18s interval
    effects.update(18.01);
    expect(effects.active.length).toBeGreaterThan(0);
  });
});

describe("US 4.5 — buffs/debuffs affect gameplay (stat multiplications)", () => {
  beforeEach(() => effects.reset());

  test("no active effects: eff() returns the base multiplier (1.0)", () => {
    expect(effects.eff("damageMult", 1)).toBe(1.0);
    expect(effects.eff("cooldownMult", 1)).toBe(1.0);
    expect(effects.eff("damageTakenMult", 1)).toBe(1.0);
  });

  test("a 2x damage buff doubles damage output", () => {
    effects.fire("sun_fury"); // damageMult 2.0
    expect(effects.eff("damageMult", 1)).toBe(2.0);
    // same as applying to a base of 16 (Flytrap dmg)
    expect(16 * effects.eff("damageMult", 1)).toBe(32);
  });

  test("a debuff reduces damage output", () => {
    effects.fire("withering"); // damageMult 0.6
    expect(effects.eff("damageMult", 1)).toBeCloseTo(0.6, 5);
    expect(16 * effects.eff("damageMult", 1)).toBeCloseTo(9.6, 5);
  });

  test("a debuff increases damage taken", () => {
    effects.fire("weakened"); // damageTakenMult 1.3
    expect(effects.eff("damageTakenMult", 1)).toBeCloseTo(1.3, 5);
  });

  test("cooldown multiplier slows/speeds attacks", () => {
    effects.fire("hasted"); // cooldownMult 0.5 -> attacks 2x faster
    expect(effects.eff("cooldownMult", 1)).toBe(0.5);
    expect(effects.fire("slowed")); // cooldownMult 2.0 (stacks multiplicatively)
    expect(effects.eff("cooldownMult", 1)).toBeCloseTo(1.0, 5);
    effects.reset();
    effects.fire("slowed"); // 2.0 only
    expect(4 * effects.eff("cooldownMult", 1)).toBeCloseTo(8, 5); // 4s -> 8s
  });
});

describe("US 4.6 — effects differ per playthrough (deterministic replay)", () => {
  test("same seed repeats the same event sequence", () => {
    const run = (seed) => {
      effects.reset(seed);
      const fired = [];
      for (let i = 0; i < 3; i++) fired.push(effects.fire().id);
      return fired;
    };
    expect(run(12345)).toEqual(run(12345));
  });

  test("different seed changes the sequence", () => {
    const run = (seed) => {
      effects.reset(seed);
      const fired = [];
      for (let i = 0; i < 5; i++) fired.push(effects.fire().id);
      return fired;
    };
    // not all 10 are identical across two different seeds
    const a = run(1111);
    const b = run(2222);
    expect(a).not.toEqual(b);
  });
});

describe("effect lifecycle — expiry + poison drain", () => {
  beforeEach(() => effects.reset());

  test("effects expire after their duration", () => {
    effects.fire("sun_fury"); // dur 10
    expect(effects.active.length).toBe(1);
    effects.update(10.1); // past duration
    expect(effects.active.length).toBe(0);
    expect(effects.history.some((h) => h.action === "expired")).toBe(true);
  });

  test("poison drains plant HP over time (US 4.5)", () => {
    effects.fire("poisoned"); // hpDrainPerSec 5
    state.plants = [{ hp: 100 }];
    effects.update(2); // 2s * 5/s = 10 HP
    expect(state.plants[0].hp).toBeCloseTo(90, 5);
    state.plants = [];
  });
});

describe("US 6.5 — active effects are displayable", () => {
  beforeEach(() => effects.reset());

  test("displayList() returns icon/name/kind/remaining", () => {
    effects.fire("fortified"); // buff, dur 20
    effects.fire("slowed"); // debuff, dur 12
    effects.update(3);
    const list = effects.displayList();
    expect(list.length).toBe(2);
    for (const d of list) {
      expect(d).toEqual(
        expect.objectContaining({
          icon: expect.any(String),
          name: expect.any(String),
          kind: expect.any(String),
          remaining: expect.any(Number),
        }),
      );
    }
    expect(list.map((d) => d.name)).toContain("Fortified");
    expect(list.map((d) => d.name)).toContain("Slowed");
  });
});
