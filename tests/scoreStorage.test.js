import { describe, expect, test } from "vitest";
import { createScoreStorage } from "../src/js/scoreStorage.js";

// Minimal in-memory localStorage stand-in.
function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

// A storage-shaped object whose every method throws with the given name.
function throwingStorage(name) {
  const denied = () => {
    const error = new Error(name);
    error.name = name;
    throw error;
  };
  return { getItem: denied, setItem: denied, removeItem: denied };
}

function blockedStorage() {
  return throwingStorage("SecurityError");
}

function fullStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      if (key === "carniflora.scores" || key === "carniflora.scoreWins") {
        const error = new Error("quota");
        error.name = "QuotaExceededError";
        throw error;
      }
      map.set(key, String(value));
    },
    removeItem: (key) => map.delete(key),
  };
}

const WIN = "td-1-1-g3";
const RECORD = {
  mode: "Solo",
  level: 1,
  nicknames: ["Ray"],
  score: 3720,
  time: 12,
  spores: 22,
  plantsLost: 0,
  date: "2026-11-27T00:00:00.000Z",
};

describe("createScoreStorage", () => {
  test("saves a win with every required field and marks it resolved", () => {
    const storage = createScoreStorage(fakeStorage());
    expect(storage.save(WIN, RECORD)).toEqual({ ok: true });
    expect(storage.isResolved(WIN)).toBe(true);
    const history = storage.loadHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      winId: WIN,
      mode: "Solo",
      level: 1,
      nicknames: ["Ray"],
      score: 3720,
      time: 12,
      spores: 22,
      plantsLost: 0,
      date: RECORD.date,
    });
  });

  test("saves each win at most once, even after a reload", () => {
    const backing = fakeStorage();
    const first = createScoreStorage(backing);
    expect(first.save(WIN, RECORD)).toEqual({ ok: true });

    // A fresh module instance over the same storage mimics a refresh.
    const second = createScoreStorage(backing);
    expect(second.save(WIN, RECORD)).toEqual({
      ok: false,
      reason: "duplicate",
    });
    expect(second.loadHistory()).toHaveLength(1);
  });

  test("different wins save independently", () => {
    const storage = createScoreStorage(fakeStorage());
    expect(storage.save(WIN, RECORD).ok).toBe(true);
    expect(storage.save("td-2-1-g4", RECORD).ok).toBe(true);
    expect(storage.loadHistory()).toHaveLength(2);
  });

  test("skip writes no score but stops the form reappearing", () => {
    const backing = fakeStorage();
    const storage = createScoreStorage(backing);
    expect(storage.skip(WIN)).toEqual({ ok: true });
    expect(storage.loadHistory()).toHaveLength(0);

    const afterReload = createScoreStorage(backing);
    expect(afterReload.isResolved(WIN)).toBe(true);
    expect(afterReload.save(WIN, RECORD)).toEqual({
      ok: false,
      reason: "duplicate",
    });
    expect(afterReload.loadHistory()).toHaveLength(0);
  });

  test("blocked storage fails softly and never throws", () => {
    const storage = createScoreStorage(blockedStorage());
    expect(storage.save(WIN, RECORD)).toEqual({ ok: false, reason: "blocked" });
    expect(storage.skip(WIN)).toEqual({ ok: false });
    expect(storage.isResolved(WIN)).toBe(false);
    expect(storage.loadHistory()).toEqual([]);
  });

  test("null storage (no localStorage at all) behaves like blocked", () => {
    const storage = createScoreStorage(null);
    expect(storage.save(WIN, RECORD)).toEqual({ ok: false, reason: "blocked" });
    expect(storage.loadHistory()).toEqual([]);
  });

  test("a full quota reports failure without losing earlier wins", () => {
    const backing = fakeStorage();
    const keeper = createScoreStorage(backing);
    expect(keeper.save("td-1-1-g1", RECORD).ok).toBe(true);

    const storage = createScoreStorage(fullStorage());
    const result = storage.save(WIN, RECORD);
    expect(result).toEqual({ ok: false, reason: "full" });
    // The untouched storage still holds the earlier win.
    expect(createScoreStorage(backing).loadHistory()).toHaveLength(1);
  });

  test("damaged storage heals instead of failing every save", () => {
    const backing = fakeStorage();
    backing.setItem("carniflora.scores", "{not json");
    backing.setItem("carniflora.scoreWins", "42");

    const storage = createScoreStorage(backing);
    expect(storage.loadHistory()).toEqual([]);
    expect(storage.save(WIN, RECORD)).toEqual({ ok: true });
    expect(storage.loadHistory()).toHaveLength(1);
  });

  test("caps the stored history", () => {
    const storage = createScoreStorage(fakeStorage());
    for (let i = 0; i < 130; i++) {
      storage.save(`td-1-1-t${i}`, RECORD);
    }
    expect(storage.loadHistory()).toHaveLength(100);
  });
});
