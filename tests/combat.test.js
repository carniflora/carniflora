import { test, describe, beforeEach, expect } from "vitest";
import { createState } from "../src/js/state.js";
import { createEffects } from "../src/js/effects.js";
import { build } from "../src/js/build.js";
import { update } from "../src/js/combat.js";
import { pxPosOf } from "../src/js/levels.js";

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
