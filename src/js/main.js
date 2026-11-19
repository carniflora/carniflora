import { mountMultiplayer } from "./ui/multiplayer.js";
import { state } from "./state.js";
import { build } from "./build.js";
import { MAP_COLS, MAP_ROWS, TILE } from "./constants.js";
import { loadProgress } from "./progress.js";
import { dom, resizeCanvas } from "./ui/dom.js";
import { mountPlantGrid } from "./ui/plantGrid.js";
import { show } from "./ui/hud.js";
import { setActiveTab, mountTabs, showPlantDetails } from "./ui/tabs.js";
import { mountBossControls } from "./ui/bossControls.js";
import { startLoop } from "./ui/loop.js";
import {
  setPlayers,
  deploy,
  setBossLane,
  renderEvolutionCards,
} from "./ui/flow.js";
import { mountInput } from "./ui/input.js";
import { loadSprites } from "./sprites.js";

// Composition root
// All mount calls must run before first render
dom();
resizeCanvas(MAP_COLS * TILE, MAP_ROWS * TILE);

mountTabs();
mountPlantGrid({ onSelect: showPlantDetails, onDeploy: deploy });
mountBossControls({
  onLane: setBossLane,
  onDeploy: (index) => {
    showPlantDetails(index);
    deploy(index);
  },
});
mountInput();

state.level = loadProgress();
build();
state.phase = "menu";
setPlayers(state.players === 2 ? 2 : 1);
showPlantDetails(0);
setActiveTab("battle");
show(
  "Ready for Battle?",
  "Deploy your carnivorous plants, destroy enemy towers, and conquer the castle before your swarm runs out.",
  "Start Battle",
);
await loadSprites();
startLoop();
// TO see the message on the screen when u win uncomment state.phase = "won"; it shows the message in the battle
//state.phase = "won";

// TO see the message on the screen when u lost uncomment state.phase = "lost"; it shows the message in the battle

//state.phase = "lost";
renderEvolutionCards();
mountMultiplayer();

document.getElementById("evolutionGrid")?.addEventListener("click", (event) => {
  const checkpoint = event.target.closest(".upgrade-stage");

  if (!checkpoint) return;

  openUpgradePanel();
});

/* ==========================================
   TABLET — SLIDING PLANT GROWTH PANEL
   ========================================== */

const upgradeTabletQuery = window.matchMedia("(max-width: 1250px)");

const upgradePanel = document
  .getElementById("upgradesTab")
  .querySelector(".upgrade-info");

const upgradeBackdrop = document.getElementById("upgradePanelBackdrop");

const upgradeCloseButton = document.getElementById("upgradePanelClose");

function syncUpgradePanelAccessibility() {
  const isHidden =
    upgradeTabletQuery.matches && !upgradePanel.classList.contains("is-open");

  upgradePanel.inert = isHidden;
  upgradePanel.setAttribute("aria-hidden", String(isHidden));
}

function openUpgradePanel() {
  if (!upgradeTabletQuery.matches) return;

  upgradePanel.classList.add("is-open");
  upgradeBackdrop.classList.add("is-open");

  syncUpgradePanelAccessibility();
  upgradeCloseButton.focus();
}

function closeUpgradePanel() {
  upgradePanel.classList.remove("is-open");
  upgradeBackdrop.classList.remove("is-open");

  syncUpgradePanelAccessibility();
}

/* Close with the X button */
upgradeCloseButton.addEventListener("click", closeUpgradePanel);

/* Close when clicking outside the panel */
upgradeBackdrop.addEventListener("click", closeUpgradePanel);

/* Close with Escape */
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && upgradePanel.classList.contains("is-open")) {
    closeUpgradePanel();
  }
});

document.querySelectorAll(".nav-btn").forEach((button) => {
  button.addEventListener("click", closeUpgradePanel);
});

/* Reset correctly when resizing between tablet and desktop */
upgradeTabletQuery.addEventListener("change", () => {
  closeUpgradePanel();
});

syncUpgradePanelAccessibility();

const fullscreenBtn = document.getElementById("fullscreenBtn");
const battleStage = document.querySelector("#battleTab .stage");

fullscreenBtn.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await battleStage.requestFullscreen();
    }
  } catch (error) {
    console.error("Fullscreen failed:", error);
  }
});
