import { describe, test, expect, vi, afterEach } from "vitest";

// US 6.4 — canvas tests for the shared damage visuals in src/js/plantFx.js.
// One mock canvas context records every call; both battle modes are covered:
//   normal battle kinds (PLANTS, field `radius`) and boss kinds (BOSS_KINDS, field `r`).

import { drawPlantHealthBar, drawPlantWithFx } from "../src/js/plantFx.js";
import { FLASH_DURATION } from "../src/js/damageCue.js";
import {
  CRING_PERIOD,
  CRING_RADIUS,
  HEALTH_BAR_W,
  HEALTH_BAR_H,
  HEALTH_BAR_BORDER,
} from "../src/js/plantHealth.js";
import { PLANTS, BOSS_KINDS } from "../src/js/plants.js";

// ---------------------------------------------------------------
// recording mock canvas (modeled on tests/sprites.test.js)
// ---------------------------------------------------------------

// fake canvas context that records every call
function fakeCtx() {
  return { calls: [] };
}

// Proxy wrapper (modeled on tests/sprites.test.js): unknown methods become
// no-ops that record `{ name, args }`; property reads/writes pass through.
function recordingCtx() {
  const target = fakeCtx();
  return new Proxy(target, {
    get(t, key) {
      if (key in t) return t[key];
      if (key === "createLinearGradient") return () => ({ addColorStop() {} });
      // snapshot styles at call time (mock does not model save/restore)
      return (...args) =>
        t.calls.push({
          name: String(key),
          args,
          style: {
            strokeStyle: t.strokeStyle,
            fillStyle: t.fillStyle,
            lineWidth: t.lineWidth,
            globalAlpha: t.globalAlpha,
            globalCompositeOperation: t.globalCompositeOperation,
          },
        });
    },
    set(t, key, value) {
      t[key] = value;
      return true;
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

// ---------------------------------------------------------------
// helpers
// ---------------------------------------------------------------

const PLANT_X = 100;
const PLANT_Y = 120;

// A damaged plant: flashing right now, ghost caught up, not shaking.
function plantOn(k, hpFrac, extra = {}) {
  return {
    x: PLANT_X,
    y: PLANT_Y,
    hp: k.hp * hpFrac,
    ghost: k.hp * hpFrac,
    shake: 0,
    cue: { flash: FLASH_DURATION, cd: 0 },
    ...extra,
  };
}

function drawOnce(
  ctx,
  plant,
  k,
  { reduced = false, now = 0, tintDraw, spriteY, spriteSize } = {},
) {
  drawPlantWithFx(ctx, plant, k, PLANT_Y - 20, reduced, now, {
    drawSprite: () => {},
    tintDraw,
    spriteY,
    spriteSize,
  });
  return ctx.calls;
}

function calls(callsList, name) {
  return callsList.filter((c) => c.name === name);
}

// The low-health ring is the only `ellipse` whose ry is CRING_RADIUS + 2.
function ringCalls(callsList) {
  return callsList.filter(
    (c) => c.name === "ellipse" && c.args[3] === CRING_RADIUS + 2,
  );
}

function ringRadius(call) {
  return call.args[2]; // ellipse(x, baseY, rx, ry, ...)
}

// ---------------------------------------------------------------
// BUG 1 — shape radius: normal kinds use `radius`, boss kinds use `r`
// ---------------------------------------------------------------

describe("BUG 1 — flash cue + low-health ring read `radius ?? r`", () => {
  test("boss plant flash cue + ring use BOSS_KINDS[k].r (finite, > 0, not NaN)", () => {
    const k = BOSS_KINDS[0];
    expect(k.radius).toBeUndefined(); // boss kinds carry `r`, not `radius`
    expect(k.r).toBeGreaterThan(0);

    const ctx = recordingCtx();
    const list = drawOnce(ctx, plantOn(k, 0.1), k); // low health -> ring shows

    // Part 1 flash: red-tint arc + white-outline arc, both at the real radius.
    const cueArcs = calls(list, "arc").map((c) => c.args[2]);
    expect(cueArcs.length).toBeGreaterThan(0);
    expect(cueArcs.every((r) => Number.isFinite(r) && r > 0)).toBe(true);
    expect(cueArcs).toContain(k.r); // cue radius is exactly the boss radius
    expect(cueArcs).toContain(k.r + 1); // outline sits 1px out

    // Part 2 ring: finite radius derived from the boss radius, not NaN.
    const rings = ringCalls(list);
    expect(rings).toHaveLength(1);
    const r = ringRadius(rings[0]);
    expect(Number.isFinite(r)).toBe(true);
    expect(r).toBeGreaterThan(k.r); // k.r + CRING_RADIUS + breathe
    expect(Number.isFinite(rings[0].args[1])).toBe(true); // baseY finite too
    expect(rings[0].args[1]).toBe(PLANT_Y + k.r + 3);
  });

  test("normal plant flash cue + ring use PLANTS[k].radius (finite, > 0)", () => {
    const k = PLANTS[0];
    expect(k.radius).toBeGreaterThan(0);

    const ctx = recordingCtx();
    const list = drawOnce(ctx, plantOn(k, 0.1), k);

    const cueArcs = calls(list, "arc").map((c) => c.args[2]);
    expect(cueArcs.every((r) => Number.isFinite(r) && r > 0)).toBe(true);
    expect(cueArcs).toContain(k.radius);

    const rings = ringCalls(list);
    expect(rings).toHaveLength(1);
    expect(Number.isFinite(ringRadius(rings[0]))).toBe(true);
    expect(ringRadius(rings[0])).toBeGreaterThan(k.radius);
  });

  test.each([
    ["normal", PLANTS],
    ["boss", BOSS_KINDS],
  ])(
    "every %s kind yields a finite positive ring/cue radius",
    (_mode, kinds) => {
      for (const k of kinds) {
        const ctx = recordingCtx();
        const list = drawOnce(ctx, plantOn(k, 0.1), k);
        const shapeR = k.radius ?? k.r;
        expect(shapeR).toBeGreaterThan(0);
        expect(
          calls(list, "arc").every((c) => Number.isFinite(c.args[2])),
        ).toBe(true);
        const rings = ringCalls(list);
        expect(rings).toHaveLength(1);
        expect(Number.isFinite(ringRadius(rings[0]))).toBe(true);
        expect(ringRadius(rings[0])).toBeGreaterThan(0);
      }
    },
  );
});

// ---------------------------------------------------------------
// BUG 2 — low-health ring only at 30% health or below
// ---------------------------------------------------------------

describe("BUG 2 — low-health ring only when isCritical(hp / k.hp)", () => {
  test.each([
    ["normal", PLANTS[0]],
    ["boss", BOSS_KINDS[0]],
  ])("%s: full-health plant draws NO ring", (_mode, k) => {
    const ctx = recordingCtx();
    const list = drawOnce(ctx, plantOn(k, 1), k); // 100% health
    expect(ringCalls(list)).toHaveLength(0);
  });

  test.each([
    ["normal", PLANTS[0]],
    ["boss", BOSS_KINDS[0]],
  ])("%s: plant above 30% health draws NO ring", (_mode, k) => {
    const ctx = recordingCtx();
    const list = drawOnce(ctx, plantOn(k, 0.5), k); // 50% health
    expect(ringCalls(list)).toHaveLength(0);
  });

  test.each([
    ["normal", PLANTS[0]],
    ["boss", BOSS_KINDS[0]],
  ])("%s: plant at exactly 30% health draws a ring", (_mode, k) => {
    const ctx = recordingCtx();
    const list = drawOnce(ctx, plantOn(k, 0.3), k); // 30% health
    expect(ringCalls(list)).toHaveLength(1);
  });

  test.each([
    ["normal", PLANTS[0]],
    ["boss", BOSS_KINDS[0]],
  ])("%s: plant at or below 30% health draws a ring", (_mode, k) => {
    const ctx = recordingCtx();
    const list = drawOnce(ctx, plantOn(k, 0.1), k); // 10% health
    expect(ringCalls(list)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------
// BUG 7 — slow pulse + perfectly still ring under reduced motion
// ---------------------------------------------------------------

describe("BUG 7 — slow low-health pulse, static under reduced motion", () => {
  test("CRING_PERIOD is slow (>= 2s)", () => {
    expect(CRING_PERIOD).toBeGreaterThanOrEqual(2);
  });

  test("normal pulse period is CRING_PERIOD seconds; `now` is ms", () => {
    const k = PLANTS[0];
    const sample = (nowMs) => {
      const ctx = recordingCtx();
      return ringRadius(
        ringCalls(drawOnce(ctx, plantOn(k, 0.1), k, { now: nowMs }))[0],
      );
    };
    const t0 = sample(0);
    // `now` in ms; angle = (now/1000) * (TAU / CRING_PERIOD)
    expect(sample(CRING_PERIOD * 1000)).toBeCloseTo(t0, 6); // full period
    expect(sample(CRING_PERIOD * 250)).not.toBeCloseTo(t0, 3); // quarter period
  });

  // Renderer-level: both renderers paint through drawPlantWithFx on a mock canvas.
  async function renderNormalOnce(ctx, nowMs, reduced, k) {
    vi.resetModules();
    vi.stubGlobal("document", {
      getElementById: () => ({
        width: 800,
        height: 600,
        getContext: () => ctx,
      }),
    });
    vi.stubGlobal("window", { matchMedia: () => ({ matches: reduced }) });
    vi.stubGlobal("performance", { now: () => nowMs });
    const { draw } = await import("../src/js/ui/render.js");
    const { state } = await import("../src/js/state.js");
    const p = plantOn(k, 0.1, { plant: PLANTS.indexOf(k), owner: 0 });
    Object.assign(state, {
      phase: "play",
      map: { paths: [] },
      enemies: [],
      myTowers: [],
      fx: [],
      seeds: [],
      plants: [p],
    });
    draw();
    return ctx.calls;
  }

  async function renderBossOnce(ctx, elapsedSec, reduced, k) {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: reduced }) });
    const { createBossLevelState } = await import("../src/js/bossLevel.js");
    const { drawBossLevel } = await import("../src/js/bossRenderer.js");
    const state = createBossLevelState(1);
    state.elapsed = elapsedSec;
    state.plants = [
      plantOn(k, 0.1, {
        k: BOSS_KINDS.indexOf(k),
        owner: 0,
        lane: 0,
        s: 0,
        cd: 0,
        slow: 0,
        formation: 0,
      }),
    ];
    drawBossLevel(ctx, state, 960);
    return ctx.calls;
  }

  test.each([
    ["normal", PLANTS[0]],
    ["boss", BOSS_KINDS[0]],
  ])(
    "renderer (%s): reduced motion -> ring stroke radius constant across two time samples",
    async (mode, k) => {
      const reduced = true;
      const renderOnce = mode === "boss" ? renderBossOnce : renderNormalOnce;
      // `now` is ms; boss renderer feeds elapsed*1000. Samples 900ms apart.
      const t1 = mode === "boss" ? 1 : 1000;
      const t2 = mode === "boss" ? 1.9 : 1900;
      const a = recordingCtx();
      const b = recordingCtx();
      const ringA = ringCalls(await renderOnce(a, t1, reduced, k));
      const ringB = ringCalls(await renderOnce(b, t2, reduced, k));
      expect(ringA.length).toBeGreaterThan(0);
      expect(ringB.length).toBeGreaterThan(0);
      expect(ringRadius(ringA[0])).toBe(ringRadius(ringB[0])); // still ring
    },
  );

  test.each([
    ["normal", PLANTS[0]],
    ["boss", BOSS_KINDS[0]],
  ])("renderer (%s): normal pulse period is slow (>= 2s)", async (_mode, k) => {
    expect(CRING_PERIOD).toBeGreaterThanOrEqual(2);
    // full period in ms returns to the same radius on the mock
    const renderOnce = _mode === "boss" ? renderBossOnce : renderNormalOnce;
    const a = recordingCtx();
    const b = recordingCtx();
    const t1 = _mode === "boss" ? 1 : 1000;
    const t2 = _mode === "boss" ? 1 + CRING_PERIOD : 1000 + CRING_PERIOD * 1000;
    const ringA = ringCalls(await renderOnce(a, t1, false, k));
    const ringB = ringCalls(await renderOnce(b, t2, false, k));
    expect(ringRadius(ringA[0])).toBeCloseTo(ringRadius(ringB[0]), 6);
  });
});

// ---------------------------------------------------------------
// BUG 6 — compact 28x5 bar + 1px dark border, still centred on plant.x
// ---------------------------------------------------------------

const BAR_W = 28;
const BAR_H = 5;
const BAR_BORDER_COLOR = "#0b1710";

describe("BUG 6 — 28x5 plant bar with 1px dark border", () => {
  const k = PLANTS[0]; // normal kind
  const TOP_Y = PLANT_Y - 20;

  function drawBar(ctx, plant, x = PLANT_X) {
    drawPlantHealthBar(ctx, x, TOP_Y, plant, k);
    return ctx.calls;
  }

  test("named constants: HEALTH_BAR_W=28, HEALTH_BAR_H=5, HEALTH_BAR_BORDER", () => {
    expect(HEALTH_BAR_W).toBe(BAR_W);
    expect(HEALTH_BAR_H).toBe(BAR_H);
    expect(HEALTH_BAR_BORDER).toBe(BAR_BORDER_COLOR);
  });

  test("background + coloured fill rectangles are 28 wide and 5 tall", () => {
    const ctx = recordingCtx();
    const list = drawBar(ctx, plantOn(k, 1)); // full health: fill spans whole bar
    const rects = calls(list, "fillRect");

    expect(rects.length).toBeGreaterThanOrEqual(2); // background + fill
    const [bg, fill] = rects;
    expect(bg.args[2]).toBe(BAR_W); // background width
    expect(bg.args[3]).toBe(BAR_H); // background height
    expect(fill.args[2]).toBe(BAR_W); // full-health fill width
    expect(fill.args[3]).toBe(BAR_H); // fill height
    for (const r of rects) {
      expect(r.args[3]).toBe(BAR_H); // every bar rect 5px tall
    }
  });

  test("white lost section keeps full 5px height, drawn before the coloured fill", () => {
    const ctx = recordingCtx();
    const list = drawBar(ctx, plantOn(k, 0.5, { ghost: k.hp })); // half lost
    const rects = calls(list, "fillRect");

    // background, white "lost" section, coloured fill
    expect(rects).toHaveLength(3);
    expect(rects[1].style.fillStyle).toBe("rgba(255,255,255,.85)");
    expect(rects[1].args[3]).toBe(BAR_H);
    expect(rects[1].args[2]).toBeCloseTo(BAR_W); // ghost at old reading
    expect(rects[2].args[2]).toBeCloseTo(BAR_W / 2); // coloured fill after loss
  });

  test("1px border strokeRect in HEALTH_BAR_BORDER around whole bar, after all fills", () => {
    const ctx = recordingCtx();
    const list = drawBar(ctx, plantOn(k, 0.5, { ghost: k.hp }));
    const strokes = calls(list, "strokeRect");

    expect(strokes).toHaveLength(1);
    const s = strokes[0];
    expect(s.style.strokeStyle).toBe(HEALTH_BAR_BORDER);
    expect(s.style.lineWidth).toBe(1);
    // roughly 28x5, sitting just outside the fill
    expect(Math.abs(s.args[2] - BAR_W)).toBeLessThanOrEqual(1);
    expect(Math.abs(s.args[3] - BAR_H)).toBeLessThanOrEqual(1);
    const left = PLANT_X - BAR_W / 2;
    expect(s.args[0]).toBeCloseTo(left - 0.5);
    expect(s.args[1]).toBeCloseTo(TOP_Y - 0.5);
    // border drawn after background + white lost + coloured fill
    const lastFill = list.map((c) => c.name).lastIndexOf("fillRect");
    const strokeIdx = list.findIndex((c) => c.name === "strokeRect");
    expect(strokeIdx).toBeGreaterThan(lastFill);
  });

  test("bar stays centred on plant.x, topY unchanged, no staggering", () => {
    for (const x of [PLANT_X, 37, 512]) {
      const ctx = recordingCtx();
      const list = drawBar(ctx, plantOn(k, 0.7), x);
      const bg = calls(list, "fillRect")[0];
      const s = calls(list, "strokeRect")[0];

      expect(bg.args[0] + bg.args[2] / 2).toBeCloseTo(x); // background centre
      expect(bg.args[1]).toBe(TOP_Y); // no vertical shift
      expect(s.args[0] + s.args[2] / 2).toBeCloseTo(x); // border centre
      expect(s.args[1]).toBeCloseTo(TOP_Y - 0.5); // border just outside, no shift
    }
  });

  test("end-to-end via drawPlantWithFx (normal kind PLANTS[0])", () => {
    const ctx = recordingCtx();
    const list = drawOnce(ctx, plantOn(k, 1), k);
    const rects = calls(list, "fillRect");
    const strokes = calls(list, "strokeRect");

    // no other rects are drawn by the no-op sprite; bar rects are 28x5
    const barRects = rects.filter((r) => r.args[3] === BAR_H);
    expect(barRects.length).toBeGreaterThanOrEqual(2);
    for (const r of barRects) {
      expect(r.args[0] + r.args[2] / 2).toBeCloseTo(PLANT_X);
    }
    expect(strokes).toHaveLength(1);
    expect(strokes[0].style.strokeStyle).toBe(HEALTH_BAR_BORDER);
  });
});

// ---------------------------------------------------------------
// BUG 3 — shape-masked tint: silhouette of the plant, no disc overlay
// ---------------------------------------------------------------

// `document` stub: document.createElement('canvas') returns a fake canvas with
// settable width/height and a recording 2D context (modelled on recordingCtx).
function stubDocument() {
  const created = [];
  vi.stubGlobal("document", {
    createElement(tag) {
      if (tag !== "canvas") return {};
      const canvas = {
        width: 0,
        height: 0,
        ctx: recordingCtx(),
        getContext(kind) {
          return kind === "2d" ? canvas.ctx : null;
        },
      };
      created.push(canvas);
      return canvas;
    },
  });
  return created;
}

// `tintDraw(ctx, x, y, size)` — caller draws the sprite frame silhouette.
const FAKE_SPRITE = { width: 64, height: 64 };
function spriteTint() {
  return (off, ox, oy, size) => {
    off.drawImage(FAKE_SPRITE, 0, 0, 64, 64, ox, oy, size, size);
  };
}

// `tintDraw` for a not-yet-loaded sprite: existing callers draw a filled circle.
function fallbackCircleTint(radius) {
  return (off, ox, oy, size) => {
    off.beginPath();
    off.arc(ox + size / 2, oy + size / 2, radius, 0, 7);
    off.fill();
  };
}

function offscreenCalls(canvas, name) {
  return canvas.ctx.calls.filter((c) => c.name === name);
}

const FLASH_TINT_MAX = 0.6; // red tint opacity at the start of a flash
const RED_SILHOUETTE = "rgba(255,45,45,1)";
const HALO_WHITE = "#ffffff";

describe("BUG 3 — shape-masked tint flash, no disc overlay", () => {
  const k = PLANTS[0];

  test("when flashing, NO disc `arc` is used to fill/outline the plant's flash", () => {
    const created = stubDocument();
    const ctx = recordingCtx();
    const list = drawOnce(ctx, plantOn(k, 0.5), k, { tintDraw: spriteTint() });

    // no arc on the main canvas at all — the flash is a blitted silhouette
    expect(calls(list, "arc")).toHaveLength(0);
    // ...and no disc drawn on top: flash blits are just the two silhouettes
    const blits = calls(list, "drawImage");
    expect(blits.length).toBe(2);
    expect(created.length).toBe(2); // two throwaway offscreen buffers
  });

  test("red fill (fillRect) on an offscreen buffer, masked with source-in; white halo blitted first", () => {
    const created = stubDocument();
    const ctx = recordingCtx();
    const list = drawOnce(ctx, plantOn(k, 0.5), k, { tintDraw: spriteTint() });

    expect(created.length).toBe(2);
    const [halo, core] = created;

    // core: sprite drawn, then source-in + red fill of the whole box
    const redFills = offscreenCalls(core, "fillRect").filter(
      (c) => c.style.fillStyle === RED_SILHOUETTE,
    );
    expect(redFills.length).toBe(1);
    expect(core.ctx.globalCompositeOperation).toBe("source-in");
    expect(redFills[0].args[2]).toBeGreaterThan(0); // whole box
    expect(redFills[0].args[3]).toBe(redFills[0].args[2]);

    // halo: same silhouette drawn larger, source-in + white fill
    const whiteFills = offscreenCalls(halo, "fillRect").filter(
      (c) => c.style.fillStyle === HALO_WHITE,
    );
    expect(whiteFills.length).toBe(1);
    expect(halo.ctx.globalCompositeOperation).toBe("source-in");

    // blit order on the real canvas: white halo first (behind), red tint on top
    const blits = calls(list, "drawImage");
    expect(blits[0].args[0]).toBe(halo);
    expect(blits[1].args[0]).toBe(core);
    // halo silhouette is larger than the core silhouette
    expect(blits[0].args[3]).toBeGreaterThan(blits[1].args[3]);

    // red tint translucent: globalAlpha = flashAlpha * FLASH_TINT_MAX
    expect(blits[1].style.globalAlpha).toBeCloseTo(FLASH_TINT_MAX);
    // face shows through: tint is not opaque
    expect(blits[1].style.globalAlpha).toBeLessThan(1);
  });

  test("flash follows a changed spriteY (draw-only; plant.y untouched)", () => {
    stubDocument();
    const plant = plantOn(k, 0.5);

    const a = recordingCtx();
    drawOnce(a, plant, k, { tintDraw: spriteTint() }); // default spriteY = plant.y
    const blitA = calls(a.calls, "drawImage").at(-1); // red silhouette blit

    const b = recordingCtx();
    drawOnce(b, plant, k, { tintDraw: spriteTint(), spriteY: PLANT_Y + 9 });
    const blitB = calls(b.calls, "drawImage").at(-1);

    expect(blitA.args[2]).not.toBe(blitB.args[2]); // blitted y differs
    expect(blitB.args[2] - blitA.args[2]).toBeCloseTo(9);
    expect(plant.y).toBe(PLANT_Y); // sim position unchanged
  });

  test("fallback shape (no sprite loaded) still tints a shape, not a disc over a sprite", () => {
    const created = stubDocument();
    const ctx = recordingCtx();
    // caller has no sprite; it draws the fallback circle as `tintDraw`
    const list = drawOnce(ctx, plantOn(k, 0.5), k, {
      tintDraw: fallbackCircleTint(k.radius),
    });

    // no disc overlay on the main canvas
    expect(calls(list, "arc")).toHaveLength(0);
    expect(calls(list, "drawImage").length).toBe(2); // masked silhouette blits

    const [halo, core] = created;
    // red-filled circle silhouette on the offscreen core...
    expect(
      offscreenCalls(core, "arc").length +
        offscreenCalls(core, "fillRect").length,
    ).toBeGreaterThan(0);
    expect(
      offscreenCalls(core, "fillRect").some(
        (c) => c.style.fillStyle === RED_SILHOUETTE,
      ),
    ).toBe(true);
    // ...and a white halo one size up on the offscreen halo
    expect(
      offscreenCalls(halo, "fillRect").some(
        (c) => c.style.fillStyle === HALO_WHITE,
      ),
    ).toBe(true);
  });

  test("headless (no document / no 2D offscreen) draws shape flat, no throw", () => {
    vi.stubGlobal("document", undefined);
    const ctx = recordingCtx();
    const list = drawOnce(ctx, plantOn(k, 0.5), k); // no tintDraw either

    // flat fallback: red fill of the shape + white outline of its bounding circle
    const arcs = calls(list, "arc");
    expect(arcs.length).toBeGreaterThan(0);
    expect(arcs.every((c) => Number.isFinite(c.args[2]) && c.args[2] > 0)).toBe(
      true,
    );
    expect(calls(list, "drawImage").length).toBe(0); // no offscreen blit
  });

  test("under reduced motion the ring stays still (flash unaffected)", () => {
    stubDocument();
    const kk = k;
    const sample = (nowMs) => {
      const ctx = recordingCtx();
      return ringRadius(
        ringCalls(
          drawOnce(ctx, plantOn(kk, 0.1), kk, {
            reduced: true,
            now: nowMs,
            tintDraw: spriteTint(),
          }),
        )[0],
      );
    };
    expect(sample(1000)).toBe(sample(1900)); // still ring under reduced motion
  });
});
