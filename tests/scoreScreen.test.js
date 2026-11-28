import { beforeEach, describe, expect, test, vi } from "vitest";

const ui = vi.hoisted(() => ({ nodes: {}, phase: "won" }));

vi.mock("../src/js/ui/dom.js", () => ({
  dom: () => ({ $: (id) => ui.nodes[id] }),
}));

vi.mock("../src/js/ui/session.js", () => ({
  activePhase: () => ui.phase,
}));

function node() {
  const listeners = {};
  const classes = new Set();
  return {
    hidden: false,
    value: "",
    textContent: "",
    dataset: {},
    classes,
    classList: { add: (name) => classes.add(name) },
    focus() {},
    addEventListener: (type, fn) => (listeners[type] = fn),
    fire: (type) => listeners[type]?.({ preventDefault() {} }),
  };
}

const IDS = [
  "ob",
  "ob2",
  "ov",
  "scoreConfirm",
  "scoreForm",
  "scorePanel",
  "scoreMode",
  "scoreLevel",
  "scoreTime",
  "scoreSpores",
  "scoreLost",
  "scoreTotal",
  "scoreName1",
  "scoreName2",
  "scoreName2Field",
  "scoreSkip",
];

let screen;
let storage;

const win = (winId, online = true) => ({
  winId,
  online,
  isBoss: false,
  level: 1,
  players: 2,
  elapsed: 142,
  spores: 64,
  plantsLost: 7,
});

beforeEach(async () => {
  vi.resetModules();
  ui.phase = "won";
  ui.nodes = Object.fromEntries(IDS.map((id) => [id, node()]));

  const resolved = new Set();
  storage = {
    isResolved: (id) => resolved.has(id),
    save: vi.fn((id) => {
      resolved.add(id);
      return { ok: true };
    }),
    skip: vi.fn((id) => {
      resolved.add(id);
      return { ok: true };
    }),
  };

  screen = await import("../src/js/ui/scoreScreen.js");
  screen.mountScoreScreen(storage);
});

describe("score screen", () => {
  test("blank nickname keeps the form open", () => {
    screen.present(win("a"));
    ui.nodes.scoreForm.fire("submit");

    expect(ui.nodes.scoreForm.hidden).toBe(false);
    expect(ui.nodes.ob.hidden).toBe(true);
    expect(storage.save).not.toHaveBeenCalled();
  });

  test.each(["scoreSkip", "scoreForm"])("%s clears pending", (id) => {
    screen.present(win("a"));
    ui.nodes.scoreName1.value = "Fern";
    ui.nodes.scoreName2.value = "Moss";
    ui.nodes[id].fire(id === "scoreForm" ? "submit" : "click");

    expect(screen.hasPending()).toBe(false);
  });

  test("a handled win is not offered again", () => {
    screen.present(win("a"));
    ui.nodes.scoreSkip.fire("click");
    screen.resetScoreScreen();
    screen.present(win("a"));

    expect(screen.hasPending()).toBe(false);
    expect(ui.nodes.scorePanel.hidden).toBe(true);
  });

  test("holds the latest peer overlay until resolved", () => {
    const stale = vi.fn();
    const latest = vi.fn();
    screen.present(win("a"));
    ui.phase = "pause";

    expect(screen.holdOverlay(stale)).toBe(true);
    expect(screen.holdOverlay(latest)).toBe(true);
    ui.nodes.scoreSkip.fire("click");

    expect(stale).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledOnce();
  });

  test("never holds overlays in local play", () => {
    screen.present(win("a", false));
    ui.phase = "pause";

    expect(screen.holdOverlay(vi.fn())).toBe(false);
  });

  test("queues a second online win", () => {
    screen.present(win("a"));
    screen.present(win("b"));
    ui.nodes.scoreSkip.fire("click");
    ui.nodes.scoreSkip.fire("click");

    expect(storage.skip.mock.calls).toEqual([["a"], ["b"]]);
  });
});
