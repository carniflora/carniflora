import { state, loadProgress, saveProgress, normalLevel } from "./state.js";
import { effects } from "./effects.js";
import { applySnapshot } from "./battle.js";
import { placeTower } from "./towers.js";
import { connectSocket, createSession } from "./network/transport.js";
import { Action, KEY_PATTERN, GRACE_MS } from "./network/protocol.js";

const STORAGE_KEY = "carniflora.session";
let connection = null;
let identity = null;
let hooks = {};
let generation = 0;
let sequence = 0;
let requestId = 0;
let ready = false;
let initialLevel = null;
let expiry;

function remember() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    /* Play can continue without refresh recovery. */
  }
}

function end(reason) {
  connection?.close();
  connection = null;
  identity = null;
  ready = false;
  clearTimeout(expiry);
  expiry = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Storage may be restricted. */
  }
  hooks.end?.(reason);
}

function open(key, token = null) {
  if (!KEY_PATTERN.test(key)) {
    throw new Error("Enter a valid 12-character session key");
  }
  identity = { key, token };
  generation = 0;
  sequence = 0;
  requestId = 0;
  initialLevel = null;
  ready = false;
  hooks.enter?.(key);
  connection = connectSocket(key, token, {
    status(message) {
      ready = false;
      if (!expiry) {
        expiry = setTimeout(
          () => end("Unable to reconnect; session expired"),
          GRACE_MS,
        );
      }
      hooks.status?.(message);
    },
    end,
    message(message) {
      if (message.type === "welcome") {
        identity.token = message.token;
        identity.player = message.player;
        remember();
        hooks.player?.(message.player);
      }
      if (
        message.type === "error" ||
        (message.type === "result" && !message.ok)
      ) {
        hooks.error?.(message.error);
      }
      if (message.type !== "snapshot" || message.sequence <= sequence) {
        return;
      }
      if (message.ended) {
        end(message.ended);
        return;
      }
      clearTimeout(expiry);
      expiry = null;
      sequence = message.sequence;
      connection?.send({ type: "ack", sequence });
      generation = message.snapshot.generation;
      ready = message.ready;
      initialLevel ??= message.snapshot.level;
      applySnapshot(state, effects, message.snapshot);
      if (state.level > initialLevel) {
        saveProgress(Math.max(loadProgress(), state.level));
      }
      hooks.snapshot?.(message);
    },
  });
}

export const battleService = {
  mount(callbacks) {
    hooks = callbacks;
  },
  online() {
    return identity !== null;
  },
  ready() {
    return ready;
  },
  async create() {
    const result = await createSession(normalLevel(loadProgress()));
    open(result.key, result.token);
  },
  join(key) {
    open(key.trim().toUpperCase());
  },
  restore() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (saved?.token && KEY_PATTERN.test(saved.key)) {
        open(saved.key, saved.token);
      }
    } catch {
      /* A stale saved identity must not prevent local play. */
    }
  },
  key() {
    return identity?.key ?? "";
  },
  submit(action) {
    if (!connection || (!ready && action.type !== Action.LEAVE)) {
      hooks.status?.("Waiting for both players");
      return false;
    }
    return connection.send({
      type: "command",
      requestId: ++requestId,
      generation,
      action,
    });
  },
  place(c, r, plant, player) {
    if (identity) {
      return this.submit({ type: Action.PLACE, c, r, plant });
    }
    return placeTower(c, r, plant, player);
  },
  leave() {
    if (!this.submit({ type: Action.LEAVE })) {
      hooks.status?.(
        "Reconnect before leaving; closing this tab reserves your slot for two minutes.",
      );
    }
  },
};
