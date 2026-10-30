import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadProgress, saveProgress } from "../src/progress.js";
import { LEVEL_PATHS } from "../src/path.js";
import { build, maxSpores, state } from "../src/game.js";

const STORAGE_KEY = "carniflora.level";

describe("Level checkpoints", () => {
  let storage;

  beforeEach(() => {
    const values = new Map();
    storage = {
      getItem: vi.fn((key) => values.get(key) ?? null),
      setItem: vi.fn((key, value) => values.set(key, value)),
    };
    vi.stubGlobal("localStorage", storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    state.level = 1;
    state.players = 1;
    build();
    state.phase = "menu";
  });

  it("starts at level 1 without a checkpoint", () => {
    expect(loadProgress()).toBe(1);
  });

  it.each([1, 2, LEVEL_PATHS.length])("restores level %i", (level) => {
    saveProgress(level);

    expect(storage.getItem(STORAGE_KEY)).toBe(String(level));
    expect(loadProgress()).toBe(level);
  });

  it("rebuilds the saved level with a fresh battle", () => {
    saveProgress(2);
    state.level = 1;
    state.spores = 0;
    state.plants = [{ hp: 1 }];

    state.level = loadProgress();
    build();

    expect(state.level).toBe(2);
    expect(state.map.index).toBe(1);
    expect(state.map.name).toBe(LEVEL_PATHS[1].name);
    expect(state.spores).toBe(maxSpores());
    expect(state.plants).toEqual([]);
    expect(state.myTowers).toEqual([]);
  });

  it.each([
    "",
    "garbage",
    "{}",
    "null",
    "0",
    "-1",
    "1.5",
    "Infinity",
    String(LEVEL_PATHS.length + 1),
  ])("ignores invalid saved data: %s", (value) => {
    storage.setItem(STORAGE_KEY, value);
    expect(loadProgress()).toBe(1);
  });

  it.each([0, -1, 1.5, NaN, Infinity, "2", LEVEL_PATHS.length + 1])(
    "does not overwrite a checkpoint with invalid level %s",
    (level) => {
      saveProgress(2);
      saveProgress(level);
      expect(loadProgress()).toBe(2);
    },
  );

  it("handles denied reads", () => {
    storage.getItem.mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    expect(loadProgress()).toBe(1);
  });

  it("handles failed writes", () => {
    storage.setItem.mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    expect(() => saveProgress(2)).not.toThrow();
  });

  it("works without browser storage", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(loadProgress()).toBe(1);
    expect(() => saveProgress(2)).not.toThrow();
  });

  it("handles a blocked storage getter", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("Storage blocked");
      },
    });
    expect(loadProgress()).toBe(1);
    expect(() => saveProgress(2)).not.toThrow();
  });
});
