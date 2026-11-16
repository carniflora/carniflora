import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectSocket } from "../src/js/network/transport.js";
import { VERSION, CLOSE, TIMEOUT_MS } from "../src/js/network/protocol.js";

let sockets;
let handlers;

class Socket {
  static OPEN = 1;
  readyState = 0;
  sent = [];

  constructor(url) {
    this.url = url;
    sockets.push(this);
  }
  send(raw) {
    this.sent.push(JSON.parse(raw));
  }
  close(code = CLOSE.NORMAL, reason = "") {
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }
  open() {
    this.readyState = Socket.OPEN;
    this.onopen();
  }
  message(message) {
    this.onmessage({ data: JSON.stringify({ version: VERSION, ...message }) });
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  sockets = [];
  handlers = { status: vi.fn(), message: vi.fn(), end: vi.fn() };
  vi.stubGlobal("WebSocket", Socket);
  vi.stubGlobal("location", { href: "https://game/" });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("WebSocket driver", () => {
  it("reconnects using the private identity without replaying commands", () => {
    const driver = connectSocket("ABCDEFGHJKLM", null, handlers);
    const first = sockets[0];
    first.open();
    expect(first.url.protocol).toBe("wss:");
    first.message({ type: "welcome", token: "private-player-token" });
    driver.send({ type: "command", requestId: 1 });
    first.close(CLOSE.RETRY, "Connection lost");
    vi.advanceTimersByTime(500);
    const second = sockets[1];
    second.open();
    expect(second.sent).toEqual([
      { version: VERSION, type: "join", token: "private-player-token" },
    ]);
    driver.close();
    vi.advanceTimersByTime(TIMEOUT_MS);
    expect(sockets).toHaveLength(2);
  });

  it("retries a silent connection instead of treating it as a completed session", () => {
    const driver = connectSocket("ABCDEFGHJKLM", "token", handlers);
    sockets[0].open();
    vi.advanceTimersByTime(TIMEOUT_MS + 500);
    expect(sockets).toHaveLength(2);
    expect(handlers.end).not.toHaveBeenCalled();
    driver.close();
  });

  it("reports policy rejections without retrying", () => {
    const driver = connectSocket("ABCDEFGHJKLM", null, handlers);
    sockets[0].open();
    sockets[0].close(CLOSE.POLICY, "Session is full");
    expect(handlers.end).toHaveBeenCalledWith("Session is full");
    vi.advanceTimersByTime(TIMEOUT_MS);
    expect(sockets).toHaveLength(1);
    driver.close();
  });
});
