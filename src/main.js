import {
  state,
  build,
  PLANTS,
  TILE,
  placeTower,
  deploySelected,
  maxTowers,
} from "./game.js";
import {
  createBossLevelState,
  spawnBossPlant,
  selectBossLane,
  LANE_Y,
} from "./bossLevel.js";
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
import { mountBossControls } from "./ui/bossControls.js";
import { hud } from "./ui/hud.js";
import { resetPhase, startLoop } from "./ui/loop.js";

const { $, canvas } = dom();
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
  resetPhase();

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

mountBossControls({
  onLane: setBossLane,
  onDeploy: (index) => {
    showPlantDetails(index);
    deploy(index);
  },
});

// =====================================================
// HEALTH BAR
// =====================================================

// function definitions removed

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

startLoop();

renderEvolutionCards();
