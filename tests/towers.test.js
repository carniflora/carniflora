import { beforeEach, describe, expect, it } from "vitest";
import { build } from "../src/js/build.js";
import { state } from "../src/js/state.js";
import { PLANTS } from "../src/js/plants.js";
import { LEVEL_PATHS } from "../src/js/path.js";
import { pxPosOf } from "../src/js/levels.js";
import {
  MAP_COLS,
  MAP_ROWS,
  MAX_TOWER_DIST_TO_PATH,
  TOWER_LIFETIME,
} from "../src/js/constants.js";
import {
  maxTowers,
  towersOf,
  canPlaceTower,
  placeTower,
  sendOut,
  deploySelected,
  updateTowers,
} from "../src/js/towers.js";

function findCell(plantIndex, player = 0) {
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (canPlaceTower(c, r, plantIndex, player)) return [c, r];
    }
  }
  throw new Error(`No valid tower cell for plant ${plantIndex}`);
}

function placeAnywhere(plantIndex, player = 0) {
  const [c, r] = findCell(plantIndex, player);
  expect(placeTower(c, r, plantIndex, player)).toBe(true);
  return state.myTowers.at(-1);
}

beforeEach(() => {
  state.level = 1;
  state.players = 1;
  build();
  state.phase = "play";
});

describe("maxTowers and towersOf", () => {
  it("uses the level's 1=-player limit", () => {
    expect(maxTowers()).toBe(LEVEL_PATHS[0].maxTowers);
  });

  it("uses the 2-player limit when it exists, otherwise the normal one", () => {
    state.players = 2;
    const def = LEVEL_PATHS[0];
    expect(maxTowers()).toBe(def.maxTowers2p ?? def.maxTowers);
  });

  it("returns only the towers owned by the player", () => {
    state.players = 2;
    build();
    placeAnywhere(0, 0);
    placeAnywhere(0, 1);

    expect(towersOf(0)).toHaveLength(1);
    expect(towersOf(1)).toHaveLength(1);
    expect(towersOf(0)[0].owner).toBe(0);
    expect(towersOf(1)[0].owner).toBe(1);
  });
});

describe("canPlaceTower", () => {
  it("rejects a missing plant index", () => {
    expect(canPlaceTower(0, 0, null)).toBe(false);
    expect(canPlaceTower(0, 0, undefined)).toBe(false);
  });

  it("rejects cells outside the map", () => {
    expect(canPlaceTower(-1, 0, 0)).toBe(false);
    expect(canPlaceTower(0, -1, 0)).toBe(false);
    expect(canPlaceTower(MAP_COLS, 0, 0)).toBe(false);
    expect(canPlaceTower(0, MAP_ROWS, 0)).toBe(false);
  });

  it("rejects cells that are on the path", () => {
    const { c, r } = state.map.paths[0].cells[0];
    expect(canPlaceTower(c, r, 0)).toBe(false);
  });

  it("rejects cells too far from any path", () => {
    let far = null;
    for (let r = 0; r < MAP_ROWS && !far; r++) {
      for (let c = 0; c < MAP_COLS && !far; c++) {
        const farFromAll = state.map.paths.every((p) =>
          p.cells.every(
            (cell) =>
              Math.hypot(cell.c - c, cell.r - r) > MAX_TOWER_DIST_TO_PATH,
          ),
        );
        if (farFromAll) far = [c, r];
      }
    }
    if (!far) throw new Error("level 1 has no cell far from the path");
    expect(canPlaceTower(far[0], far[1], 0)).toBe(false);
  });

  it("accepts a valid cell beside the path", () => {
    const [c, r] = findCell(0);
    expect(canPlaceTower(c, r, 0)).toBe(true);
  });

  it("allows only one tower per plant type for a player", () => {
    placeAnywhere(0);
    expect(() => findCell(0)).toThrow();
  });

  it("lets the other place build the same plant type", () => {
    state.players = 2;
    build();
    placeAnywhere(0, 0);
    expect(() => findCell(0, 1)).not.toThrow();
  });

  it("rejects placement once the player is at the tower limit", () => {
    state.myTowers = Array.from({ length: maxTowers() }, (_, i) => ({
      c: -1 - i,
      r: -1,
      owner: 0,
      plant: 100 + i,
      timeLeft: TOWER_LIFETIME,
    }));
    const cell = (() => {
      const saved = state.myTowers;
      state.myTowers = [];
      const found = findCell(0);
      state.myTowers = saved;
      return found;
    })();
    expect(canPlaceTower(cell[0], cell[1], 0)).toBe(false);
  });
});

describe("placeTower", () => {
  it("adds a tower with the right owner, plant and a full timer", () => {
    const tower = placeAnywhere(2, 0);
    expect(state.myTowers).toHaveLength(1);
    expect(tower.plant).toBe(2);
    expect(tower.owner).toBe(0);
    expect(tower.timeLeft).toBe(TOWER_LIFETIME);
  });

  it("links the tower to a real path and cell", () => {
    const tower = placeAnywhere(0);
    const path = state.map.paths[tower.pathIndex];
    expect(path).toBeDefined();
    expect(tower.startDist).toBeGreaterThanOrEqual(0);
    expect(tower.startDist).toBeLessThan(path.cells.length);
  });

  it("returns false and adds nothing for an invalid placement", () => {
    const { c, r } = state.map.paths[0].cells[0];
    expect(placeTower(c, r, 0)).toBe(false);
    expect(state.myTowers).toHaveLength(0);
  });
});

describe("sendOut", () => {
  it("spawns the plant at its tower's start position", () => {
    const tower = placeAnywhere(1);
    state.spores = PLANTS[1].cost;
    expect(sendOut(tower)).toBe(true);

    const plant = state.plants[0];
    const [x, y] = pxPosOf(state.map.paths[tower.pathIndex], tower.startDist);
    expect(plant.owner).toBe(tower.owner);
    expect(plant.pathIndex).toBe(tower.pathIndex);
    expect(plant.dist).toBe(tower.startDist);
    expect(plant.hp).toBe(PLANTS[1].hp);
    expect([plant.x, plant.y]).toEqual([x, y]);
  });
});

describe("deploySelected", () => {
  it("returns false for a missing plant index", () => {
    expect(deploySelected(null)).toBe(false);
  });

  it("returns false when the player has no tower for that plant", () => {
    placeAnywhere(0);
    state.spores = 500;
    expect(deploySelected(1)).toBe(false);
    expect(state.plants).toHaveLength(0);
  });

  it("ignores towers that belong to the other player", () => {
    state.players = 2;
    build();
    placeAnywhere(0, 1);
    state.spores = 500;
    expect(deploySelected(0, 0)).toBe(false);
    expect(deploySelected(0, 1)).toBe(true);
  });
});

describe("tower timeout", () => {
  it("counts a tower's timer down by the elapsed time", () => {
    const tower = placeAnywhere(0);
    updateTowers(1.5);
    expect(tower.timeLeft).toBeCloseTo(TOWER_LIFETIME - 1.5);
  });

  it("keeps a tower that still has time left", () => {
    placeAnywhere(0);
    updateTowers(TOWER_LIFETIME - 1);
    expect(state.myTowers).toHaveLength(1);
  });

  it("removes a tower when its timer reaches zero", () => {
    placeAnywhere(0);
    updateTowers(TOWER_LIFETIME);
    expect(state.myTowers).toHaveLength(0);
  });

  it("frees the slot and the cell one a tower expires", () => {
    const tower = placeAnywhere(0);
    const { c, r } = tower;
    updateTowers(TOWER_LIFETIME);

    expect(towersOf(0)).toHaveLength(0);
    expect(canPlaceTower(c, r, 0)).toBe(true);
  });

  it("does not remove plants that were already sent out", () => {
    const tower = placeAnywhere(0);
    state.spores = PLANTS[0].cost;
    sendOut(tower);
    updateTowers(TOWER_LIFETIME);

    expect(state.myTowers).toHaveLength(0);
    expect(state.plants).toHaveLength(1);
  });

  it("does nothing when there are no towers", () => {
    expect(() => updateTowers(1)).not.toThrow();
    expect(state.myTowers).toHaveLength(0);
  });
});
