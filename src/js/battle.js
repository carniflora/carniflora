import { createState } from "./state.js";
import { createEffects } from "./effects.js";
import { createTowers } from "./towers.js";
import { build } from "./build.js";
import { update } from "./combat.js";
import { loadLevel } from "./levels.js";
import { LEVEL_PATHS } from "./path.js";
import { PLANTS } from "./plants.js";
import {
  createBossLevelState,
  updateBossLevel,
  spawnBossPlant,
  selectBossLane,
} from "./bossLevel.js";
import { Action } from "./network/protocol.js";

const BOSS_PLAYERS = 2;

export function validLevel(level) {
  return Number.isInteger(level) && level >= 1 && level <= LEVEL_PATHS.length;
}

// Each room owns its rules and mutable state; local play uses the same rules.
export function createBattle(level, random = Math.random) {
  const state = createState();
  state.level = level;
  state.players = 2;
  const effects = createEffects(state);
  const towers = createTowers(state);
  let generation = 0;
  let boss = null; // set once the last regular level is won

  function enterBoss() {
    boss = createBossLevelState(BOSS_PLAYERS);
    state.phase = boss.state;
    generation++;
  }

  // Boss commands act on the boss state; its phase is mirrored to state.phase.
  function bossCommand(action, player) {
    switch (action.type) {
      case Action.RESTART:
        enterBoss();
        return true;
      case Action.PAUSE:
        if (boss.state !== "play") {
          return false;
        }
        boss.state = "pause";
        break;
      case Action.RESUME:
        if (boss.state !== "pause") {
          return false;
        }
        boss.state = "play";
        break;
      case Action.LANE:
        return selectBossLane(boss, action.lane, player);
      case Action.DEPLOY:
        return spawnBossPlant(boss, action.plant, undefined, player);
      default:
        return false;
    }
    state.phase = boss.state;
    return true;
  }

  function reset() {
    build(state, effects, random);
    state.phase = "play";
    generation++;
  }

  function command(action, player) {
    if (boss) {
      return bossCommand(action, player);
    }
    const plantValid = Number.isInteger(action.plant) && !!PLANTS[action.plant];
    switch (action.type) {
      case Action.START:
        if (state.phase !== "menu") {
          return false;
        }
        reset();
        return true;
      case Action.RESTART:
        if (state.phase === "menu") {
          return false;
        }
        reset();
        return true;
      case Action.ADVANCE:
        if (state.phase !== "won") {
          return false;
        }
        if (state.level >= LEVEL_PATHS.length) {
          enterBoss();
          return true;
        }
        state.level++;
        reset();
        return true;
      case Action.PAUSE:
        if (state.phase !== "play") {
          return false;
        }
        state.phase = "pause";
        return true;
      case Action.RESUME:
        if (state.phase !== "pause") {
          return false;
        }
        state.phase = "play";
        return true;
      case Action.PLACE:
        if (
          state.phase !== "play" ||
          !plantValid ||
          !Number.isInteger(action.c) ||
          !Number.isInteger(action.r)
        ) {
          return false;
        }
        return towers.placeTower(action.c, action.r, action.plant, player);
      case Action.DEPLOY:
        if (state.phase !== "play" || !plantValid) {
          return false;
        }
        return towers.deploySelected(action.plant, player);
      default:
        return false;
    }
  }

  function tick(dt) {
    if (boss) {
      updateBossLevel(boss, dt);
      state.phase = boss.state;
      return;
    }
    if (state.phase === "play") {
      update(dt, state, effects);
    }
  }

  function snapshot() {
    const { map, keep, ...data } = state;
    void map;
    void keep;
    return structuredClone({
      ...data,
      boss,
      effects: effects.active,
      generation,
    });
  }

  build(state, effects, random);
  return {
    state,
    effects,
    command,
    tick,
    snapshot,
    generation: () => generation,
  };
}

// Runtime path helpers and the keep/enemies alias cannot travel as JSON.
export function applySnapshot(state, effects, snapshot) {
  const { effects: active, generation, boss, ...data } = snapshot;
  void generation;
  void boss; // the client keeps it in its session, not in the shared state
  const changed =
    state.map?.index !== data.level - 1 || state.map?.players !== data.players;
  Object.assign(state, data);
  if (changed) {
    state.map = loadLevel(state.level - 1, state.players);
  }
  state.keep = state.enemies.find((enemy) => enemy.keep);
  effects.active = active;
}
