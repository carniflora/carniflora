# Carniflora Modularization Plan

Status: plan only. No behavior change, no gameplay change, no new dependencies.

Measured on branch `refactor/modular-architecture`, working tree clean. The brief's line counts for `main.js`, `game.js`, `levels.js`, and `path.js` do not match the repository; this plan uses measured values.

## 1. Baseline

### Current files

| File                      | Lines |
| ------------------------- | ----: |
| `src/main.js`             |  1144 |
| `src/game.js`             |   432 |
| `src/effects.js`          |   177 |
| `src/bossLanes.js`        |   572 |
| `src/bossRenderer.js`     |   564 |
| `src/bossLevel.js`        |     3 |
| `src/levels.js`           |    87 |
| `src/path.js`             |   160 |
| `src/kinds.js`            |    54 |
| `src/progress.js`         |    34 |
| `src/index.html`          |   359 |
| `src/style.css`           |  2134 |
| `tests/bossLevel.test.js` |   558 |
| `tests/effects.test.js`   |   157 |
| `tests/game.test.js`      |    55 |
| `tests/levels.test.js`    |    89 |
| `tests/progress.test.js`  |   110 |

### Green baseline

Node 24, npm, repository root:

```sh
npm ci
npm run lint
npm run format:check
npm test
```

Measured result: `npm run lint` passes, `npm run format:check` passes, `npm test` passes **83 tests in 5 files**.

Current test imports that must keep working:

- `tests/game.test.js`: `build, canPlaceTower, deploySelected, placeTower, PLANTS, sendOut, state` from `src/game.js`; `MAP_COLS, MAP_ROWS` from `src/levels.js`.
- `tests/effects.test.js`: `effects, RNG, EVENTS` from `src/effects.js`; `state` from `src/game.js`. The poison test proves `effects` and `game` must share one `state` instance.
- `tests/progress.test.js`: `build, maxSpores, state` from `src/game.js`.
- `tests/levels.test.js`: `makeCells` from `src/levels.js`.
- `tests/bossLevel.test.js`: public boss exports from `src/bossLevel.js`; `KINDS` from `src/kinds.js`.

No test imports `src/main.js`. That is why no UI module may touch `document` at import time.

### Verification shorthand used below

```sh
# V
npm run lint && npm run format:check && npm test

# Vd: V plus DOM-free import smoke test
node --input-type=module -e "await import('./src/game.js'); await import('./src/effects.js')"

# B: browser smoke test
python3 -m http.server 8000 --directory src
# open http://localhost:8000 ; check console, TD place/deploy, boss toggle,
# tabs, 2P toggle, pause, reload/level restore.
```

Rollback shorthand: one commit per step. `git revert <sha>`. Before committing: `git checkout -- <touched files>` and delete newly added files.

## 2. Target module map

Existing domain file paths stay in place so tests and `src/index.html` do not change. New UI code goes under `src/ui/`.

```text
src/
  main.js                 Entry point: imports ui/app.js and calls boot(). Nothing else.
  ui/
    app.js                Composition root: creates DOM refs, mounts views/input, initializes state, starts loop.
    dom.js                Lazily resolves document, canvas, 2d context; canvas resize helper. Only DOM leaf.
    session.js            UI session: mode, boss instance, selection, active player, hover cell; active*() helpers.
    assets.js             Presentation data: plant image paths, roles, role icons, progression cards.
    messages.js           showPlantMessage(text).
    overlay.js            show(title, message, buttonLabel) and overlay visibility.
    tabs.js               Nav queries, setActiveTab(), mountTabs().
    details.js            showPlantDetails(index): right panel + plant card selection.
    plantGrid.js          Creates plant cards; mountPlantGrid(callbacks).
    bossControls.js       Creates lane/deploy buttons; exports live button arrays; mountBossControls(callbacks).
    progression.js        renderEvolutionCards() and its presentation data.
    hud.js                hud(): header values, deploy-button state, boss objective/hazard text.
    render.js             healthBar() and draw(): TD canvas rendering.
    flow.js               deploy, startLevel, toggleMode, pause, setActivePlayer, setPlayers, setBossLane, primaryAction.
    loop.js               startLoop(): fixed update/render phase, overlay text on phase change.
    input.js              mountInput(): pause/mode/restart/overlay buttons, canvas mouse/click, keyboard.
  state.js                Mutable TD battle state singleton. No imports.
  constants.js            TILE and TD tuning constants. No imports.
  plants.js               PLANTS data. No imports.
  economy.js              maxSpores(). Imports state.
  geometry.js             posOf(path, distance). Imports TILE.
  build.js                build(): level, keep, minions, effect reset.
  towers.js               Tower placement and deployment rules.
  combat.js               update(deltaTime), end(win); private nearest().
  game.js                 Public TD domain facade. Re-exports only.
  effects.js              Effects engine. Imports state.js only.
  levels.js               Map dimensions, cell generation, level loading. Unchanged.
  path.js                 LEVEL_PATHS data. Unchanged.
  kinds.js                Boss plant data. Unchanged.
  progress.js             localStorage checkpoint. Unchanged.
  bossLanes.js            Boss simulation and boss constants. Unchanged.
  bossRenderer.js         Boss canvas renderer. Unchanged.
  bossLevel.js            Boss public facade. Unchanged.
```

### `main.js` section mapping (current line numbers)

| Current lines | Section                                         | Destination                            |
| ------------- | ----------------------------------------------- | -------------------------------------- |
| 32-42         | `$`, canvas, context                            | `ui/dom.js`                            |
| 56-75         | mode, boss instance, selection, active* helpers | `ui/session.js`                        |
| 77-82         | image paths                                     | `ui/assets.js`                         |
| 88-127        | progression data                                | `ui/assets.js`                         |
| 132-141       | active player, `setActivePlayer`                | session state + `ui/flow.js`           |
| 147-177       | `deploy`                                        | `ui/flow.js`                           |
| 182-188       | `show`                                          | `ui/overlay.js`                        |
| 193-245       | `startLevel`, `toggleMode`, `pause`             | `ui/flow.js`                           |
| 251-290       | button wiring, overlay action                   | `ui/input.js` + `ui/flow.js`           |
| 293-340       | cell conversion, hover, canvas click            | `ui/input.js`; hover cell in `session` |
| 346-374       | keydown                                         | `ui/input.js`                          |
| 387-435       | tabs                                            | `ui/tabs.js`                           |
| 441-464       | player toggle                                   | `ui/flow.js` + `ui/input.js`           |
| 470-472       | plant message                                   | `ui/messages.js`                       |
| 479-556       | plant details                                   | `ui/details.js`                        |
| 558-571       | roles/icons                                     | `ui/assets.js`                         |
| 573-676       | plant cards + select button                     | `ui/plantGrid.js`                      |
| 678-710       | boss lane/deploy buttons + `setBossLane`        | `ui/bossControls.js` + `ui/flow.js`    |
| 716-868       | `healthBar`, `draw`                             | `ui/render.js`                         |
| 878-968       | `hud`                                           | `ui/hud.js`                            |
| 974-1014      | `loop`                                          | `ui/loop.js`                           |
| 1020-1040     | initialization                                  | `ui/app.js`                            |
| 1046-1144     | progression rendering + call                    | `ui/progression.js` + `ui/app.js`      |

### `game.js` section mapping

| Current lines | Section                        | Destination                |
| ------------- | ------------------------------ | -------------------------- |
| 5-9           | tuning constants, `TILE`       | `constants.js`             |
| 12-15         | `posOf`                        | `geometry.js`              |
| 20-31         | `state`                        | `state.js`                 |
| 33            | `maxSpores`                    | `economy.js`               |
| 38-87         | `PLANTS`                       | `plants.js`                |
| 92-162        | `build`                        | `build.js`                 |
| 169-269       | placement, economy, deployment | `towers.js`                |
| 274-285       | `nearest`                      | private in `combat.js`     |
| 288-425       | `update`                       | `combat.js`                |
| 430-432       | `end`                          | `combat.js`                |
| final         | public facade                  | `game.js`, re-exports only |

## 3. Import boundary rules

Layers, top to bottom:

1. **Entry**: `main.js` may import only `ui/app.js`.
2. **UI composition**: `ui/app.js` may import every UI module and both domain facades.
3. **UI controllers**: `ui/flow.js`, `ui/loop.js`, `ui/input.js` may import UI views, `ui/session.js`, `ui/dom.js`, and domain facades. They must not import `ui/app.js`.
4. **UI views**: `ui/details.js`, `ui/hud.js`, `ui/render.js`, `ui/plantGrid.js`, `ui/progression.js`, `ui/tabs.js`, `ui/bossControls.js` may import `ui/session.js`, `ui/dom.js`, other leaves, and domain facades. They must not import controllers. Callbacks (`onSelect`, `onDeploy`, `onLane`) are injected by `ui/app.js`.
5. **UI leaves**: `ui/dom.js`, `ui/session.js`, `ui/messages.js`, `ui/overlay.js`, `ui/assets.js`. `assets` imports nothing. `session` may import domain facades/data. The rest import `ui/dom.js`.
6. **Domain facades**: `game.js`, `bossLevel.js` import only domain modules. They are the only domain imports used by UI.
7. **Domain simulation**: `build.js`, `towers.js`, `combat.js`, `effects.js`, `bossLanes.js`. They may import data modules and `state.js`; never UI, never `document`, `window`, or `localStorage`.
8. **Data**: `constants.js`, `plants.js`, `kinds.js`, `path.js`, `levels.js`, `geometry.js`. Import only data/config below them.
9. `progress.js` may import `path.js`; `localStorage` access stays inside function bodies.
10. `bossRenderer.js` is presentation and may import `bossLanes.js`; `bossLanes.js` must never import `bossRenderer.js`.

### Circular edge removal

Current cycle:

```text
game.js  ──imports──>  effects.js
   ^                        │
   └────────imports─────────┘
```

Break by extracting the singleton:

```text
effects.js  ──>  state.js  <──  game.js  ──>  effects.js
```

`effects.js` line 1 changes from `import { state } from "./game.js"` to `import { state } from "./state.js"`. `game.js` becomes a facade: `export { state } from "./state.js"`. ECMAScript live bindings keep one object, so the existing poison-drain test still proves identity.

### DOM-free simulation

- `state.js`, `constants.js`, `plants.js`, `economy.js`, `geometry.js`, `build.js`, `towers.js`, `combat.js`, `effects.js`, `levels.js`, `path.js`, `kinds.js`, `progress.js` contain no module-scope DOM access.
- No UI module is imported by domain code or tests.
- `ui/dom.js` resolves DOM lazily:
  ```js
  let cached = null;
  export function dom() {
    if (cached) return cached;
    const canvas = document.getElementById("c");
    cached = {
      $: (id) => document.getElementById(id),
      canvas,
      ctx: canvas.getContext("2d"),
    };
    return cached;
  }
  ```
  Importing `ui/dom.js` must not throw without a document.
- The TD simulation remains testable through `game.js`; boss simulation through `bossLevel.js`.

## 4. Duplication map

| Duplicate                  | Locations                                                    | Decision       | Reason                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nearest()`                | `game.js:274-285`, `bossLanes.js:231-243`                    | Leave separate | Different metrics. TD compares center distance against `range + radius` and orders by center distance. Boss compares edge distance (`hypot - r`) against range. Unifying changes target selection. |
| Health bar                 | `main.js:716-721` `healthBar`, `bossRenderer.js:38-48` `bar` | Leave separate | Different background colors, upper clamp behavior, height parameter, and call geometry. Unifying changes pixels.                                                                                   |
| Update loops               | `game.js:288-425`, `bossLanes.js:522-571`                    | Leave separate | Boss uses 0.05 s substeps, camera/mist progression, and per-step win/loss. TD uses one delta.                                                                                                      |
| Renderers                  | `main.js:726-868`, `bossRenderer.js:548-564`                 | Leave separate | Different world, coordinate systems, and layout.                                                                                                                                                   |
| Plant catalogs             | `game.js:38-87`, `kinds.js`, `main.js:88-127`                | Leave separate | TD, boss, and progression use different stats (`Flytrap` 30/140 vs 40/150). Not duplicate truth.                                                                                                   |
| Path position              | `game.js:12-15` `posOf`, `bossLanes.js:34/51`                | Leave separate | Grid-cell distance vs boss polyline distance.                                                                                                                                                      |
| Boss objective/hazard copy | `main.js:952-965`, `bossRenderer.js:404-499`                 | Leave separate | Different surfaces and wording.                                                                                                                                                                    |
| TD/boss mode dispatch      | `main.js:60-75`                                              | Move only      | Already one helper set; move to `ui/session.js`, do not rewrite.                                                                                                                                   |
| Canvas click lane picking  | `main.js:310-317`, `setBossLane:678-684`                     | Move only      | Both needed; one converts y to lane, the other validates. Not identical.                                                                                                                           |

Conclusion: **no unification in this refactor**. Every candidate either differs in behavior or differs in visual output. Unification, if ever attempted, is a separate change with its own behavior tests.

## 5. Phased steps

Every step is one commit, leaves the app playable, and must pass `V`. UI steps also require `B`. Domain steps also run `Vd`.

### Phase A — break the cycle and split the domain

**S1. Extract `state.js`**

- Files: add `src/state.js`; edit `src/game.js`, `src/effects.js`.
- Move: `game.js:20-31` object verbatim to `state.js`; `game.js` imports and re-exports `state`; `effects.js:1` imports from `./state.js`.
- Exports: `state`.
- Risk: two state objects if any module keeps a local copy. `tests/effects.test.js` poison test catches the split.
- Verify: `Vd`. Rollback: `R`.

**S2. Extract `constants.js`**

- Files: add `src/constants.js`; edit `src/game.js`.
- Move: `game.js:5-9` (`FINAL_MINION`, `DIST_BETWEEN_MINIONS`, `MAX_TOWER_DIST_TO_PATH`, `PLANT_BLOCK`, `TILE`) verbatim. `game.js` imports them and re-exports `TILE`.
- Exports: all five constants.
- Risk: `main.js` still imports `TILE` from `game.js`; the re-export preserves that.
- Verify: `Vd`. Rollback: `R`.

**S3. Extract `plants.js`**

- Files: add `src/plants.js`; edit `src/game.js`.
- Move: `game.js:38-87` (`PLANTS`) verbatim. `game.js` imports and re-exports it.
- Exports: `PLANTS`.
- Risk: none; same object identity through re-export.
- Verify: `Vd`. Rollback: `R`.

**S4. Extract `economy.js`**

- Files: add `src/economy.js`; edit `src/game.js`.
- Move: `game.js:33` (`maxSpores`) verbatim. Imports `state` from `./state.js`. `game.js` re-exports.
- Exports: `maxSpores`.
- Risk: `tests/progress.test.js` imports `maxSpores` from `game.js`; re-export required.
- Verify: `Vd`. Rollback: `R`.

**S5. Extract `geometry.js`**

- Files: add `src/geometry.js`; edit `src/game.js`.
- Move: `game.js:12-15` (`posOf`) verbatim. Imports `TILE` from `./constants.js`.
- Exports: `posOf` (internal to domain; not re-exported).
- Risk: none.
- Verify: `Vd`. Rollback: `R`.

**S6. Extract `build.js`**

- Files: add `src/build.js`; edit `src/game.js`.
- Move: `game.js:92-162` (`build`) verbatim. Imports `state`, `loadLevel`, `MAP_COLS`, `MAP_ROWS`, `LEVEL_PATHS`, `effects`, `posOf`, `TILE`, `FINAL_MINION`, `DIST_BETWEEN_MINIONS`. `game.js` imports and re-exports `build`.
- Exports: `build`.
- Risk: `effects.reset()` must remain the last operation in `build`. Preserve statement order.
- Verify: `Vd`. Rollback: `R`.

**S7. Extract `towers.js`**

- Files: add `src/towers.js`; edit `src/game.js`.
- Move: `game.js:169-269` (`canBuildAt`, `findClosestPathSpot`, `maxTowers`, `towersOf`, `canPlaceTower`, `placeTower`, `sendOut`, `deploySelected`) verbatim. Imports `state`, `PLANTS`, `LEVEL_PATHS`, `MAP_COLS`, `MAP_ROWS`, `posOf`, constants.
- Exports: `maxTowers`, `towersOf`, `canPlaceTower`, `placeTower`, `sendOut`, `deploySelected`; `canBuildAt` and `findClosestPathSpot` stay private. `game.js` re-exports the six public names.
- Risk: private helpers must not leak; `main.js` still imports `maxTowers`, `towersOf`, `placeTower`, `canPlaceTower`, `deploySelected`.
- Verify: `Vd`. Rollback: `R`.

**S8. Extract `combat.js`; reduce `game.js` to a facade**

- Files: add `src/combat.js`; edit `src/game.js`.
- Move: `game.js:274-285` (`nearest`), `288-425` (`update`), `430-432` (`end`) verbatim. Imports `state`, `PLANTS`, `effects`, `maxSpores`, `posOf`, constants. `game.js` becomes imports/re-exports only, with no statements.
- Exports: `update`, `end`.
- Risk: exact public export set must match the old file. Audit: `state, TILE, PLANTS, maxSpores, build, maxTowers, towersOf, canPlaceTower, placeTower, sendOut, deploySelected, update, end`.
- Verify: `Vd` plus `B` (TD start, place, deploy, pause). Rollback: `R`.

### Phase B — split UI leaves

**S9. Add `ui/dom.js`**

- Files: add `src/ui/dom.js`; edit `src/main.js`.
- Move: `main.js:32-42` into lazy `dom()` + `resizeCanvas(width, height)`. `main.js` replaces locals with `const { $, canvas, ctx: g } = dom();` and sizes the canvas once.
- Exports: `dom`, `resizeCanvas`.
- Risk: lazy resolution must return the same canvas/context. No module-scope DOM query in `ui/dom.js`.
- Verify: `V` + `B`. Rollback: `R`.

**S10. Add `ui/session.js`**

- Files: add `src/ui/session.js`; edit `src/main.js`.
- Move: `main.js:56-75` mode/boss/selection and `active*` helpers; `activePlayer`, `pickedBy` (`132-133`), `hoverCell` (`301`). Replace scalar variables with `session` properties (`session.mode`, `session.selectedPlantIndex`, etc.).
- Exports: `session`, `activeBattle`, `activePlants`, `activePhase`, `setActivePhase`.
- Risk: mechanical rename can miss a reference; ESLint catches undefined names. No behavior change.
- Verify: `V` + `B` (TD, boss, 2P, hover). Rollback: `R`.

**S11. Add `ui/messages.js` and `ui/overlay.js`**

- Files: add both; edit `src/main.js`.
- Move: `470-472`; `182-188`.
- Exports: `showPlantMessage`; `show`.
- Risk: `show` calls `$("ob").focus()`; keep exact id and order.
- Verify: `V` + `B`. Rollback: `R`.

**S12. Add `ui/assets.js`**

- Files: add `src/ui/assets.js`; edit `src/main.js`.
- Move: `77-82`, `88-127`, `558-571` verbatim.
- Exports: `plantImages`, `plantProgression`, `plantRoles`, `plantRoleIcons`.
- Risk: asset paths must stay relative to `src/`.
- Verify: `V` + `B` (card images). Rollback: `R`.

### Phase C — split UI views and wiring

**S13. Add `ui/tabs.js`**

- Files: add; edit `src/main.js`.
- Move: `387-435` into `setActiveTab` and `mountTabs()`. Query elements inside `mountTabs`.
- Exports: `setActiveTab`, `mountTabs`.
- Risk: mount must run before the initial `setActiveTab("battle")`.
- Verify: `V` + `B` (all three tabs). Rollback: `R`.

**S14. Add `ui/details.js`**

- Files: add; edit `src/main.js`.
- Move: `479-556` verbatim; import `session`, `PLANTS`/boss kinds via `activePlants`, `assets`, `dom`, `messages`.
- Exports: `showPlantDetails`.
- Risk: card selection query strings must remain unchanged.
- Verify: `V` + `B` (select each plant, detail panel). Rollback: `R`.

**S15. Add `ui/plantGrid.js`**

- Files: add; edit `src/main.js`.
- Move: `573-663` card creation and `665-676` select-button listener into `mountPlantGrid({ onSelect, onDeploy })`.
- Exports: `mountPlantGrid`.
- Risk: callback injection; do not import `flow.js`.
- Verify: `V` + `B` (cards + deploy button). Rollback: `R`.

**S16. Add `ui/progression.js`**

- Files: add; edit `src/main.js`.
- Move: `1046-1142`; move progression data usage from `assets.js`; keep the `renderEvolutionCards()` call at the current end-of-init position.
- Exports: `renderEvolutionCards`.
- Risk: `hud()` will import this module in S18; ensure no cycle.
- Verify: `V` + `B` (Upgrades tab counters). Rollback: `R`.

**S17. Add `ui/bossControls.js`**

- Files: add; edit `src/main.js`.
- Move: `686-710` into `mountBossControls({ onLane, onDeploy })`. Export live arrays `bossLaneButtons`, `bossDeployButtons`.
- Exports: `mountBossControls`, `bossLaneButtons`, `bossDeployButtons`.
- Risk: `hud()` mutates these arrays; export the same arrays, do not copies.
- Verify: `V` + `B` (boss lane buttons/deploy buttons). Rollback: `R`.

**S18. Add `ui/hud.js`**

- Files: add; edit `src/main.js`.
- Move: `870-968` plus `shown` and `lastRenderedEvolutionLevel`. Imports session, dom, state, `towersOf`, `maxTowers`, `maxSpores`, boss constants, `bossControls`, `progression`.
- Exports: `hud`.
- Risk: module-level cache variables become single-instance UI state. Keep them private. Preserve every id: `sp`, `lv`, `tw`, `tc`, `selectPlantBtn`, `bossObjective`, `bossHazard`, `pz`.
- Verify: `V` + `B` (header values, objective/hazard). Rollback: `R`.

**S19. Add `ui/render.js`**

- Files: add; edit `src/main.js`.
- Move: `716-721` (`healthBar`) and `726-868` (`draw`) verbatim. Import `dom`, session, `PLANTS`, `TILE`, `canPlaceTower`, `effects`.
- Exports: `draw`.
- Risk: canvas/context ownership. `render.js` reads `dom().ctx`; no other UI module may call `getContext`.
- Verify: `V` + `B` (paths, towers, plants, effects, hover preview). Rollback: `R`.

### Phase D — controllers and composition

**S20. Add `ui/flow.js`**

- Files: add; edit `src/main.js`.
- Move: `132-141`, `147-177`, `193-245`, `441-459`, `678-684`, plus overlay-button logic from `263-290` as `primaryAction()`. Imports session, `game.js`, `bossLevel.js`, `progress.js`, overlay/messages/details/tabs/hud/dom.
- Exports: `deploy`, `startLevel`, `toggleMode`, `pause`, `setActivePlayer`, `setPlayers`, `setBossLane`, `primaryAction`.
- Risk: UI writes to `state.phase`, `state.level`, `state.players` remain exactly as today. Do not introduce new domain setters.
- Verify: `V` + `B` (start, next level, pause/resume, mode toggle, 2P). Rollback: `R`.

**S21. Add `ui/loop.js`**

- Files: add; edit `src/main.js`.
- Move: `974-1014`; `lastPhase`, `last` become private. `startLoop()` sets `last = performance.now()` immediately before scheduling. Keep every overlay string and button label unchanged.
- Exports: `startLoop`.
- Risk: two requestAnimationFrame loops if boot runs twice. Boot runs once from `main.js`.
- Verify: `V` + `B` (win/lose/pause overlays; no duplicate animation). Rollback: `R`.

**S22. Add `ui/input.js`**

- Files: add; edit `src/main.js`.
- Move: `251-290`, `293-340`, `346-374`, `461-464` into `mountInput()`. Imports flow, details, session, dom, state, `LEVEL_PATHS`, `LANE_Y`, `MAP_COLS`, `MAP_ROWS`.
- Exports: `mountInput`.
- Risk: event registration order changes could affect focus. Preserve handler order: `pz`, `bm`, `rs`, `ob`, canvas mouse, keydown, player toggle.
- Verify: `V` + `B` (mouse, keyboard 1-4, P/Esc, Tab, mode button, restart). Rollback: `R`.

**S23. Add `ui/app.js`; shrink `main.js`**

- Files: add `src/ui/app.js`; rewrite `src/main.js` to:
  ```js
  import { boot } from "./ui/app.js";
  boot();
  ```
- Move: initialization `1020-1040`, final `renderEvolutionCards()` call, and mounting of tabs/plantGrid/bossControls/input.
- Boot order: `dom()` + canvas sizing → `mountTabs` → `mountPlantGrid` → `mountBossControls` → `mountInput` → `loadProgress`/`build`/`phase = "menu"` → `setPlayers` → `showPlantDetails(0)` → `setActiveTab("battle")` → initial `show(...)` → `startLoop()` → `renderEvolutionCards()`.
- Exports: `boot`.
- Risk: missing mount or wrong order leaves dead controls. Full `B` mandatory.
- Verify: `V` + `B` (complete TD level flow, boss flow, 2P, tabs, reload). Rollback: `R`.

**S24. Final audit (no behavior code)**

- Files: none expected.
- Check: `main.js` only boots; `game.js` only re-exports; no domain file imports `ui/`; no UI file imports `game.js` internals beyond public exports; `grep` for `document|window|localStorage` under domain files; no cycles.
- Verify: `V` + `Vd` + `B`. Rollback: not applicable.

## 6. Risk register

| ID  | Risk                                                                                                     | Mitigation                                                                                                                                                          | Check                                            |
| --- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| R1  | Two `state` singletons after extraction                                                                  | One `state.js`; facades re-export the same binding; effects imports `state.js` only                                                                                 | `tests/effects.test.js` poison test; `Vd`        |
| R2  | Import-time DOM access moved into a tested module                                                        | Only `ui/dom.js` touches DOM, lazily; only `ui/app.js`/`main.js` call it at import/boot                                                                             | Tests never import `ui/`; `Vd`                   |
| R3  | Import-time listeners or `build()` side effects remain in a UI module                                    | All mounting and boot in `ui/app.js`; view modules export functions                                                                                                 | Code review; `B`                                 |
| R4  | Shared `state` mutation expands into UI                                                                  | UI keeps only existing scalar writes (`phase`, `level`, `players`); collections mutate only in domain                                                               | Review each UI step; `V`                         |
| R5  | Canvas/`ctx` ownership split                                                                             | `ui/dom.js` resolves once; `render.js` reads it; `bossRenderer` receives `ctx` as today; size changes via `resizeCanvas`                                            | `B`; grep `getContext`                           |
| R6  | CSS/HTML id drift                                                                                        | No HTML/CSS edits; ids consumed exactly as today; step-specific id list in S18-S22                                                                                  | `grep 'id="' src/index.html`; `B`                |
| R7  | Circular UI imports (`flow` ↔ `hud`/`bossControls`/`plantGrid`)                                          | Views receive callbacks; `hud` imports views; views never import `flow`                                                                                             | Import review per step; `B`                      |
| R8  | Module-level caches (`shown`, `lastPhase`, `last`, `lastRenderedEvolutionLevel`, `hoverCell`) duplicated | Exactly one owning module: `hud`, `loop`, `loop`, `hud`, `session`                                                                                                  | Review; `B`                                      |
| R9  | Deploy breaks because new nested files are not served                                                    | `src/wrangler.toml` uses `[assets] directory = "./"`; `.assetignore` excludes only `node_modules`, `.wrangler`, `wrangler.toml`, package files; nested `ui/` served | Open via HTTP server; CI test job                |
| R10 | Boss mode regression from `deploy()` tower check (see Observations)                                      | Do not change logic. Preserve `deploy` verbatim; record bug only                                                                                                    | `B` boss toggle/deploy behavior matches baseline |
| R11 | Large mechanical rename in S10 (`mode` → `session.mode`) misses references                               | Single commit, ESLint/no-undef, full `B`; revert if noisy                                                                                                           | `V` + `B`                                        |
| R12 | Accidental formatting churn                                                                              | Prettier only on touched files; `npm run format:check`; no repo-wide format                                                                                         | `V`                                              |

## 7. Out of scope

- Gameplay, balance, cost, damage, speed, range, spawn, timing, win/loss rules.
- Art, assets, colors, canvas layout, `style.css` restructuring.
- New features, UI redesign, accessibility redesign.
- Bug fixes of any kind; see Observations.
- Dependency additions or upgrades; test framework changes; jsdom.
- TypeScript, bundlers, minification, hashing, build scripts.
- Renaming existing public exports or moving existing domain/test file paths.
- Changing `effects` API, event catalog, RNG behavior, or the `localStorage` key.
- HTML changes; deploy workflow or Wrangler config changes.
- Unifying `nearest`, health bars, update loops, renderers, plant catalogs, or boss HUD copy.
- Moving `bossLanes.js`/`bossRenderer.js` beyond their existing facade.

## 8. Observations (not fixed)

1. **Boss deployment is gated by TD towers.** `deploy()` (`main.js:157`) checks `state.myTowers` before branching on `mode`. Fresh boss mode has no TD towers, so every boss deploy returns "Place a … tower first". Boss appears playable only after placing TD towers first. Not touched.
2. **Owner checks are inconsistent.** `hud()` (`main.js:915-917`) and the canvas click message (`main.js:333`) check tower ownership by plant only, while `deploy()` checks `owner === activePlayer`. In 2P the select button can enable and messages can name the opponent's tower.
3. **Progression cards render twice on boot.** `renderEvolutionCards()` runs at `main.js:1144` but does not update `lastRenderedEvolutionLevel`; the first `hud()` frame rebuilds the grid.
4. **Boss lane hit area is hardcoded.** `main.js:310` uses `y >= 120 && y <= 455` with `LANE_Y`; independent of canvas scaling and duplicated by renderer layout constants.
5. **`healthBar` does not clamp the upper bound** (`main.js:716-721`) while boss `bar` does (`bossRenderer.js:38-48`). Current healing rules keep values in range, but the primitives differ.
6. **`state.phase` is not reset by `build()`.** `build()` only resets level data; callers set `phase` separately (`main.js:201`, `1022`). A future caller can inherit `"won"`/`"lost"`.
7. **`RNG.mulberry32()` allocates a new closure per `next()` call** and mutates `this.s` from inside it (`effects.js:94-108`). Correct output, odd shape.
8. **Arc end angle `7` is used instead of `2 * Math.PI`** in TD drawing (`main.js:761`, `768`, `783`, `825`, `831`, `843`, `847`) and boss helpers use `TAU`. Cosmetic magic value.
9. **`build()` uses `Math.random()` directly** (`game.js:133`), so minion placement is not seedable unlike effects; tests only assert counts/costs, so this is currently unobserved.
10. **`activePhase()` dereferences `bossState` only under `mode === "boss"`.** Safe today because `startLevel()` creates it, but `session.mode` and `session.bossState` are independent mutable fields; no invariant guard exists.
