import { VERSION, HEARTBEAT_MS, TIMEOUT_MS, CLOSE } from "./protocol.js";

const RETRY_START_MS = 500;
const RETRY_MAX_MS = 5000;

// The service owns identity and commands; this driver only moves messages.
export function connectSocket(key, token, handlers) {
  let socket;
  let stopped = false;
  let retry;
  let heartbeat;
  let delay = RETRY_START_MS;
  let lastSeen = Date.now();

  function connect() {
    if (stopped) {
      return;
    }
    const url = new URL(`/api/sessions/${key}/ws`, location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(url);
    handlers.status("Connecting…");
    socket.onopen = () => {
      lastSeen = Date.now();
      socket.send(JSON.stringify({ version: VERSION, type: "join", token }));
      heartbeat = setInterval(() => {
        if (Date.now() - lastSeen >= TIMEOUT_MS) {
          socket.close(CLOSE.CLIENT_RETRY, "Heartbeat timeout");
          return;
        }
        send({ type: "ping" });
      }, HEARTBEAT_MS);
    };
    socket.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.version !== VERSION) {
        handlers.end("Incompatible server version");
        return;
      }
      lastSeen = Date.now();
      if (message.type === "welcome") {
        token = message.token;
        delay = RETRY_START_MS;
      }
      handlers.message(message);
    };
    socket.onclose = (event) => {
      clearInterval(heartbeat);
      if (stopped) {
        return;
      }
      if (event.code === CLOSE.NORMAL || event.code === CLOSE.POLICY) {
        handlers.end(event.reason || "Session ended");
        return;
      }
      handlers.status("Connection lost. Reconnecting…");
      retry = setTimeout(connect, delay);
      delay = Math.min(delay * 2, RETRY_MAX_MS);
    };
    // Upgrade failures do not expose HTTP response bodies to browsers.
    socket.onerror = () =>
      handlers.status("Cannot reach session. Reconnecting…");
  }

  function send(message) {
    if (stopped || socket?.readyState !== WebSocket.OPEN) {
      return false;
    }
    socket.send(JSON.stringify({ version: VERSION, ...message }));
    return true;
  }

  function close() {
    stopped = true;
    clearTimeout(retry);
    clearInterval(heartbeat);
    socket?.close();
  }

  connect();
  return { send, close };
}

export async function createSession(level) {
  const response = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version: VERSION, level }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Unable to create session");
  }
  return result;
}
