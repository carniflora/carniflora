import { describe, it, expect } from "vitest";
import {
  createBossLevelState,
  spawnBossPlant,
  updateBossLevel,
  atBossPath,
  getDistAtX,
  BOSS_TOTAL,
  ARENA_X,
  KINDS,
} from "../src/bossLevel.js";
import { KINDS as BASE_KINDS } from "../src/kinds.js";

describe("Boss Level: Main Game Style with Advancing Killzone", () => {
  it("exports unified plant configurations matching shared kinds", () => {
    expect(KINDS).toBe(BASE_KINDS);
    expect(KINDS.length).toBe(4);
    expect(KINDS[0].n).toBe("Flytrap");
  });

  it("handles path distance clamping at extreme boundary X coordinates", () => {
    expect(getDistAtX(-500)).toBe(0);
    expect(getDistAtX(5000)).toBe(BOSS_TOTAL);
  });

  it("initializes with towers, minions, boss, and leftEdge at start", () => {
    const state = createBossLevelState();
    expect(state.leftEdge).toBe(-20);
    expect(state.cameraX).toBe(0);
    expect(state.boss.hp).toBe(750);
    expect(state.boss.x).toBeGreaterThan(ARENA_X);
    expect(state.towers.length).toBeGreaterThan(0);
    expect(state.minions.length).toBeGreaterThan(0);
    expect(state.state).toBe("play");
  });

  it("interpolates path correctly across the world", () => {
    const start = atBossPath(0);
    const end = atBossPath(BOSS_TOTAL);
    expect(start[0]).toBe(-20);
    expect(Math.round(end[0])).toBe(2280);
  });

  it("spawns plants ahead of the advancing left edge and deducts spores", () => {
    const state = createBossLevelState();
    const initialSpores = state.spores;

    const spawned = spawnBossPlant(state, 0); // Flytrap (cost 40)
    expect(spawned).toBe(true);
    expect(state.plants.length).toBe(1);
    expect(state.plants[0].hp).toBe(150);
    expect(state.plants[0].x).toBeGreaterThan(state.leftEdge);
    expect(state.spores).toBeLessThan(initialSpores);

    // Insufficient spores test
    state.spores = 10;
    const failed = spawnBossPlant(state, 3); // Rafflesia (cost 90)
    expect(failed).toBe(false);
  });

  it("slowly advances the left-hand side and camera over time", () => {
    const state = createBossLevelState();
    const initialLeft = state.leftEdge;

    updateBossLevel(state, 1.0);
    expect(state.leftEdge).toBeGreaterThan(initialLeft);
    expect(state.cameraX).toBeGreaterThanOrEqual(0);
  });

  it("inflicts heavy damage on plants caught behind the advancing killzone", () => {
    const state = createBossLevelState();
    state.leftEdge = 200;

    // Plant lagging behind the killzone line (killzoneX = leftEdge + 40 = 240)
    state.plants.push({
      k: 0,
      s: 0,
      x: 100, // well behind 240
      y: 200,
      hp: 150,
      cd: 0,
      slow: 0,
    });

    updateBossLevel(state, 0.5);
    expect(state.plants[0].hp).toBeLessThan(150);
  });

  it("towers shoot advancing plants within range", () => {
    const state = createBossLevelState();
    const tower = state.towers[0];

    // Position plant on path within tower range
    const plantS = getDistAtX(tower.x - 20);
    const [px, py] = atBossPath(plantS);
    state.plants.push({
      k: 0,
      s: plantS,
      x: px,
      y: py,
      hp: 150,
      cd: 0,
      slow: 0,
    });

    updateBossLevel(state, 0.05);
    expect(state.plants[0].hp).toBeLessThan(150);
  });

  it("boss shockwave knocks plants backward toward the advancing left edge", () => {
    const state = createBossLevelState();
    const [px, py] = atBossPath(800);

    state.plants.push({
      k: 0,
      s: 800,
      x: px,
      y: py,
      hp: 150,
      cd: 0,
      slow: 0,
    });

    // Active shockwave colliding with plant
    state.shockwaves.push({
      x: px,
      y: py,
      vx: -240,
      r: 30,
      dmg: 20,
      lifetime: 2.0,
    });

    updateBossLevel(state, 0.1);
    expect(state.plants[0].s).toBeLessThan(800); // knocked back along path!
    expect(state.plants[0].slow).toBeGreaterThan(0);
  });

  it("triggers boss enraged state when boss drops to 50% HP or lower", () => {
    const state = createBossLevelState();
    state.boss.hp = 300; // <= 375 (50% of 750)

    const initialMinionCount = state.minions.length;
    updateBossLevel(state, 0.05);

    expect(state.boss.enraged).toBe(true);
    expect(state.minions.length).toBeGreaterThan(initialMinionCount);
  });

  it("triggers victory when boss HP drops to 0", () => {
    const state = createBossLevelState();
    state.boss.hp = 0;

    updateBossLevel(state, 0.05);
    expect(state.state).toBe("won");
  });

  it("triggers overrun defeat if player idles and killzone reaches the arena", () => {
    const state = createBossLevelState();
    state.leftEdge = ARENA_X; // killzone swept across the entire map

    updateBossLevel(state, 0.05);
    expect(state.state).toBe("lost");
    expect(state.defeatReason).toBe("overrun");
  });

  it("caps spores so player cannot infinitely hoard spores by idling", () => {
    const state = createBossLevelState();
    state.spores = 250;

    updateBossLevel(state, 10.0);
    expect(state.spores).toBe(260); // capped at 260
  });
});
