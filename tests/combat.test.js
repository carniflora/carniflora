import { test, describe, beforeEach, expect } from "vitest";
import { createState } from "../src/js/state.js";
import { createEffects } from "../src/js/effects.js";
import { build } from "../src/js/build.js";
import { update } from "../src/js/combat.js";
import { pxPosOf } from "../src/js/levels.js";
import { PLANTS } from "../src/js/plants.js";

let state, effects;

beforeEach(() => {
  state = createState();
  state.level = 1;
  effects = createEffects(state);
  build(state, effects, () => 0.5);
  state.enemies = [state.keep]; // just the castle
  state.keep.cooldown = 999;
  state.plants = [];
});

// Place a plant at a distance along path 0, using the game's own position maths.
function addPlant(dist = 0) {
  const path = state.map.paths[0];
  const [x, y] = pxPosOf(path, dist);
  const p = {
    plant: 0,
    owner: 0,
    dist,
    pathIndex: 0,
    x,
    y,
    hp: 1000,
    cooldown: 99,
  };
  state.plants.push(p);
  return p;
}

// Place an enemy on top of a plant (or offset from it with extra).
function addEnemy(plant, extra = {}) {
  const e = {
    x: plant.x,
    y: plant.y,
    hp: 100,
    max: 100,
    rng: 100,
    dmg: 10,
    cooldown: 0,
    base: 1,
    slow: 0,
    radius: 10,
    ...extra,
  };
  state.enemies.push(e);
  return e;
}

describe("enemy attacks", () => {
  test("an enemy in range damages a plant", () => {
    const p = addPlant(5);
    addEnemy(p);
    update(0.01, state, effects);
    expect(p.hp).toBeLessThan(1000);
  });

  test("an enemy out of range does nothing", () => {
    const p = addPlant(5);
    addEnemy(p, { x: p.x + 5000, y: p.y + 5000, rng: 50 });
    update(0.01, state, effects);
    expect(p.hp).toBe(1000);
  });

  test("an enemy waits for its cooldown", () => {
    const p = addPlant(5);
    addEnemy(p, { base: 5 });
    update(0.01, state, effects); // fires, then 5s cooldown
    const after = p.hp;
    update(0.01, state, effects);
    expect(p.hp).toBe(after);
  });
});

describe("enemy kinds", () => {
  test("a boiler splashes plants near its target", () => {
    const target = addPlant(5);
    const neighbour = addPlant(5); // same spot, inside splash range
    const far = addPlant(200); // well outside 60px
    addEnemy(target, { kind: "boiler", rng: 20 });
    update(0.01, state, effects);
    expect(neighbour.hp).toBeLessThan(1000);
    expect(far.hp).toBe(1000);
  });

  test("a cog does not splash", () => {
    const target = addPlant(5);
    const neighbour = addPlant(5);
    addEnemy(target, { kind: "cog", rng: 20 });
    update(0.01, state, effects);
    const hits = [target, neighbour].filter((p) => p.hp < 1000).length;
    expect(hits).toBe(1);
  });

  test("an enemy with no kind still attacks", () => {
    const p = addPlant(5);
    addEnemy(p);
    update(0.01, state, effects);
    expect(p.hp).toBeLessThan(1000);
  });
});

describe("US 4.5 — Fortified and Root Shield reduce incoming damage", () => {
  // Flytrap (index 0) has no HP side effects, so the buff's plantType is
  // pinned to it via forceType to keep these tests deterministic.
  test("a Fortified plant takes half damage from a direct hit", () => {
    const p = addPlant(5);
    addEnemy(p, { dmg: 20, base: 1, rng: 100 });
    effects.fire("fortified", 0); // hpMult 2.0, targets Flytrap
    p.plant = 0;
    update(0.01, state, effects);
    expect(p.hp).toBeCloseTo(990, 5); // 1000 - 20/2
  });

  test("a Root Shield plant takes damage / 1.5 from a direct hit", () => {
    const p = addPlant(5);
    addEnemy(p, { dmg: 30, base: 1, rng: 100 });
    effects.fire("root_shield", 0); // hpMult 1.5, targets Flytrap
    p.plant = 0;
    update(0.01, state, effects);
    expect(p.hp).toBeCloseTo(980, 5); // 1000 - 30/1.5
  });

  test("Fortified also halves splash damage to neighbours", () => {
    const target = addPlant(5);
    const neighbour = addPlant(5); // same spot, inside splash range
    addEnemy(target, { kind: "boiler", dmg: 20, base: 1, rng: 20 });
    effects.fire("fortified", 0);
    target.plant = 0;
    neighbour.plant = 0;
    update(0.01, state, effects);
    // Direct hit (10) + splash (5) split across the two co-located plants;
    // Fortified halves both, so total damage is 15 not 30.
    const dmgs = [1000 - target.hp, 1000 - neighbour.hp].sort((a, b) => a - b);
    expect(dmgs[0]).toBeCloseTo(5, 5); // (20 * 0.5) / 2
    expect(dmgs[1]).toBeCloseTo(10, 5); // 20 / 2
  });

  test("a plant with no health buff takes full damage", () => {
    const p = addPlant(5);
    addEnemy(p, { dmg: 20, base: 1, rng: 100 });
    effects.fire("empowered", 0); // damageMult only, no hpMult
    p.plant = 0;
    update(0.01, state, effects);
    expect(p.hp).toBeCloseTo(980, 5); // full 20
  });
});

describe("US 4.2/4.3 — buffs target a plant type in combat", () => {
  test("Empowered only boosts the damage of the targeted plant type", () => {
    // Two plants far apart, each with its own enemy on top of it, so each
    // plant attacks a distinct enemy and the damage can be compared.
    const a = addPlant(5);
    const b = addPlant(400);
    a.cooldown = 0;
    b.cooldown = 0;
    const eA = addEnemy(a, {
      hp: 1000,
      max: 1000,
      base: 99,
      dmg: 0,
      rng: 100,
      cooldown: 99,
    });
    const eB = addEnemy(b, {
      hp: 1000,
      max: 1000,
      base: 99,
      dmg: 0,
      rng: 100,
      cooldown: 99,
    });
    effects.fire("empowered", a.plant); // damageMult 1.5, targets a's type
    b.plant = (a.plant + 1) % 4; // different type, not buffed
    update(0.01, state, effects);
    const dmgA = 1000 - eA.hp;
    const dmgB = 1000 - eB.hp;
    expect(dmgA).toBeGreaterThan(0);
    expect(dmgB).toBeGreaterThan(0);
    // a's damage is 1.5x its base; b's is 1x its base. The ratio of ratios
    // (dmgA / baseA) / (dmgB / baseB) must be 1.5.
    const baseA = PLANTS[a.plant].dmg;
    const baseB = PLANTS[b.plant].dmg;
    expect(dmgA / baseA / (dmgB / baseB)).toBeCloseTo(1.5, 5);
  });
});

describe("win and lose", () => {
  test("destroying the keep wins", () => {
    state.keep.hp = 0;
    update(0.01, state, effects);
    expect(state.phase).toBe("won");
  });

  test("no plants and too few spores loses", () => {
    state.spores = 0;
    update(0.01, state, effects);
    expect(state.phase).toBe("lost");
  });
});
