import { state, build, PLANTS, TILE, placeTower, maxTowers } from "./game.js";
import { LANE_Y } from "./bossLevel.js";
import { loadProgress } from "./progress.js";
import { MAP_COLS, MAP_ROWS } from "./levels.js";
import { dom, resizeCanvas } from "./ui/dom.js";
import { session, activePhase } from "./ui/session.js";
import { showPlantMessage } from "./ui/messages.js";
import { showPlantDetails } from "./ui/details.js";
import { mountPlantGrid } from "./ui/plantGrid.js";
import { show } from "./ui/overlay.js";
import { setActiveTab, mountTabs } from "./ui/tabs.js";
import { renderEvolutionCards } from "./ui/progression.js";
import { mountBossControls } from "./ui/bossControls.js";
import { startLoop } from "./ui/loop.js";
import {
  setActivePlayer,
  deploy,
  startLevel,
  toggleMode,
  pause,
  setPlayers,
  setBossLane,
  primaryAction,
} from "./ui/flow.js";

const { $, canvas } = dom();
resizeCanvas(MAP_COLS * TILE, MAP_ROWS * TILE);

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

$("ob").onclick = () => primaryAction();

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
