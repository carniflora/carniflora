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
  "Carniflora: Breach",
  "Send carnivorous plants down the path. They bite towers as they pass. Destroy the keep at the end before your swarm runs out.",
  "Start",
);
startLoop();
renderEvolutionCards();

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
