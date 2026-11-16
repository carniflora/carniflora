import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { Action, VERSION, HTTP } from "../src/js/network/protocol.js";

let runtime;

async function session() {
  const response = await runtime.dispatchFetch("https://game/api/sessions", {
    method: "POST",
    body: JSON.stringify({ version: VERSION, level: 1 }),
  });
  expect(response.status).toBe(HTTP.CREATED);
  return response.json();
}

async function join(key, token = null) {
  const response = await runtime.dispatchFetch(
    `https://game/api/sessions/${key}/ws`,
    { headers: { Upgrade: "websocket" } },
  );
  expect(response.status).toBe(HTTP.UPGRADE);
  const ws = response.webSocket;
  const messages = [];
  const pending = [];
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    messages.push(message);
    for (const waiter of [...pending]) {
      if (waiter.match(message)) {
        pending.splice(pending.indexOf(waiter), 1);
        clearTimeout(waiter.timer);
        waiter.resolve(message);
      }
    }
  });
  ws.accept();
  ws.send(JSON.stringify({ type: "join", version: VERSION, token }));
  return {
    ws,
    wait(match) {
      const found = messages.find(match);
      if (found) {
        return Promise.resolve(found);
      }
      return new Promise((resolve, reject) => {
        const waiter = {
          match,
          resolve,
          timer: setTimeout(
            () => reject(new Error("Timed out waiting for WebSocket message")),
            3000,
          ),
        };
        pending.push(waiter);
      });
    },
    command(type, requestId, generation) {
      ws.send(
        JSON.stringify({
          version: VERSION,
          requestId,
          generation,
          action: { type },
        }),
      );
    },
  };
}

beforeAll(async () => {
  const bundled = await build({
    entryPoints: ["server/worker.js"],
    bundle: true,
    write: false,
    format: "esm",
    external: ["cloudflare:workers"],
  });
  runtime = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: bundled.outputFiles[0].text,
      compatibilityDate: "2026-09-30",
      durableObjects: { ROOMS: { className: "GameRoom", useSQLite: true } },
      serviceBindings: { ASSETS: () => new Response("static asset") },
    }),
  );
  await runtime.ready;
}, 20_000);

afterAll(async () => {
  await runtime?.dispose();
});

describe("Cloudflare WebSocket integration", () => {
  it("serves assets and validates session requests and origins", async () => {
    expect(await (await runtime.dispatchFetch("https://game/")).text()).toBe(
      "static asset",
    );
    expect(
      (await runtime.dispatchFetch("https://game/api/sessions")).status,
    ).toBe(HTTP.METHOD);
    expect(
      (
        await runtime.dispatchFetch("https://game/api/sessions", {
          method: "POST",
          body: "{}",
        })
      ).status,
    ).toBe(HTTP.BAD_REQUEST);
    expect(
      (
        await runtime.dispatchFetch("https://game/api/sessions", {
          method: "POST",
          headers: { Origin: "https://other" },
          body: "{}",
        })
      ).status,
    ).toBe(HTTP.FORBIDDEN);
    expect(
      (await runtime.dispatchFetch("https://game/api/sessions/ABCDEFGHJKLM/ws"))
        .status,
    ).toBe(HTTP.NOT_FOUND);
  });

  it("joins two browsers, shares controls and restores a disconnected player", async () => {
    const { key, token } = await session();
    const creator = await join(key, token);
    const a = await creator.wait((m) => m.type === "welcome");
    expect(a.player).toBe(0);
    const guest = await join(key);
    const b = await guest.wait((m) => m.type === "welcome");
    expect(b.player).toBe(1);
    await creator.wait((m) => m.type === "snapshot" && m.ready);
    guest.command(Action.START, 1, 0);
    const started = await creator.wait(
      (m) => m.type === "snapshot" && m.snapshot.phase === "play",
    );
    expect(started.snapshot.generation).toBe(1);
    const duplicate = await join(key, token);
    expect((await duplicate.wait((m) => m.type === "error")).error).toMatch(
      /already/,
    );
    const third = await join(key);
    expect((await third.wait((m) => m.type === "error")).error).toMatch(/full/);
    guest.ws.close();
    await creator.wait(
      (m) => m.type === "snapshot" && !m.ready && m.snapshot.phase === "pause",
    );
    const returned = await join(key, b.token);
    expect((await returned.wait((m) => m.type === "welcome")).player).toBe(1);
    returned.command(Action.RESUME, 1, 1);
    await returned.wait(
      (m) => m.type === "snapshot" && m.snapshot.phase === "play",
    );
    returned.command(Action.LEAVE, 2, 1);
    expect(
      (await creator.wait((m) => m.type === "snapshot" && m.ended)).ended,
    ).toMatch(/left/);
  });

  it("rejects an unknown key with a visible WebSocket error", async () => {
    const missing = await join("ABCDEFGHJKLM");
    expect((await missing.wait((m) => m.type === "error")).error).toMatch(
      /Unknown/,
    );
  });
});
