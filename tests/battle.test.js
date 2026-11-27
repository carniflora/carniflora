import { beforeEach, describe, expect, it } from "vitest";
import { createBattle, applySnapshot } from "../src/js/battle.js";
import { state, createState } from "../src/js/state.js";
import { build } from "../src/js/build.js";
import { createEffects } from "../src/js/effects.js";
import { createTowers } from "../src/js/towers.js";
import {
  MAP_COLS,
  MAP_ROWS,
  TOWER_LIFETIME,
  LAST_REGULAR_LEVEL,
} from "../src/js/constants.js";
import { Action } from "../src/js/network/protocol.js";
import { BOSS_KINDS } from "../src/js/plants.js";

function addTower(battleState) {
  const towers = createTowers(battleState);
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (towers.placeTower(c, r, 0)) {
        return battleState.myTowers[0];
      }
    }
  }
  throw new Error("No valid tower cell");
}

beforeEach(() => {
  state.level = 1;
  state.players = 1;
  build();
  state.phase = "play";
});

function bossBattle() {
  const battle = createBattle(LAST_REGULAR_LEVEL);
  battle.command({ type: Action.START }, 0);
  battle.state.phase = "won";
  battle.command({ type: Action.ADVANCE }, 0);
  return battle;
}

describe("Online boss level", () => {
  it("has no boss before the last regular level is won", () => {
    const battle = createBattle(1);
    battle.command({ type: Action.START }, 0);

    expect(battle.snapshot().boss).toBeNull();
  });

  it("advances from the last regular level into a two-player boss", () => {
    const battle = bossBattle();
    const { boss } = battle.snapshot();

    expect(boss.state).toBe("play");
    expect(boss.selectedLanes).toHaveLength(2);
    expect(battle.state.phase).toBe("play");
  });

  it("does not advance past the last regular level before a win", () => {
    const battle = createBattle(LAST_REGULAR_LEVEL);
    battle.command({ type: Action.START }, 0);

    expect(battle.command({ type: Action.ADVANCE }, 0)).toBe(false);
    expect(battle.snapshot().boss).toBeNull();
  });

  it("bumps the generation so stale commands are rejected", () => {
    const before = createBattle(LAST_REGULAR_LEVEL);
    before.command({ type: Action.START }, 0);
    const generation = before.generation();
    before.state.phase = "won";
    before.command({ type: Action.ADVANCE }, 0);

    expect(before.generation()).toBeGreaterThan(generation);
  });

  it("lets each player select only their own lanes", () => {
    const battle = bossBattle();

    expect(battle.command({ type: Action.LANE, lane: 1 }, 0)).toBe(true);
    expect(battle.command({ type: Action.LANE, lane: 3 }, 0)).toBe(false);
    expect(battle.command({ type: Action.LANE, lane: 3 }, 1)).toBe(true);

    expect(battle.snapshot().boss.selectedLanes).toEqual([1, 3]);
  });

  it("deploys boss plants for the commanding player", () => {
    const battle = bossBattle();
    const before = battle.snapshot().boss.spores;

    expect(battle.command({ type: Action.DEPLOY, plant: 0 }, 1)).toBe(true);

    const { boss } = battle.snapshot();
    expect(boss.plants).toHaveLength(1);
    expect(boss.plants[0].owner).toBe(1);
    expect(boss.spores).toBe(before - BOSS_KINDS[0].cost);
  });

  it("ticks the boss and mirrors its phase", () => {
    const battle = bossBattle();
    battle.tick(1);
    expect(battle.snapshot().boss.elapsed).toBeCloseTo(1);

    battle.command({ type: Action.PAUSE }, 0);
    expect(battle.snapshot().boss.state).toBe("pause");
    expect(battle.state.phase).toBe("pause");

    battle.tick(1);
    expect(battle.snapshot().boss.elapsed).toBeCloseTo(1);

    battle.command({ type: Action.RESUME }, 0);
    expect(battle.snapshot().boss.state).toBe("play");
  });

  it("restarts the boss without leaving boss mode", () => {
    const battle = bossBattle();
    battle.command({ type: Action.DEPLOY, plant: 0 }, 0);
    battle.command({ type: Action.RESTART }, 0);

    expect(battle.snapshot().boss.plants).toHaveLength(0);
  });

  it("cannot advance after the boss is won", () => {
    const battle = bossBattle();
    battle.snapshot();
    battle.state.phase = "won";

    expect(battle.command({ type: Action.ADVANCE }, 0)).toBe(false);
  });

  it("restores the boss from a snapshot", () => {
    const battle = bossBattle();
    battle.tick(1);
    const restored = createState();
    const snapshot = JSON.parse(JSON.stringify(battle.snapshot()));

    applySnapshot(restored, createEffects(restored), snapshot);

    expect(restored.boss).toBeUndefined();
    expect(snapshot.boss.elapsed).toBeCloseTo(1);
  });
});

describe("Win score state", () => {
  it("carries the plant loss counter in snapshots", () => {
    const battle = createBattle(1);
    battle.command({ type: Action.START }, 0);
    battle.state.plantsLost = 3;
    const restored = createState();

    applySnapshot(
      restored,
      createEffects(restored),
      JSON.parse(JSON.stringify(battle.snapshot())),
    );

    expect(restored.plantsLost).toBe(3);
  });
});

describe("Battle tower lifetimes", () => {
  it("expires one room's towers without changing another room or local play", () => {
    const a = createBattle(1);
    const b = createBattle(1);
    a.command({ type: Action.START }, 0);
    b.command({ type: Action.START }, 0);
    const activeTower = addTower(a.state);
    const otherTower = addTower(b.state);
    const localTower = addTower(state);
    const elapsed = 1.5;

    a.tick(elapsed);

    expect(activeTower.timeLeft).toBeCloseTo(TOWER_LIFETIME - elapsed);
    expect(otherTower.timeLeft).toBe(TOWER_LIFETIME);
    expect(localTower.timeLeft).toBe(TOWER_LIFETIME);

    a.tick(TOWER_LIFETIME - elapsed);

    expect(a.state.myTowers).toHaveLength(0);
    expect(b.state.myTowers).toHaveLength(1);
    expect(state.myTowers).toHaveLength(1);
  });

  it("freezes tower timers while paused and expires them after resuming", () => {
    const battle = createBattle(1);
    battle.command({ type: Action.START }, 0);
    const tower = addTower(battle.state);
    battle.command({ type: Action.PAUSE }, 1);

    battle.tick(TOWER_LIFETIME);

    expect(tower.timeLeft).toBe(TOWER_LIFETIME);
    expect(battle.state.myTowers).toHaveLength(1);

    battle.command({ type: Action.RESUME }, 0);
    battle.tick(TOWER_LIFETIME);

    expect(battle.state.myTowers).toHaveLength(0);
  });

  it("carries remaining tower lifetimes in snapshots", () => {
    const battle = createBattle(1);
    battle.command({ type: Action.START }, 0);
    addTower(battle.state);
    battle.tick(1);
    const restored = createState();

    applySnapshot(
      restored,
      createEffects(restored),
      JSON.parse(JSON.stringify(battle.snapshot())),
    );

    expect(restored.myTowers[0].timeLeft).toBe(TOWER_LIFETIME - 1);
  });
});
