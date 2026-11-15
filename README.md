# Carniflora — Developer Setup

---

## Prerequisites

- **Node.js**: v24 (LTS)
- **npm** (bundled with Node.js)

---

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone https://github.com/carniflora/carniflora.git
   cd carniflora
   ```

2. **Install dependencies:**
   ```bash
   npm ci
   ```

---

## Local game server

Run `npm run dev`, then open the printed URL. Wrangler serves the game and
WebSocket backend together. Static-only hosting supports local play only.

## Online multiplayer

1. Select **Create Session** and share the generated key.
2. On another browser or device, enter the key and select **Join Session**.
3. Once both players connect, either may start the normal battle.

Each browser controls one player. Tower ownership, two-player maps, costs,
and shared spores follow local multiplayer rules. Tab switches players only
in local play. Boss battles remain local.

Either player may pause, resume, restart, or advance. Sessions start at the
creator's saved level. Advancing saves progress in both browsers without
reducing existing progress.

A refresh or connection loss pauses combat and reserves the player's slot
for two minutes. Return in the same browser tab, then resume explicitly.
Private reconnect tokens stay in session storage; share only the session key.
Unjoined lobbies expire after ten minutes. **Leave Session** ends the room
for both players. Server restarts also end active sessions.

## Cloudflare deployment

The existing main-branch deployment now includes a Worker and a SQLite-backed
Durable Object binding (`ROOMS`), with one object per session. The Cloudflare
account must support Durable Objects. Active matches keep their object running;
normal Worker and Durable Object usage charges apply.

Run `npm run worker:check` to bundle and validate without deploying. Server
code lives in `server/`, outside publicly served `src/`. The root `wrangler.toml`
also keeps local runtime artifacts outside `src/`. Battle state is kept
in memory; lifecycle metadata prevents interrupted rooms from being reused.

---

## Available Scripts

| Command                | Description                                  |
| :--------------------- | :------------------------------------------- |
| `npm test`             | Run the test suite once via Vitest           |
| `npm run test:watch`   | Run Vitest in interactive watch mode         |
| `npm run lint`         | Lint all files with ESLint                   |
| `npm run format`       | Auto-format all files in place with Prettier |
| `npm run format:check` | Check formatting without writing changes     |

---

## Development Workflow

- **Tests:** Place test suites inside the `tests/` directory matching `*.test.js` or `*.spec.js`.
- **Pre-commit check:** Lint, check formatting, and run tests:
  ```bash
  npm run lint && npm run format:check && npm test
  ```
