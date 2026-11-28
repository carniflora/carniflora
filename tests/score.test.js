import { describe, expect, test } from "vitest";
import {
  SCORE_BASE,
  SCORE_PAR_SECONDS,
  SCORE_PLANT_LOSS_PENALTY,
  SCORE_TIME_BONUS_PER_SECOND,
  computeScore,
  modeLabel,
  winKey,
} from "../src/js/score.js";

describe("computeScore", () => {
  test("scores a fast flawless win at the maximum", () => {
    // 0s elapsed, 120 spores left, no plants lost.
    const result = computeScore({ elapsed: 0.9, spores: 120.7, plantsLost: 0 });
    expect(result).toEqual({
      base: 1000,
      timeBonus: 10 * 300,
      sporeBonus: 120,
      lossPenalty: 0,
      total: 1000 + 10 * 300 + 120,
    });
  });

  test("floors elapsed and spores before scoring", () => {
    expect(computeScore({ elapsed: 10.99, spores: 45.9 }).timeBonus).toBe(
      SCORE_TIME_BONUS_PER_SECOND * (SCORE_PAR_SECONDS - 10),
    );
    expect(computeScore({ elapsed: 10.99, spores: 45.9 }).sporeBonus).toBe(45);
  });

  test("clamps the time bonus once the par time is passed", () => {
    expect(computeScore({ elapsed: 300, spores: 0 }).timeBonus).toBe(0);
    expect(computeScore({ elapsed: 900.4, spores: 0 }).timeBonus).toBe(0);
    expect(computeScore({ elapsed: 900.4, spores: 0 }).total).toBe(SCORE_BASE);
  });

  test("subtracts 25 per lost plant", () => {
    // Elapsed past the par time zeroes the time bonus to isolate the penalty.
    const result = computeScore({ elapsed: 300, spores: 0, plantsLost: 4 });
    expect(result.lossPenalty).toBe(4 * SCORE_PLANT_LOSS_PENALTY);
    expect(result.total).toBe(SCORE_BASE - 4 * SCORE_PLANT_LOSS_PENALTY);
  });

  test("never returns a negative score", () => {
    const result = computeScore({ elapsed: 1000, spores: 0, plantsLost: 100 });
    expect(result.total).toBe(0);
  });

  test("treats missing or negative inputs as zero", () => {
    const result = computeScore({ elapsed: -5, spores: -3, plantsLost: -1 });
    expect(result.total).toBe(SCORE_BASE + SCORE_TIME_BONUS_PER_SECOND * 300);
  });
});

describe("modeLabel", () => {
  test("labels solo, local two-player, and online co-op", () => {
    expect(modeLabel(false, 1)).toBe("Solo");
    expect(modeLabel(false, 2)).toBe("Local 2P");
    expect(modeLabel(true, 2)).toBe("Online Co-op");
  });
});

describe("winKey", () => {
  test("online wins share one key from the room generation", () => {
    const args = { mode: "td", level: 2, players: 2, generation: 7 };
    expect(winKey(args)).toBe(winKey(args));
    expect(winKey(args)).toBe("td-2-2-g7");
    expect(winKey({ ...args, generation: 8 })).not.toBe(winKey(args));
  });

  test("local wins stamp the moment, so a replay is a new win", () => {
    const args = { mode: "td", level: 1, players: 1, at: 1000 };
    expect(winKey(args)).toBe("td-1-1-t1000");
    expect(winKey({ ...args, at: 2000 })).not.toBe(winKey(args));
  });
});

describe("online win ids", () => {
  test("differ between rooms with the same generation", () => {
    const win = { mode: "td", level: 1, players: 2, generation: 1 };

    expect(winKey({ ...win, room: "ROOMA" })).not.toBe(
      winKey({ ...win, room: "ROOMB" }),
    );
  });
});
