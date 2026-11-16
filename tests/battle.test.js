import { beforeEach, describe, expect, it } from "vitest";
import { createBattle, applySnapshot } from "../src/js/battle.js";
import { state, createState } from "../src/js/state.js";
import { build } from "../src/js/build.js";
import { createEffects } from "../src/js/effects.js";
import { createTowers } from "../src/js/towers.js";
import { MAP_COLS, MAP_ROWS, TOWER_LIFETIME } from "../src/js/constants.js";
import { Action } from "../src/js/network/protocol.js";

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
