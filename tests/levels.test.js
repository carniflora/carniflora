import { describe, test, expect } from "vitest";
import { makeCells } from "../src/levels.js";

// test making a vertical path segment (change of rows pos dir)
describe("makeCells", () => {
  test("create vertical segments", () => {
    expect(
      makeCells([
        [0, 2],
        [0, 4],
      ]),
    ).toEqual([
      { c: 0, r: 2 },
      { c: 0, r: 3 },
      { c: 0, r: 4 },
    ]);
  });
});

// test making a horizontal path segment (change of columns pos dir)
describe("makeCells", () => {
  test("create horizontal segments", () => {
    expect(
      makeCells([
        [0, 2],
        [4, 2],
      ]),
    ).toEqual([
      { c: 0, r: 2 },
      { c: 1, r: 2 },
      { c: 2, r: 2 },
      { c: 3, r: 2 },
      { c: 4, r: 2 },
    ]);
  });
});

// test moving up (negative direction row)
describe("makeCells", () => {
  test("segment that moves upwards", () => {
    expect(
      makeCells([
        [4, 2],
        [2, 2],
      ]),
    ).toEqual([
      { c: 4, r: 2 },
      { c: 3, r: 2 },
      { c: 2, r: 2 },
    ]);
  });
});

// test moving left (negative direction column)
describe("makeCells", () => {
  test("segment that moves left", () => {
    expect(
      makeCells([
        [2, 4],
        [2, 2],
      ]),
    ).toEqual([
      { c: 2, r: 4 },
      { c: 2, r: 3 },
      { c: 2, r: 2 },
    ]);
  });
});

// Test L-shaped path
describe("makeCells", () => {
  test("segment with 2 corners", () => {
    expect(
      makeCells([
        [4, 2],
        [4, 4],
        [8, 4],
      ]),
    ).toEqual([
      { c: 4, r: 2 },
      { c: 4, r: 3 },
      { c: 4, r: 4 },
      { c: 5, r: 4 },
      { c: 6, r: 4 },
      { c: 7, r: 4 },
      { c: 8, r: 4 },
    ]);
  });
});
