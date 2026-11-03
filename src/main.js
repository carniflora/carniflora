import {
  state,
  build,
  update,
  PLANTS,
  TILE,
  placeTower,
  canPlaceTower,
  deploySelected,
  maxTowers,
  maxSpores,
  towersOf,
} from "./game.js";

import {
  createBossLevelState,
  spawnBossPlant,
  updateBossLevel,
  drawBossLevel,
  selectBossLane,
  SPORE_CAP,
  LANE_Y,
  LANE_NAMES,
  KINDS as BOSS_KINDS,
} from "./bossLevel.js";
import { effects } from "./effects.js";
import { loadProgress, saveProgress } from "./progress.js";
import { LEVEL_PATHS } from "./path.js";

import { MAP_COLS, MAP_ROWS } from "./levels.js";
import { dom, resizeCanvas } from "./ui/dom.js";
import {
  session,
  activeBattle,
  activePlants,
  activePhase,
  setActivePhase,
} from "./ui/session.js";
import { showPlantMessage } from "./ui/messages.js";
import { showPlantDetails } from "./ui/details.js";
import { mountPlantGrid } from "./ui/plantGrid.js";
import { show } from "./ui/overlay.js";
import { setActiveTab, mountTabs } from "./ui/tabs.js";
import { renderEvolutionCards } from "./ui/progression.js";

const { $, canvas, ctx: g } = dom();
resizeCanvas(MAP_COLS * TILE, MAP_ROWS * TILE);

// =====================================================
// 2P LOGIC -- ACTIVE PLAYER
// =====================================================

function setActivePlayer(p) {
  session.pickedBy[session.activePlayer] = session.selectedPlantIndex;
  session.activePlayer = p;
  session.selectedPlantIndex = session.pickedBy[p];
  if (session.selectedPlantIndex !== null)
    showPlantDetails(session.selectedPlantIndex);
  showPlantMessage(`Player ${p + 1} active.`);
}

// =====================================================
// SEND / DEPLOY PLANT
// added messages for the new user interface.
// =====================================================
function deploy(i) {
  const k = activePlants()[i];

  // Player cannot deploy until the game starts.
  if (activePhase() !== "play") {
    showPlantMessage("Start the battle before deploying a plant.");
    return;
  }

  // the plant needs a tower to come out of
  if (
    !state.myTowers.some(
      (t) => t.plant === i && t.owner === session.activePlayer,
    )
  ) {
    showPlantMessage(
      `Place a ${k.n} tower first then click a tile next to the path.`,
    );
    return;
  }

  // Tell the player when they do not have enough spores.
  if (activeBattle().spores < k.cost) {
    showPlantMessage(`You need ${k.cost} spores to deploy ${k.n}.`);
    return;
  }

  if (session.mode === "boss") spawnBossPlant(session.bossState, i);
  else deploySelected(i, session.activePlayer);
  showPlantMessage(
    session.mode === "boss"
      ? `${k.n} deployed to lane ${session.bossState.selectedLane + 1}.`
      : `${k.n} deployed!`,
  );
}

// =========================
// START LEVEL
// =========================
function startLevel() {
  // towerType = null;
  if (session.mode === "boss") {
    session.bossState = createBossLevelState();
    canvas.width = 960;
    canvas.height = 540;
  } else {
    build();
    state.phase = "play";
    canvas.width = MAP_COLS * TILE;
    canvas.height = MAP_ROWS * TILE;
  }
  lastPhase = null;
  $("bossControls").hidden = session.mode !== "boss";
  $("battleTitle").textContent =
    session.mode === "boss" ? "Battle / Harvester Breach" : "Battle";
  $("battleHint").textContent =
    session.mode === "boss"
      ? "Click a lane or use ↑/↓ to choose it. Keys 1–4 deploy plants. P pauses."
      : "Click a plant (or press 1–4), click a tile beside the path to place its tower, then deploy.";
  $("ov").classList.add("hide");
  showPlantMessage(
    session.mode === "boss"
      ? "Choose a lane, then deploy plants to break the chemical tanks."
      : "Choose a plant and deploy it.",
  );
  hud();
}

function toggleMode() {
  session.mode = session.mode === "td" ? "boss" : "td";
  startLevel();
  $("bm").textContent =
    session.mode === "boss" ? "Normal Battle" : "Boss Battle";
  $("bm").setAttribute("aria-pressed", String(session.mode === "boss"));
  setActiveTab("battle");
  if (session.selectedPlantIndex !== null)
    showPlantDetails(session.selectedPlantIndex);
  hud();
  $("bm").focus();
}

// ====================
// PAUSE
// ==================
function pause() {
  if (activePhase() === "play") {
    setActivePhase("pause");
    show("Paused", "Timers are frozen.", "Resume");
  } else if (activePhase() === "pause") {
    setActivePhase("play");
    $("ov").classList.add("hide");
  }
  hud();
}

// ========================
// BUTTON CONTROLS
// ========================

$("pz").onclick = pause;
$("bm").onclick = toggleMode;
$("rs").onclick = () => {
  if (activePhase() !== "menu") {
    startLevel();
  }
};

// =====================================================
// START / RESUME / NEXT LEVEL BUTTON
// =====================================================

$("ob").onclick = () => {
  if (session.mode === "boss") {
    if (session.bossState.state === "pause") pause();
    else startLevel();
    return;
  }

  // Start game.
  if (state.phase === "menu") {
    startLevel();
    return;
  }

  // Resume game.
  if (state.phase === "pause") {
    pause();
    return;
  }

  // Next level.
  if (state.phase === "won") {
    state.level = Math.min(state.level + 1, LEVEL_PATHS.length);
    saveProgress(state.level);
  }

  // Retry / next level.
  startLevel();
};

// convert a mouse event to a grid cell
function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  return [Math.floor(x / TILE), Math.floor(y / TILE)];
}

// hover preview
canvas.addEventListener(
  "mousemove",
  (e) => (session.hoverCell = cellFromEvent(e)),
);
canvas.addEventListener("mouseleave", () => (session.hoverCell = null));

// click to place a tower of the selected plant type
canvas.addEventListener("click", (e) => {
  if (session.mode === "boss") {
    const rect = canvas.getBoundingClientRect();
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (y >= 120 && y <= 455) {
      const lane = LANE_Y.reduce(
        (best, laneY, i) =>
          Math.abs(laneY - y) < Math.abs(LANE_Y[best] - y) ? i : best,
        0,
      );
      setBossLane(lane);
    }
    return;
  }
  if (state.phase !== "play") return;
  if (session.selectedPlantIndex === null) {
    showPlantMessage("Select a plant first.");
    return;
  }

  const [c, r] = cellFromEvent(e);
  const plant = PLANTS[session.selectedPlantIndex];

  if (placeTower(c, r, session.selectedPlantIndex, session.activePlayer)) {
    showPlantMessage(
      `${plant.n} tower placed. Press deploy to send out plants.`,
    );
  } else if (
    state.myTowers.some((t) => t.plant === session.selectedPlantIndex)
  ) {
    showPlantMessage(`You already have a ${plant.n} tower.`);
  } else if (state.myTowers.length >= maxTowers()) {
    showPlantMessage(`Tower limit reached (${maxTowers()}) on this level`);
  } else {
    showPlantMessage(`Towerss go on a free tile next to the path.`);
  }
});

// ==========================
// KEYBOARD CONTROLS
// =========================

addEventListener("keydown", (e) => {
  if (
    session.mode === "boss" &&
    (e.key === "ArrowUp" || e.key === "ArrowDown")
  ) {
    e.preventDefault();
    setBossLane(
      Math.max(
        0,
        Math.min(
          2,
          session.bossState.selectedLane + (e.key === "ArrowUp" ? -1 : 1),
        ),
      ),
    );
    return;
  }
  if (e.code === "KeyP" || e.code === "Escape") {
    pause();
  }

  // tab to switch players
  if (e.code === "Tab" && state.players === 2) {
    e.preventDefault();
    setActivePlayer(1 - session.activePlayer);
  }

  // place a plant tower using the number keys 1-4
  const n = parseInt(e.key, 10);

  if (n >= 1 && n <= 4) {
    showPlantDetails(n - 1); // select the plant so clicks place it.
    deploy(n - 1);
  }
});

// =====================================================
// TAB NAVIGATION
//
// Controls:
//
// Plants
// Upgrades
// Battle
// Map
// =====================================================

// =====================================================
// Make navigation buttons clickable.
// =====================================================

mountTabs();

// =====================================================
// Toggle Player Mode
// =====================================================

const playerToggle = $("playerToggle");

function setPlayers(n) {
  state.players = n;

  // Going back to 1 player: make sure Player 1 is the active one
  if (n === 1 && session.activePlayer !== 0) setActivePlayer(0);

  playerToggle.querySelector("span").textContent =
    n === 2 ? "2 Players" : "1 Player";
  playerToggle.setAttribute("aria-pressed", String(n === 2));
  playerToggle.classList.toggle("active", n === 2); // green highlight for 2P

  showPlantMessage(
    n === 2
      ? "2 players: press Tab to switch between Player 1 and Player 2."
      : "1 player mode.",
  );
}

playerToggle.addEventListener("click", () => {
  setPlayers(state.players === 2 ? 1 : 2);
  if (activePhase() !== "menu") startLevel(); // restart so towers match session.mode
});

// =================================
// CREATE PLANT CARDS
// =================================

mountPlantGrid({ onSelect: showPlantDetails, onDeploy: deploy });

// =====================================================
// SELECT / DEPLOY PLANT BUTTON
// =====================================================

function setBossLane(lane) {
  if (session.mode !== "boss" || !selectBossLane(session.bossState, lane))
    return;
  showPlantMessage(
    `Lane ${lane + 1} selected. Deploy with keys 1–4 or the plant buttons.`,
  );
  hud();
}

const bossLaneButtons = LANE_NAMES.map((name, lane) => {
  const button = document.createElement("button");
  button.className = "boss-lane-button";
  button.textContent = `${lane + 1} / ${name}`;
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => setBossLane(lane));
  $("bossLanes").appendChild(button);
  return button;
});

// Keep all four deployment choices within reach while watching the boss fight.
const bossDeployButtons = BOSS_KINDS.map((plant, index) => {
  const button = document.createElement("button");
  button.className = "boss-deploy-button";
  button.style.setProperty("--plant-color", plant.col);
  button.title = `${plant.d}. Deploy with ${index + 1}.`;
  button.setAttribute("aria-label", `Deploy ${plant.n}, ${plant.cost} spores`);
  button.innerHTML = `<kbd>${index + 1}</kbd><strong>${plant.n}</strong><span>${plant.cost} spores</span>`;
  button.addEventListener("click", () => {
    showPlantDetails(index);
    deploy(index);
  });
  $("bossDeploy").appendChild(button);
  return button;
});

// =====================================================
// HEALTH BAR
// =====================================================

function healthBar(x, y, width, valueHp, maxHp, colour) {
  g.fillStyle = "rgba(0,0,0,.55)";
  g.fillRect(x - width / 2, y, width, 4);
  g.fillStyle = colour;
  g.fillRect(x - width / 2, y, width * Math.max(0, valueHp / maxHp), 4);
}

// ============================
// DRAW GAME
// ============================
function draw() {
  // clear the canvas
  g.clearRect(0, 0, canvas.width, canvas.height);
  const bg = g.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#16301f");
  bg.addColorStop(1, "#0f2217");
  g.fillStyle = bg;
  g.fillRect(0, 0, canvas.width, canvas.height);

  // draw the paths
  g.lineCap = "round";
  g.lineJoin = "round";

  for (const path of state.map.paths) {
    // get each path from the level paths
    g.beginPath();
    path.cells.forEach((cell, i) => {
      const x = (cell.c + 0.5) * TILE;
      const y = (cell.r + 0.5) * TILE;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.strokeStyle = "#4a3a28";
    g.lineWidth = TILE * 0.65;
    g.stroke();
    g.strokeStyle = "#5d4a33";
    g.lineWidth = TILE * 0.5;
    g.stroke();
  }

  // draw the enemies on the screen
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) {
      g.fillStyle = "#2b2f2a";
      g.beginPath();
      g.arc(enemy.x, enemy.y, enemy.radius * 0.8, 0, 7);
      g.fill();
      continue;
    }
    g.strokeStyle = "rgba(255,200,160,.10)";
    g.lineWidth = 1;
    g.beginPath();
    g.arc(enemy.x, enemy.y, enemy.rng, 0, 7);
    g.stroke();
    g.fillStyle = enemy.slow > 0 ? "#7f8fa3" : "#9aa0a6"; // if enemy slowed use first colour otherwise other
    if (enemy.keep) {
      g.fillRect(
        enemy.x - enemy.radius,
        enemy.y - enemy.radius,
        enemy.radius * 2,
        enemy.radius * 2,
      );
      g.fillStyle = "#c0392b";
      g.fillRect(enemy.x - 4, enemy.y - enemy.radius - 14, 4, 14);
      g.fillRect(enemy.x, enemy.y - enemy.radius - 14, 14, 8);
    } else {
      g.beginPath();
      g.arc(enemy.x, enemy.y, enemy.radius, 0, 7);
      g.fill();
      g.fillStyle = "#6c7279";
      g.fillRect(enemy.x - 5, enemy.y - enemy.radius - 6, 10, 8);
    }
    healthBar(
      enemy.x,
      enemy.y + enemy.radius + 4,
      enemy.keep ? 60 : 34,
      enemy.hp,
      enemy.max,
      "#e05a4a",
    );
  }

  // draw the number of towers that are allowed in the level
  state.myTowers.forEach((tower) => {
    const x = (tower.c + 0.5) * TILE;
    const y = (tower.r + 0.5) * TILE;
    const plant = PLANTS[tower.plant];

    g.fillStyle = plant.col;
    g.fillRect(x - 16, y - 16, 32, 32);
    g.strokeStyle = tower.owner === 0 ? "#fff" : "#7300f7";
    g.lineWidth = 2;
    g.strokeRect(x - 16, y - 16, 32, 32);
  });

  // placement preview: green if allowed, red if not
  if (
    session.hoverCell &&
    state.phase === "play" &&
    session.selectedPlantIndex !== null
  ) {
    const [c, r] = session.hoverCell;
    g.fillStyle = canPlaceTower(
      c,
      r,
      session.selectedPlantIndex,
      session.activePlayer,
    )
      ? "rgba(143,212,90,.35)"
      : "rgba(224,69,123,.35)";
    g.fillRect(c * TILE, r * TILE, TILE, TILE);
  }

  // draw plants that are sent out -- plants above enemies/mytowers because drawn after
  for (const p of state.plants) {
    const k = PLANTS[p.plant];
    g.fillStyle = k.col;
    g.beginPath();
    g.arc(p.x, p.y, k.radius, 0, 7);
    g.fill();
    g.strokeStyle = p.owner === 0 ? "#fff" : "#7300f7";
    g.stroke();
    g.fillStyle = "rgba(0,0,0,.45)";
    g.beginPath();
    g.arc(p.x, p.y, k.radius * 0.45, 0, 7);
    g.fill();
    healthBar(p.x, p.y - k.radius - 8, 20, p.hp, k.hp, "#8fd45a");
  }

  // draw the effects
  for (const f of state.fx) {
    g.strokeStyle = f.colour;
    g.lineWidth = 2;
    g.globalAlpha = Math.min(1, f.timer * 6);
    if (f.ring) {
      g.beginPath();
      g.arc(f.x1, f.y1, f.ring * (1 - f.timer / 0.3), 0, 7);
      g.stroke();
    } else {
      g.beginPath();
      g.moveTo(f.x1, f.y1);
      g.lineTo(f.x2, f.y2);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  // ── Active buffs/debuffs HUD strip (EPIC 4 / US 6.5) ──────────────────
  const active = effects.displayList();
  if (active.length) {
    g.font = "13px system-ui, sans-serif";
    g.textBaseline = "top";
    active.forEach((d, i) => {
      const y = 12 + i * 18;
      g.fillStyle = "rgba(0,0,0,.5)";
      g.fillRect(8, y - 2, 168, 16);
      g.fillStyle = d.kind === "buff" ? "#4ade80" : "#f87171";
      g.fillText(`${d.icon} ${d.name}  ${d.remaining}s`, 14, y);
    });
    g.textBaseline = "alphabetic";
  }
}

let lastPhase = null;

// store timestamp of previous frame
let last = performance.now(),
  // store currently displayed HUD value
  shown = {};

let lastRenderedEvolutionLevel = null;
function hud() {
  const battle = activeBattle();
  // Refresh the collection when the level changes.
  if (lastRenderedEvolutionLevel !== state.level) {
    renderEvolutionCards();
    lastRenderedEvolutionLevel = state.level;
  }

  const cap = session.mode === "boss" ? SPORE_CAP : maxSpores();

  const v = {
    sp: Math.floor(battle.spores) + " / " + cap,
    lv: session.mode === "boss" ? "Boss" : state.level,
    tw: (session.mode === "boss"
      ? [...battle.towers, ...battle.minions, ...battle.tanks, battle.boss]
      : battle.enemies
    ).filter((enemy) => enemy.hp > 0).length,
    tc:
      session.mode === "boss"
        ? "—"
        : towersOf(session.activePlayer).length + " / " + maxTowers(),
  };

  // Update spores, level, and towers.
  for (const id in v) {
    if (shown[id] !== v[id]) {
      $(id).textContent = v[id];
      shown[id] = v[id];
    }
  }

  // ===================================================
  // Disables the Select Plant button.
  // ===================================================

  if (session.selectedPlantIndex !== null) {
    const plant = activePlants()[session.selectedPlantIndex];
    const hasTower =
      session.mode === "boss" ||
      state.myTowers.some((t) => t.plant === session.selectedPlantIndex);
    $("selectPlantBtn").disabled =
      activePhase() !== "play" || !hasTower || battle.spores < plant.cost;
  }

  bossDeployButtons.forEach((button, index) => {
    button.disabled =
      session.mode !== "boss" ||
      activePhase() !== "play" ||
      battle.spores < BOSS_KINDS[index].cost;
  });
  bossLaneButtons.forEach((button, lane) => {
    button.disabled =
      session.mode !== "boss" || !["play", "pause"].includes(activePhase());
    button.setAttribute(
      "aria-pressed",
      String(
        session.mode === "boss" && lane === session.bossState.selectedLane,
      ),
    );
    if (session.mode === "boss") {
      const tank = battle.tanks.find((target) => target.lane === lane);
      const target =
        battle.phase === "core"
          ? "Furnace core"
          : tank?.hp === 0
            ? "Tank breached"
            : lane === 1 &&
                !battle.towers.some(
                  (tower) => tower.type === "cannon" && tower.hp > 0,
                )
              ? "Centre staging"
              : LANE_NAMES[lane];
      const label = `${lane + 1} / ${target}`;
      if (button.textContent !== label) button.textContent = label;
    }
  });
  if (session.mode === "boss") {
    const tanksLeft = battle.tanks.filter((tank) => tank.hp > 0).length;
    const objective =
      battle.phase === "core"
        ? "Core exposed. All lanes converge. Use Rafflesia to pierce armour and keep healing support alive. Mist speed +25%."
        : `Break the chemical tanks (${2 - tanksLeft}/2 breached). Rafflesia pierces their armour. Silence the centre cannon to stop splash fire and slow sprays.`;
    if ($("bossObjective").textContent !== objective)
      $("bossObjective").textContent = objective;
    const hazard = battle.spray
      ? `Lane ${battle.spray.lane + 1}: ${battle.spray.stage === "warning" ? "herbicide incoming — reinforce another lane" : "herbicide active"}.`
      : "Spray targets the largest lane group. Spread your waves. ↑/↓ selects a lane; 1–4 deploys.";
    if ($("bossHazard").textContent !== hazard)
      $("bossHazard").textContent = hazard;
  }
  $("pz").textContent = activePhase() === "pause" ? "Resume (P)" : "Pause (P)";
  $("pz").setAttribute("aria-pressed", String(activePhase() === "pause"));
}

// =============================
// GAME LOOP
// =============================

function loop(timer) {
  const deltaTime = Math.min(0.05, (timer - last) / 1000);
  last = timer;
  if (session.mode === "boss") updateBossLevel(session.bossState, deltaTime);
  else if (activePhase() === "play") update(deltaTime);

  // check if game is ended
  const phase = activePhase();
  if (phase !== lastPhase) {
    if (session.mode === "boss" && phase === "won")
      show(
        "Harvester breached",
        `The garden is reclaimed in ${Math.ceil(session.bossState.elapsed)} seconds. ${session.bossState.stats.deployed} plants deployed; ${session.bossState.stats.lost} lost (${session.bossState.stats.mistLost} to mist).`,
        "Retry Boss",
      );
    else if (session.mode === "boss" && phase === "lost")
      show(
        "The mist caught up",
        `The battlefield was overrun with ${Math.ceil(session.bossState.boss.hp)} boss HP remaining. Deploy early and combine plant abilities to push farther.`,
        "Retry Boss",
      );
    else if (phase === "won")
      show(
        "Keep breached",
        "Level " + state.level + " cleared.",
        state.level < LEVEL_PATHS.length ? "Next level" : "Replay level",
      );
    else if (phase === "lost")
      show(
        "The swarm withered",
        "No plants left and not enough spores.",
        "Retry",
      );
    lastPhase = phase;
  }
  if (session.mode === "boss")
    drawBossLevel(g, session.bossState, canvas.width);
  else draw();
  hud();

  requestAnimationFrame(loop);
}

// =====================================================
// INITIALIZE GAME
// =====================================================

state.level = loadProgress();
build();
state.phase = "menu";
setPlayers(state.players === 2 ? 2 : 1);

// =====================================================
// Select Flytrap by default so that
// the right panel is not empty.
// =====================================================

showPlantDetails(0);

setActiveTab("battle");

show(
  "Carniflora: Breach",
  "Send carnivorous plants down the path. They bite towers as they pass. Destroy the keep at the end before your swarm runs out.",
  "Start",
);

requestAnimationFrame(loop);

renderEvolutionCards();
