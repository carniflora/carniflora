import { describe, expect, it } from "vitest";
import { createBattle, applySnapshot } from "../src/js/battle.js";
import { createState } from "../src/js/state.js";
import { createEffects } from "../src/js/effects.js";
import { createTowers } from "../src/js/towers.js";
import { loadLevel } from "../src/js/levels.js";
import { PLANTS } from "../src/js/plants.js";
import { MAP_COLS, MAP_ROWS } from "../src/js/constants.js";
import {
  Action,
  VERSION,
  GRACE_MS,
  LOBBY_MS,
  TIMEOUT_MS,
  MAX_RATE,
  MAX_PENDING,
} from "../src/js/network/protocol.js";
import { createRoom } from "../server/room.js";

function socket() {
  const messages = [];
  return {
    messages,
    send(raw) {
      messages.push(JSON.parse(raw));
    },
    close(code, reason) {
      this.closed = { code, reason };
    },
    latest(type = "snapshot") {
      return messages.filter((m) => m.type === type).at(-1);
    },
  };
}

function freeCell(state, plant = 0, player = 0) {
  const towers = createTowers(state);
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (towers.canPlaceTower(c, r, plant, player)) {
        return { c, r };
      }
    }
  }
  throw new Error("No free placement cell");
}

function command(
  room,
  client,
  type,
  fields = {},
  requestId = 1,
  generation = 0,
  time = 0,
) {
  room.receive(
    client,
    JSON.stringify({
      version: VERSION,
      requestId,
      generation,
      action: { type, ...fields },
    }),
    time,
  );
}

describe("Independent shared simulation", () => {
  it("replaces a local map even after the UI has selected two players", () => {
    const state = createState();
    state.map = loadLevel(0, 1);
    state.players = 2;
    applySnapshot(state, createEffects(state), createBattle(1).snapshot());
    expect(state.map.paths).toHaveLength(2);
  });
  it("isolates room state and effects and preserves two-player limits", () => {
    const a = createBattle(1, () => 0.5);
    const b = createBattle(1, () => 0.5);
    a.command({ type: Action.START }, 0);
    a.effects.fire("empowered");
    const cell = freeCell(a.state);
    expect(a.command({ type: Action.PLACE, ...cell, plant: 0 }, 0)).toBe(true);
    expect(b.state.myTowers).toEqual([]);
    expect(b.effects.active).toEqual([]);
    expect(a.state.spores).toBe(180);
    expect(a.state.map.paths).toHaveLength(2);
  });

  it("round-trips paths, effects and the keep reference", () => {
    const a = createBattle(1);
    a.effects.fire("poisoned");
    const data = JSON.parse(JSON.stringify(a.snapshot()));
    const state = createState();
    const effects = createEffects(state);
    applySnapshot(state, effects, data);
    expect(state.keep).toBe(state.enemies.find((enemy) => enemy.keep));
    expect(state.map.blockPath).toBeInstanceOf(Set);
    expect(state.map.paths[0].positionAtDistance(0)).toHaveLength(2);
    expect(effects.displayList()[0].name).toBe("Poisoned");
  });

  it("serializes competing placements and shared spending", () => {
    const battle = createBattle(1);
    battle.command({ type: Action.START }, 0);
    const first = freeCell(battle.state);
    expect(battle.command({ type: Action.PLACE, ...first, plant: 0 }, 0)).toBe(
      true,
    );
    expect(battle.command({ type: Action.PLACE, ...first, plant: 0 }, 1)).toBe(
      false,
    );
    const second = freeCell(battle.state, 0, 1);
    expect(battle.command({ type: Action.PLACE, ...second, plant: 0 }, 1)).toBe(
      true,
    );
    battle.state.spores = PLANTS[0].cost;
    expect(battle.command({ type: Action.DEPLOY, plant: 0 }, 0)).toBe(true);
    expect(battle.command({ type: Action.DEPLOY, plant: 0 }, 1)).toBe(false);
    expect(battle.state.spores).toBe(0);
  });

  it("rejects invalid input and freezes paused combat", () => {
    const b = createBattle(1);
    expect(b.command({ type: Action.DEPLOY, plant: 0 }, 0)).toBe(false);
    b.command({ type: Action.START }, 0);
    expect(b.command({ type: Action.PLACE, plant: -1, c: 0, r: 0 }, 0)).toBe(
      false,
    );
    expect(b.command({ type: Action.PLACE, plant: 0, c: 1.5, r: 0 }, 0)).toBe(
      false,
    );
    b.command({ type: Action.PAUSE }, 1);
    const snapshot = b.snapshot();
    b.tick(10);
    expect(b.snapshot()).toEqual(snapshot);
    b.command({ type: Action.RESUME }, 0);
    b.state.phase = "won";
    expect(b.command({ type: Action.ADVANCE }, 1)).toBe(true);
    expect(b.state.level).toBe(2);
    expect(b.generation()).toBe(2);
  });
});

describe("Room lifecycle", () => {
  it("disconnects clients that stop acknowledging snapshots", () => {
    const room = createRoom(1, 0);
    const client = socket();
    room.attach(null, client, 0);
    for (let i = 1; i <= MAX_PENDING + 2; i++) {
      room.tick(i * 50);
    }
    expect(client.closed.reason).toMatch(/too slow/);
  });
  it("reserves creator identity and rejects invalid tokens, duplicate connections and full rooms", () => {
    const room = createRoom(1, 0, "creator");
    expect(room.attach("wrong", socket(), 0).error).toMatch(/Invalid/);
    const guest = socket();
    expect(room.attach(null, guest, 0).player).toBe(1);
    const creator = socket();
    expect(room.attach("creator", creator, 0).player).toBe(0);
    expect(room.attach("creator", socket(), 0).error).toMatch(/already/);
    expect(room.attach(null, socket(), 0).error).toMatch(/full/);
  });

  it("gates commands, derives ownership and rejects stale or duplicate requests", () => {
    const room = createRoom(1, 0);
    const a = socket();
    const b = socket();
    room.attach(null, a, 0);
    command(room, a, Action.START);
    expect(a.latest("result").error).toMatch(/both/);
    room.attach(null, b, 0);
    command(room, b, Action.START);
    expect(a.latest().snapshot.phase).toBe("play");
    command(room, a, Action.RESTART, {}, 2, 0);
    expect(a.latest("result").error).toMatch(/changed/);
    const snapshot = a.latest().snapshot;
    const restored = createState();
    applySnapshot(restored, createEffects(restored), snapshot);
    command(
      room,
      b,
      Action.PLACE,
      { ...freeCell(restored), plant: 0, player: 0 },
      2,
      1,
    );
    expect(a.latest().snapshot.myTowers[0].owner).toBe(1);
    command(room, b, Action.RESTART, {}, 2, 1);
    expect(b.latest("result").error).toMatch(/duplicate/);
  });

  it("pauses on loss, restores the same player and requires explicit resume", () => {
    const room = createRoom(1, 0);
    const a = socket();
    const b = socket();
    room.attach(null, a, 0);
    room.attach(null, b, 0);
    const token = b.latest("welcome").token;
    command(room, a, Action.START);
    room.detach(b, 100);
    expect(a.latest().snapshot.phase).toBe("pause");
    command(room, a, Action.RESUME, {}, 2, 1, 100);
    expect(a.latest("result").ok).toBe(false);
    const returned = socket();
    expect(room.attach(token, returned, 200).player).toBe(1);
    expect(returned.latest().snapshot.phase).toBe("pause");
    command(room, returned, Action.RESUME, {}, 1, 1, 200);
    expect(a.latest().snapshot.phase).toBe("play");
  });

  it("ends on grace expiry, lobby expiry and explicit leave", () => {
    const room = createRoom(1, 0);
    const a = socket();
    room.attach(null, a, 0);
    room.detach(a, 100);
    room.tick(100 + GRACE_MS);
    expect(room.ended()).toMatch(/Reconnect/);
    const lobby = createRoom(1, 0);
    lobby.tick(LOBBY_MS);
    expect(lobby.ended()).toMatch(/Lobby/);
    const left = createRoom(1, 0);
    const client = socket();
    left.attach(null, client, 0);
    command(left, client, Action.LEAVE);
    expect(client.latest().ended).toMatch(/left/);
  });

  it("disconnects silent or flooding clients and rejects malformed input", () => {
    const room = createRoom(1, 0);
    const a = socket();
    room.attach(null, a, 0);
    room.receive(a, "broken", 0);
    expect(a.latest("error").error).toMatch(/protocol/);
    room.tick(TIMEOUT_MS);
    expect(a.closed.reason).toMatch(/Heartbeat/);
    const b = socket();
    room.attach(a.latest("welcome").token, b, TIMEOUT_MS + 1);
    for (let i = 0; i <= MAX_RATE; i++) {
      room.receive(
        b,
        JSON.stringify({ version: VERSION, type: "ping" }),
        TIMEOUT_MS + 1,
      );
    }
    expect(b.closed.reason).toMatch(/limit/);
  });
});
