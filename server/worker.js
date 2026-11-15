import { DurableObject } from "cloudflare:workers";
import { createRoom } from "./room.js";
import { validLevel } from "../src/js/battle.js";
import {
  VERSION,
  KEY_LENGTH,
  KEY_PATTERN,
  HTTP,
  MAX_MESSAGE,
  STEP_MS,
  CLOSE,
} from "../src/js/network/protocol.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const META_KEY = "lifecycle";

function reply(error, status) {
  return Response.json({ error }, { status });
}

function rejectJoin(request, error, status) {
  if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
    return reply(error, status);
  }
  const [client, server] = Object.values(new WebSocketPair());
  server.accept();
  server.send(JSON.stringify({ version: VERSION, type: "error", error }));
  server.close(CLOSE.POLICY, error);
  return new Response(null, { status: HTTP.UPGRADE, webSocket: client });
}

function newKey() {
  return Array.from(
    crypto.getRandomValues(new Uint8Array(KEY_LENGTH)),
    (b) => ALPHABET[b % ALPHABET.length],
  ).join("");
}

// Only runtime callbacks are public; the driver delegates all game rules.
export class GameRoom extends DurableObject {
  #room = null;
  #timer = null;
  #seen = false;

  async fetch(request) {
    const url = new URL(request.url);
    const meta = await this.ctx.storage.get(META_KEY);
    if (!this.#seen) {
      this.#seen = true;
      if (meta) {
        await this.ctx.storage.put(META_KEY, {
          ended: "Session interrupted by server restart",
        });
      }
    }
    if (url.pathname.endsWith("/create")) {
      if (meta) {
        return reply("Key already used", HTTP.CONFLICT);
      }
      const { level } = await request.json();
      if (!validLevel(level)) {
        return reply("Invalid level", HTTP.BAD_REQUEST);
      }
      const creatorToken = crypto.randomUUID();
      this.#room = createRoom(level, Date.now(), creatorToken);
      await this.ctx.storage.put(META_KEY, { created: Date.now() });
      this.#timer = setInterval(() => {
        this.#room.tick();
        if (this.#room.ended()) {
          clearInterval(this.#timer);
          void this.ctx.storage.put(META_KEY, { ended: this.#room.ended() });
        }
      }, STEP_MS);
      return Response.json({ token: creatorToken }, { status: HTTP.CREATED });
    }
    if (!this.#room) {
      return rejectJoin(
        request,
        meta ? "Session interrupted by server restart" : "Unknown session key",
        meta ? HTTP.GONE : HTTP.NOT_FOUND,
      );
    }
    if (this.#room.ended()) {
      return rejectJoin(request, this.#room.ended(), HTTP.GONE);
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return reply("WebSocket required", HTTP.BAD_REQUEST);
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    let authenticated = false;
    const authTimer = setTimeout(
      () => server.close(CLOSE.POLICY, "Join timed out"),
      10_000,
    );
    server.addEventListener("message", (event) => {
      if (authenticated) {
        this.#room.receive(server, event.data);
        return;
      }
      clearTimeout(authTimer);
      let message;
      try {
        message =
          typeof event.data === "string" && event.data.length <= MAX_MESSAGE
            ? JSON.parse(event.data)
            : null;
      } catch {
        message = null;
      }
      if (
        message?.type !== "join" ||
        message.version !== VERSION ||
        (message.token != null && typeof message.token !== "string")
      ) {
        server.send(
          JSON.stringify({
            version: VERSION,
            type: "error",
            error: "Invalid join message",
          }),
        );
        server.close(CLOSE.POLICY, "Invalid join message");
        return;
      }
      const result = this.#room.attach(message.token, server);
      if (result.error) {
        server.send(
          JSON.stringify({
            version: VERSION,
            type: "error",
            error: result.error,
          }),
        );
        server.close(CLOSE.POLICY, result.error);
        return;
      }
      authenticated = true;
    });
    const disconnected = () => {
      clearTimeout(authTimer);
      if (authenticated) {
        this.#room.detach(server);
      }
    };
    server.addEventListener("close", disconnected);
    server.addEventListener("error", disconnected);
    return new Response(null, { status: HTTP.UPGRADE, webSocket: client });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) {
      return reply("Origin rejected", HTTP.FORBIDDEN);
    }
    if (url.pathname === "/api/sessions") {
      if (request.method !== "POST") {
        return reply("POST required", HTTP.METHOD);
      }
      if (Number(request.headers.get("Content-Length")) > MAX_MESSAGE) {
        return reply("Request too large", HTTP.TOO_LARGE);
      }
      let data;
      try {
        const raw = await request.text();
        if (raw.length > MAX_MESSAGE) {
          return reply("Request too large", HTTP.TOO_LARGE);
        }
        data = JSON.parse(raw);
      } catch {
        return reply("Invalid JSON", HTTP.BAD_REQUEST);
      }
      if (!data || data.version !== VERSION || !validLevel(data.level)) {
        return reply("Invalid version or level", HTTP.BAD_REQUEST);
      }
      for (let attempt = 0; attempt < 3; attempt++) {
        const key = newKey();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(key));
        const response = await stub.fetch(
          new Request("https://room/create", {
            method: "POST",
            body: JSON.stringify(data),
          }),
        );
        if (response.status === HTTP.CONFLICT) {
          continue;
        }
        const result = await response.json();
        return Response.json(
          { version: VERSION, key, ...result },
          { status: response.status },
        );
      }
      return reply("Unable to create session; try again", HTTP.CONFLICT);
    }
    const match = url.pathname.match(/^\/api\/sessions\/([^/]+)\/ws$/);
    if (!match || !KEY_PATTERN.test(match[1])) {
      return reply("Unknown session key", HTTP.NOT_FOUND);
    }
    if (request.method !== "GET") {
      return reply("GET required", HTTP.METHOD);
    }
    return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request);
  },
};
