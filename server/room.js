import { createBattle, validLevel } from "../src/js/battle.js";
import {
  Action,
  VERSION,
  GRACE_MS,
  LOBBY_MS,
  TIMEOUT_MS,
  STEP_MS,
  SNAPSHOT_MS,
  MAX_MESSAGE,
  MAX_RATE,
  MAX_PENDING,
  CLOSE,
} from "../src/js/network/protocol.js";

const SECOND_MS = 1000;
const MAX_BUFFER = 256_000;

// Transport-independent room lifecycle; only the driver owns sockets/storage.
export function createRoom(level, now = Date.now(), creatorToken = null) {
  if (!validLevel(level)) {
    throw new Error("Invalid level");
  }
  const battle = createBattle(level);
  const players = [
    creatorToken
      ? { token: creatorToken, socket: null, deadline: now + GRACE_MS }
      : null,
    null,
  ];
  const created = now;
  let ended = null;
  let sequence = 0;
  let lastTick = now;
  let lastSnapshot = now;

  function ready() {
    return players.every((p) => p?.socket);
  }

  function send(socket, message) {
    try {
      if (socket.bufferedAmount > MAX_BUFFER) {
        socket.close(CLOSE.RETRY, "Connection too slow");
        return;
      }
      socket.send(JSON.stringify({ version: VERSION, ...message }));
    } catch {
      // Close callbacks or heartbeat expiry remove failed connections.
    }
  }

  function broadcast() {
    const message = {
      type: "snapshot",
      sequence: ++sequence,
      ready: ready(),
      ended,
      snapshot: battle.snapshot(),
    };
    for (const p of players) {
      if (p?.socket) {
        send(p.socket, message);
      }
    }
  }

  function finish(reason) {
    if (ended) {
      return;
    }
    ended = reason;
    broadcast();
    for (const p of players) {
      if (p?.socket) {
        p.socket.close(CLOSE.NORMAL, reason);
      }
    }
  }

  function attach(token, socket, time = Date.now()) {
    if (ended) {
      return { error: ended };
    }
    if (!players[1] && time - created >= LOBBY_MS) {
      finish("Lobby expired");
      return { error: ended };
    }
    const existing = players.findIndex((p) => p?.token === token);
    if (token && existing < 0) {
      return { error: "Invalid player token" };
    }
    const index = existing >= 0 ? existing : players.findIndex((p) => !p);
    if (index < 0) {
      return { error: "Session is full" };
    }
    const previous = players[index];
    if (previous?.socket) {
      return { error: "Player already connected" };
    }
    if (previous && time >= previous.deadline) {
      finish("Reconnect time expired");
      return { error: ended };
    }
    const p = {
      token: previous?.token ?? crypto.randomUUID(),
      socket,
      lastSeen: time,
      deadline: null,
      window: time,
      count: 0,
      lastRequest: 0,
      acked: sequence,
    };
    players[index] = p;
    lastTick = time;
    send(socket, { type: "welcome", player: index, token: p.token });
    broadcast();
    return { player: index };
  }

  function detach(socket, time = Date.now()) {
    const p = players.find((p) => p?.socket === socket);
    if (!p || ended) {
      return;
    }
    p.socket = null;
    p.deadline = time + GRACE_MS;
    battle.command({ type: Action.PAUSE }, 0);
    broadcast();
  }

  function receive(socket, raw, time = Date.now()) {
    const player = players.findIndex((p) => p?.socket === socket);
    if (player < 0 || ended) {
      return;
    }
    const p = players[player];
    if (time - p.window >= SECOND_MS) {
      p.window = time;
      p.count = 0;
    }
    if (
      ++p.count > MAX_RATE ||
      typeof raw !== "string" ||
      new TextEncoder().encode(raw).length > MAX_MESSAGE
    ) {
      detach(socket, time);
      socket.close(CLOSE.POLICY, "Message limit exceeded");
      return;
    }
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      message = null;
    }
    if (!message || message.version !== VERSION) {
      send(socket, {
        type: "error",
        error: "Invalid protocol version or message",
      });
      return;
    }
    p.lastSeen = time;
    if (message.type === "ping") {
      send(socket, { type: "pong" });
      return;
    }
    if (message.type === "ack") {
      if (
        Number.isSafeInteger(message.sequence) &&
        message.sequence <= sequence &&
        message.sequence > p.acked
      ) {
        p.acked = message.sequence;
      }
      return;
    }
    const { requestId, generation, action } = message;
    let error = null;
    if (
      !Number.isSafeInteger(requestId) ||
      requestId <= p.lastRequest ||
      !action ||
      typeof action !== "object"
    ) {
      error = "Invalid or duplicate command";
    } else {
      p.lastRequest = requestId;
      if (action.type === Action.LEAVE) {
        finish("Player left the session");
        return;
      }
      if (generation !== battle.generation()) {
        error = "Battle changed; try again";
      } else if (!ready()) {
        error = "Waiting for both players";
      } else if (!battle.command(action, player)) {
        error = "Action unavailable";
      }
    }
    send(socket, { type: "result", requestId, ok: !error, error });
    if (!error) {
      broadcast();
    }
  }

  function tick(time = Date.now()) {
    if (ended) {
      return;
    }
    if (!players[1] && time - created >= LOBBY_MS) {
      finish("Lobby expired");
      return;
    }
    for (const p of players) {
      if (
        p?.socket &&
        (time - p.lastSeen >= TIMEOUT_MS || sequence - p.acked > MAX_PENDING)
      ) {
        const socket = p.socket;
        detach(socket, time);
        socket.close(CLOSE.RETRY, "Heartbeat timeout or connection too slow");
      }
      if (p?.deadline && time >= p.deadline) {
        finish("Reconnect time expired");
        return;
      }
    }
    // Discard long scheduling gaps instead of fast-forwarding combat.
    const elapsed = Math.min(time - lastTick, SNAPSHOT_MS);
    const steps = Math.floor(elapsed / STEP_MS);
    if (ready()) {
      for (let i = 0; i < steps; i++) {
        battle.tick(STEP_MS / SECOND_MS);
      }
    }
    lastTick = time - (elapsed % STEP_MS);
    if (time - lastSnapshot >= SNAPSHOT_MS) {
      broadcast();
      lastSnapshot = time;
    }
  }

  return { attach, detach, receive, tick, finish, ended: () => ended };
}
