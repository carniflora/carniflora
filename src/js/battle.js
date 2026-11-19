import { createState } from "./state.js";
import { createEffects } from "./effects.js";
import { createTowers } from "./towers.js";
import { build } from "./build.js";
import { update } from "./combat.js";
import { loadLevel } from "./levels.js";
import { LEVEL_PATHS } from "./path.js";
import { PLANTS } from "./plants.js";
import { Action } from "./network/protocol.js";

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

  function reset() {
    build(state, effects, random);
    state.phase = "play";
    generation++;
  }

  function command(action, player) {
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
        state.level = Math.min(state.level + 1, LEVEL_PATHS.length);
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
    if (state.phase === "play") {
      update(dt, state, effects);
    }
  }

  function snapshot() {
    const { map, keep, ...data } = state;
    void map;
    void keep;
    return structuredClone({ ...data, effects: effects.active, generation });
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
  const { effects: active, generation, ...data } = snapshot;
  void generation;
  const changed =
    state.map?.index !== data.level - 1 || state.map?.players !== data.players;
  Object.assign(state, data);
  if (changed) {
    state.map = loadLevel(state.level - 1, state.players);
  }
  state.keep = state.enemies.find((enemy) => enemy.keep);
  effects.active = active;
}
