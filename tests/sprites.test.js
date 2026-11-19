import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

// create a fake image to represent and act like the pngs for the sprites
let requested = []; // records every file path that the code asks for
let failPattern = null; // switch to simulate a broken file
class FakeImage {
  set src(value) {
    this._src = value;
    requested.push(value);
    this.width = value.includes("tree") ? 384 : 1024;
    this.height = value.includes("tree") ? 96 : 64;
    Promise.resolve().then(() =>
      failPattern && value.includes(failPattern)
        ? this.onerror?.()
        : this.onload?.(),
    );
  }
  get src() {
    return this._src;
  }
}

// fake canvas context that records every drawImage call
function fakeCtx() {
  return {
    imageSmoothingEnabled: true,
    calls: [],
    drawImage(...args) {
      this.calls.push(args);
    },
  };
}

// import fresh copy of sprites.js for each test
async function freshSprites() {
  vi.resetModules();
  return import("../src/js/sprites.js");
}

async function loadedSprites() {
  const sprites = await freshSprites();
  await sprites.loadSprites();
  return sprites;
}

const FRAME = 64;
const FPS = 8;

beforeEach(() => {
  requested = [];
  failPattern = null;
  vi.stubGlobal("Image", FakeImage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------
// loadSprites
// ---------------------------------------------------------------
describe("loadSprites", () => {
  test("requests every sheet exactly once", async () => {
    await loadedSprites();
    // 4 plants x 2 colours + 4 minions + 1 keep + 2 tree sheets = 15 sprites
    expect(requested).toHaveLength(15);
    expect(new Set(requested).size).toBe(15); // no sheet loads twice
  });

  test("loads player 1 and player 2 versions of each plant sheet", async () => {
    await loadedSprites();
    expect(requested).toContain("assets/carniflora-pip-sheet16-1x.png");
    expect(requested).toContain("assets/carniflora-pip-sheet16-1x-p2-blue.png");
  });

  test("loads all four minion sheets and the keep", async () => {
    await loadedSprites();
    for (const n of ["rivet", "cog", "piston", "boiler", "works"]) {
      expect(requested).toContain(`assets/carniflora-${n}-sheet16-1x.png`);
    }
  });

  test("loads both tree sheets", async () => {
    await loadedSprites();
    expect(requested).toContain("assets/carniflora-tree-plants-sheet4-1x.png");
    expect(requested).toContain(
      "assets/carniflora-tree-plants-sheet4-1x-p2-blue.png",
    );
  });

  test("rejects with the failing path when an image can't load", async () => {
    failPattern = "cog";
    const sprites = await freshSprites();
    await expect(sprites.loadSprites()).rejects.toThrow(
      /Could not load assets\/carniflora-cog-sheet16-1x\.png/,
    );
  });
});

// ---------------------------------------------------------------
// drawPlant
// ---------------------------------------------------------------
describe("drawPlant", () => {
  test("returns false and draws nothing before sprites are loaded", async () => {
    const { drawPlant } = await freshSprites();
    const ctx = fakeCtx();
    expect(drawPlant(ctx, { plant: 0, owner: 0, x: 0, y: 0 }, 0)).toBe(false);
    expect(ctx.calls).toHaveLength(0);
  });

  test("draws a 64x64 slice centred on the plant", async () => {
    const { drawPlant } = await loadedSprites();
    const ctx = fakeCtx();
    const p = { plant: 0, owner: 0, x: 100, y: 200, animOffset: 0 };
    expect(drawPlant(ctx, p, 0, 48)).toBe(true);

    const [, sx, sy, sw, sh, dx, dy, dw, dh] = ctx.calls[0];
    expect([sx, sy, sw, sh]).toEqual([0, 0, FRAME, FRAME]);
    expect([dx, dy, dw, dh]).toEqual([76, 176, 48, 48]);
  });

  test("turns image smoothing off so pixels stay crisp", async () => {
    const { drawPlant } = await loadedSprites();
    const ctx = fakeCtx();
    drawPlant(ctx, { plant: 0, owner: 0, x: 0, y: 0, animOffset: 0 }, 0);
    expect(ctx.imageSmoothingEnabled).toBe(false);
  });

  test("owner 0 users the original sheet, owner 1 uses blue sheet", async () => {
    const { drawPlant } = await loadedSprites();
    const ctx = fakeCtx();
    drawPlant(ctx, { plant: 2, owner: 0, x: 0, y: 0, animOffset: 0 }, 0);
    drawPlant(ctx, { plant: 2, owner: 1, x: 0, y: 0, animOffset: 0 }, 0);
    expect(ctx.calls[0][0].src).toBe("assets/carniflora-pip-sheet16-1x.png");
    expect(ctx.calls[1][0].src).toBe(
      "assets/carniflora-pip-sheet16-1x-p2-blue.png",
    );
  });

  test("each plant type uses the sheet named in plants.js", async () => {
    const { drawPlant } = await loadedSprites();
    const ctx = fakeCtx();
    ["snap", "thorn", "pip", "sunny"].forEach((sheet, i) => {
      drawPlant(ctx, { plant: i, owner: 0, x: 0, y: 0, animOffset: 0 }, 0);
      expect(ctx.calls[i][0].src).toContain(`-${sheet}-`);
    });
  });

  test("advances one frame every 1/FPS seconds", async () => {
    const { drawPlant } = await loadedSprites();
    const ctx = fakeCtx();
    const p = { plant: 0, owner: 0, x: 0, y: 0, animOffset: 0 };
    drawPlant(ctx, p, 0);
    drawPlant(ctx, p, 1000 / FPS);
    drawPlant(ctx, p, (3 * 1000) / FPS);
    expect(ctx.calls[0][1]).toBe(0 * FRAME);
    expect(ctx.calls[1][1]).toBe(1 * FRAME);
    expect(ctx.calls[2][1]).toBe(3 * FRAME);
  });

  test("loops back to frame 0 after all 16 frames", async () => {
    const { drawPlant } = await loadedSprites();
    const ctx = fakeCtx();
    const p = { plant: 0, owner: 0, x: 0, y: 0, animOffset: 0 };
    drawPlant(ctx, p, (15 * 1000) / FPS);
    drawPlant(ctx, p, (16 * 1000) / FPS);
    expect(ctx.calls[0][1]).toBe(15 * FRAME);
    expect(ctx.calls[1][1]).toBe(0);
  });

  test("gives each plant a stable animation offset between 0 and 15", async () => {
    const { drawPlant } = await loadedSprites();
    const ctx = fakeCtx();
    const p = { plant: 0, owner: 0, x: 0, y: 0 };
    drawPlant(ctx, p, 0);
    const first = p.animOffset;
    drawPlant(ctx, p, 0);
    expect(Number.isInteger(first)).toBe(true);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(16);
    expect(p.animOffset).toBe(first); // must not change between frames
  });

  test("the animation offset shifts which frame is shown", async () => {
    const { drawPlant } = await loadedSprites();
    const ctx = fakeCtx();
    drawPlant(ctx, { plant: 0, owner: 0, x: 0, y: 0, animOffset: 5 }, 0);
    expect(ctx.calls[0][1]).toBe(5 * FRAME);
  });
});

// ---------------------------------------------------------------
// drawEnemy
// ---------------------------------------------------------------
describe("drawEnemy", () => {
  test("returns false before sprites are loaded", async () => {
    const { drawEnemy } = await freshSprites();
    expect(drawEnemy(fakeCtx(), { x: 0, y: 0 }, 0)).toBe(false);
    expect(drawEnemy(fakeCtx(), { x: 0, y: 0, keep: true }, 0)).toBe(false);
  });

  test("the keep uses the works sheet", async () => {
    const { drawEnemy } = await loadedSprites();
    const ctx = fakeCtx();
    drawEnemy(ctx, { x: 500, y: 100, keep: true, animOffset: 0 }, 0, 96);
    expect(ctx.calls[0][0].src).toBe("assets/carniflora-works-sheet16-1x.png");
    // centered on the keep
    expect(ctx.calls[0].slice(5)).toEqual([452, 52, 96, 96]);
  });

  test("minions get a variant in range that never changes", async () => {
    const { drawEnemy } = await loadedSprites();
    const ctx = fakeCtx();
    const e = { x: 0, y: 0 };
    drawEnemy(ctx, e, 0);
    const first = e.variant;
    drawEnemy(ctx, e, 500);
    expect(Number.isInteger(first)).toBe(true);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(4);
    expect(e.variant).toBe(first);
    expect(ctx.calls[0][0]).toBe(ctx.calls[1][0]); // same image every frame
  });

  test("a minion's variant selects the matching sheet", async () => {
    const { drawEnemy } = await loadedSprites();
    const ctx = fakeCtx();
    ["rivet", "cog", "piston", "boiler"].forEach((name, i) => {
      drawEnemy(ctx, { x: 0, y: 0, variant: i, animOffset: 0 }, 0);
      expect(ctx.calls[i][0].src).toContain(`-${name}-`);
    });
  });

  test("minions and the keep animate over 16 frames", async () => {
    const { drawEnemy } = await loadedSprites();
    const ctx = fakeCtx();
    const e = { x: 0, y: 0, variant: 0, animOffset: 0 };
    drawEnemy(ctx, e, (2 * 1000) / FPS);
    drawEnemy(ctx, e, (16 * 1000) / FPS);
    expect(ctx.calls[0][1]).toBe(2 * FRAME);
    expect(ctx.calls[1][0 + 1]).toBe(0);
  });
});

// ---------------------------------------------------------------
// drawTree
// ---------------------------------------------------------------
describe("drawTree", () => {
  test("returns false before sprites are loaded", async () => {
    const { drawTree } = await freshSprites();
    expect(drawTree(fakeCtx(), { plant: 0, owner: 0 }, 0, 0, 60)).toBe(false);
  });

  test("picks the frame that matches the plant type", async () => {
    const { drawTree } = await loadedSprites();
    const ctx = fakeCtx();
    for (let plant = 0; plant < 4; plant++)
      drawTree(ctx, { plant, owner: 0 }, 0, 0, 60);
    ctx.calls.forEach((call, i) => {
      expect(call.slice(1, 5)).toEqual([i * 96, 0, 96, 96]);
    });
  });

  test("owner 0 uses the green sheet, owner 1 the blue sheet", async () => {
    const { drawTree } = await loadedSprites();
    const ctx = fakeCtx();
    drawTree(ctx, { plant: 1, owner: 0 }, 0, 0, 60);
    drawTree(ctx, { plant: 1, owner: 1 }, 0, 0, 60);
    expect(ctx.calls[0][0].src).toBe(
      "assets/carniflora-tree-plants-sheet4-1x.png",
    );
    expect(ctx.calls[1][0].src).toBe(
      "assets/carniflora-tree-plants-sheet4-1x-p2-blue.png",
    );
  });

  test("sits on its base: centred horizontally, bottom edge at baseY", async () => {
    const { drawTree } = await loadedSprites();
    const ctx = fakeCtx();
    drawTree(ctx, { plant: 0, owner: 0 }, 200, 300, 60);
    expect(ctx.calls[0].slice(5)).toEqual([170, 240, 60, 60]);
  });

  test("returns false for a plant with no tree instead of drawing garbage", async () => {
    const { drawTree } = await loadedSprites();
    const ctx = fakeCtx();
    expect(drawTree(ctx, { plant: 4, owner: 0 }, 0, 0, 60)).toBe(false);
    expect(drawTree(ctx, { plant: -1, owner: 0 }, 0, 0, 60)).toBe(false);
    expect(ctx.calls).toHaveLength(0);
  });
});
