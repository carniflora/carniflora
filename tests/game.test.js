import { beforeEach, describe, expect, it } from "vitest";
import {
  build,
  canPlaceTower,
  deploySelected,
  placeTower,
  PLANTS,
  sendOut,
  state,
} from "../src/game.js";
import { MAP_COLS, MAP_ROWS } from "../src/levels.js";

describe("Normal battle deployment", () => {
  beforeEach(() => {
    state.level = 1;
    build();
    state.phase = "play";
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (canPlaceTower(c, r, 0)) {
          placeTower(c, r, 0);
          return;
        }
      }
    }
    throw new Error("No valid Flytrap tower location in the first level");
  });

  it("deducts the plant cost from spores when deploying from a tower", () => {
    state.spores = PLANTS[0].cost + 7;

    expect(sendOut(state.myTowers[0])).toBe(true);
    expect(state.spores).toBe(7);
    expect(state.plants).toHaveLength(1);
    expect(state.plants[0].plant).toBe(0);
  });

  it("does not charge or spawn a plant when spores are insufficient", () => {
    state.spores = PLANTS[0].cost - 1;

    expect(sendOut(state.myTowers[0])).toBe(false);
    expect(state.spores).toBe(PLANTS[0].cost - 1);
    expect(state.plants).toHaveLength(0);
  });

  it("stops repeated selected deployments when their budget is spent", () => {
    state.spores = PLANTS[0].cost * 2;

    expect(deploySelected(0)).toBe(true);
    expect(deploySelected(0)).toBe(true);
    expect(deploySelected(0)).toBe(false);
    expect(state.spores).toBe(0);
    expect(state.plants).toHaveLength(2);
  });
});
