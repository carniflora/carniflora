import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBattle } from "../src/js/battle.js";
import { Action, GRACE_MS } from "../src/js/network/protocol.js";

const driver = vi.hoisted(() => ({
  send: vi.fn(() => true),
  close: vi.fn(),
  handlers: null,
}));
vi.mock("../src/js/network/transport.js", () => ({
  connectSocket: vi.fn((key, token, handlers) => {
    driver.handlers = handlers;
    return driver;
  }),
  createSession: vi.fn(async () => ({ key: "ABCDEFGHJKLM", token: "creator" })),
}));

let service;
let local;
let tab;
let hooks;

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  driver.send.mockClear();
  driver.close.mockClear();
  local = storage();
  tab = storage();
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("sessionStorage", tab);
  service = (await import("../src/js/battleService.js")).battleService;
  hooks = { snapshot: vi.fn(), end: vi.fn(), status: vi.fn(), player: vi.fn() };
  service.mount(hooks);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Online battle service", () => {
  it("submits intent without changing local combat and never resends commands", async () => {
    await service.create();
    const battle = createBattle(1);
    driver.handlers.message({ type: "welcome", player: 0, token: "creator" });
    driver.handlers.message({
      type: "snapshot",
      sequence: 1,
      ready: true,
      snapshot: battle.snapshot(),
    });
    const state = (await import("../src/js/state.js")).state;
    service.submit({ type: Action.START });
    expect(state.phase).toBe("menu");
    expect(driver.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: { type: Action.START },
        generation: 0,
        requestId: 1,
      }),
    );
    driver.send.mockClear();
    driver.handlers.status("Reconnecting");
    driver.handlers.message({ type: "welcome", player: 0, token: "creator" });
    driver.handlers.message({
      type: "snapshot",
      sequence: 2,
      ready: true,
      snapshot: battle.snapshot(),
    });
    expect(driver.send.mock.calls.every(([m]) => m.type === "ack")).toBe(true);
    expect(service.ready()).toBe(true);
  });

  it("saves advancement without reducing existing progress", async () => {
    local.setItem("carniflora.level", 3);
    await service.create();
    driver.handlers.message({ type: "welcome", player: 1, token: "guest" });
    driver.handlers.message({
      type: "snapshot",
      sequence: 1,
      ready: true,
      snapshot: createBattle(1).snapshot(),
    });
    driver.handlers.message({
      type: "snapshot",
      sequence: 2,
      ready: true,
      snapshot: createBattle(2).snapshot(),
    });
    expect(local.getItem("carniflora.level")).toBe("3");
    local.setItem("carniflora.level", 1);
    driver.handlers.message({
      type: "snapshot",
      sequence: 3,
      ready: true,
      snapshot: createBattle(2).snapshot(),
    });
    expect(local.getItem("carniflora.level")).toBe("2");
    expect(tab.getItem("carniflora.session")).toContain("guest");
  });

  it("restores tab identity, rejects stale snapshots and clears ended sessions", () => {
    tab.setItem(
      "carniflora.session",
      JSON.stringify({ key: "ABCDEFGHJKLM", token: "guest" }),
    );
    service.restore();
    expect(service.online()).toBe(true);
    const snapshot = createBattle(1).snapshot();
    driver.handlers.message({
      type: "snapshot",
      sequence: 2,
      ready: true,
      snapshot,
    });
    driver.handlers.message({
      type: "snapshot",
      sequence: 1,
      ready: false,
      snapshot,
    });
    expect(hooks.snapshot).toHaveBeenCalledTimes(1);
    driver.handlers.message({
      type: "snapshot",
      sequence: 3,
      ended: "Player left",
    });
    expect(service.online()).toBe(false);
    expect(tab.getItem("carniflora.session")).toBeNull();
    expect(driver.close).toHaveBeenCalled();
  });

  it("bounds failed reconnect attempts and can open another session afterwards", () => {
    service.join("abcdefghjklm");
    driver.handlers.status("Reconnecting");
    vi.advanceTimersByTime(GRACE_MS);
    expect(service.online()).toBe(false);
    service.join("ABCDEFGHJKLM");
    driver.handlers.status("Reconnecting");
    vi.advanceTimersByTime(GRACE_MS);
    expect(hooks.end).toHaveBeenCalledTimes(2);
  });
});
