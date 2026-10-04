import { describe, it, expect } from "vitest";
import { at, TOTAL, PATH } from "../src/path.js";

describe("path", () => {
  it("starts at the first waypoint", () => {
    expect(at(0)).toEqual(PATH[0]);
  });
  it("ends at the last waypoint and clamps beyond it", () => {
    expect(at(TOTAL)).toEqual(PATH[PATH.length - 1]);
    expect(at(TOTAL + 500)).toEqual(PATH[PATH.length - 1]);
  });
  it("clamps negative distances to the start", () => {
    expect(at(-10)).toEqual(PATH[0]);
  });
  it("has a positive total length", () => {
    expect(TOTAL).toBeGreaterThan(0);
  });
  it("moves continuously along the path", () => {
    const [x1, y1] = at(100);
    const [x2, y2] = at(101);
    expect(Math.hypot(x2 - x1, y2 - y1)).toBeLessThan(1.5);
  });
});
