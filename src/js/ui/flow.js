import { battleService } from "../battleService.js";
import { Action } from "../network/protocol.js";
import { dom } from "./dom.js";
import { state, saveProgress, loadCastleConquered } from "../state.js";
import { plantProgression, plantDiscovery } from "./assets.js";

import {
  session,
  activeBattle,
  activePhase,
  activePlants,
  setActivePhase,
} from "./session.js";

import { resetPhase } from "./loop.js";
import { build } from "../build.js";
import { deploySelected } from "../towers.js";

import {
  createBossLevelState,
  spawnBossPlant,
  selectBossLane,
} from "../bossLevel.js";

import { LEVEL_PATHS } from "../path.js";
import { MAP_COLS, MAP_ROWS, TILE, LAST_REGULAR_LEVEL } from "../constants.js";
import { setActiveTab, showPlantDetails } from "./tabs.js";
import { hud, showPlantMessage, show } from "./hud.js";
import { isPlantUnlocked, refreshPlantLocks } from "./plantGrid.js";

export function setActivePlayer(p) {
  session.pickedBy[session.activePlayer] = session.selectedPlantIndex;
  session.activePlayer = p;
  session.selectedPlantIndex = session.pickedBy[p];
  if (session.selectedPlantIndex !== null)
    showPlantDetails(session.selectedPlantIndex);
  showPlantMessage(`Player ${p + 1} active.`);
}

export function deploy(i) {
  if (battleService.online()) {
    battleService.submit({ type: Action.DEPLOY, plant: i });
    return;
  }
  if (!isPlantUnlocked(i)) {
    showPlantMessage(
      "This plant is locked. Win more levels to discover it.",
      "warning",
    );
    return;
  }

  const k = activePlants()[i];

  // Player cannot deploy until the game starts.
  if (activePhase() !== "play") {
    showPlantMessage("Start the battle before deploying a plant.", "warning");
    return;
  }

  // the plant needs a tower to come out of
  if (
    session.mode !== "boss" &&
    !state.myTowers.some(
      (t) => t.plant === i && t.owner === session.activePlayer,
    )
  ) {
    showPlantMessage(`Place a ${k.n} tower first.`, "warning");
    return;
  }

  // Tell the player when they do not have enough spores.
  if (activeBattle().spores < k.cost) {
    showPlantMessage(`You need ${k.cost} spores to deploy ${k.n}.`, "error");
    return;
  }

  if (session.mode === "boss") spawnBossPlant(session.bossState, i);
  else deploySelected(i, session.activePlayer);
  showPlantMessage(
    session.mode === "boss"
      ? `${k.n} deployed to lane ${session.bossState.selectedLane + 1}.`
      : `${k.n} deployed!`,
    "success",
  );
}

export function startLevel() {
  if (battleService.online()) {
    battleService.submit({ type: Action.RESTART });
    return;
  }
  // towerType = null;
  const { canvas } = dom();
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

  const { $ } = dom();
  $("bossControls").hidden = session.mode !== "boss";
  $("battleTitle").textContent =
    session.mode === "boss" ? "Boss Battle" : "Battle Arena";
  $("battleHint").textContent =
    session.mode === "boss"
      ? "Click a lane or use ↑/↓ to choose it. Keys 1–4 deploy plants. P pauses."
      : "Click a plant (or press 1–4), click a tile beside the path to place its tower, then deploy.";
  $("ov").classList.add("hide");
  $("ob2").hidden = true;
  showPlantMessage(
    session.mode === "boss"
      ? "Choose a lane, then deploy plants to break the chemical tanks."
      : "Choose a plant and deploy it.",
  );
  refreshPlantLocks();
  hud();
}

function syncModeButton() {
  const { $ } = dom();
  $("bm").textContent =
    session.mode === "boss" ? "Normal Battle" : "Boss Battle";
  $("bm").setAttribute("aria-pressed", String(session.mode === "boss"));
}

function enterBossMode() {
  session.mode = "boss";
  startLevel(); // creates session.bossState and resizes the canvas
  syncModeButton();
  setActiveTab("battle");
  hud();
}

function returnToHome() {
  const { $, canvas } = dom();
  $("ob2").hidden = true;

  // leave boss mode and reset progress.
  session.mode = "td";
  state.level = 1;
  saveProgress(1);

  // Rebuild level 1 without starting it.
  build();
  canvas.width = MAP_COLS * TILE;
  canvas.height = MAP_ROWS * TILE;
  state.phase = "menu";
  resetPhase();

  // Restore the normal-battle UI.
  $("bossControls").hidden = true;
  $("battleTitle").textContent = "Battle Arena";
  $("battleHint").textContent =
    "Click a plant (or press 1–4), click a tile beside the path to place its tower, then deploy.";
  syncModeButton();

  show(
    "Ready for Battle?",
    "Deploy your carnivorous plants, destroy enemy towers, and conquer the castle before your swarm runs out.",
    "Start Battle",
  );

  renderEvolutionCards();
  setActiveTab("plants");
  hud();
}

export function restartFromLevelOne() {
  session.mode = "td";
  state.level = 1;
  saveProgress(1);
  startLevel(); // builds level 1 and starts playing
  syncModeButton();
  renderEvolutionCards();
  setActiveTab("battle");
  hud();
}

export function toggleMode() {
  if (battleService.online()) {
    return;
  }
  const { $ } = dom();

  session.mode = session.mode === "td" ? "boss" : "td";
  startLevel();
  syncModeButton();
  setActiveTab("battle");
  if (session.selectedPlantIndex !== null)
    showPlantDetails(session.selectedPlantIndex);
  hud();
  $("bm").focus();
}

export function pause() {
  if (battleService.online()) {
    battleService.submit({
      type: activePhase() === "pause" ? Action.RESUME : Action.PAUSE,
    });
    return;
  }
  const { $ } = dom();
  if (activePhase() === "play") {
    setActivePhase("pause");
    show("Paused", "Timers are frozen.", "Resume");
  } else if (activePhase() === "pause") {
    setActivePhase("play");
    $("ov").classList.add("hide");
  }
  hud();
}

export function setPlayers(n) {
  const { $ } = dom();
  const playerToggle = $("playerToggle");
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

export function setBossLane(lane) {
  if (session.mode !== "boss" || !selectBossLane(session.bossState, lane))
    return;
  showPlantMessage(
    `Lane ${lane + 1} selected. Deploy with keys 1–4 or the plant buttons.`,
  );
  hud();
}

export function primaryAction() {
  if (battleService.online()) {
    const type =
      activePhase() === "menu"
        ? Action.START
        : activePhase() === "pause"
          ? Action.RESUME
          : activePhase() === "won"
            ? Action.ADVANCE
            : Action.RESTART;
    battleService.submit({ type });
    return;
  }
  if (session.mode === "boss") {
    const s = session.bossState.state;
    if (s === "pause") pause();
    else if (s === "won") returnToHome();
    else startLevel(); // lost: retry boss
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
    if (state.level >= LAST_REGULAR_LEVEL) {
      enterBossMode();
      return;
    }
    state.level = Math.min(state.level + 1, LEVEL_PATHS.length);
    saveProgress(state.level);
  }

  // Retry / next level.
  startLevel();
}

/* ==========================================
   UPGRADES PAGE — PLANT PROGRESSION
   Combined with refactored team architecture
   ========================================== */

let selectedUpgradeIndex = 0;

const upgradePanel = document.querySelector("#upgradesTab .upgrade-info");
const upgradeBackdrop = document.getElementById("upgradePanelBackdrop");
const upgradeCloseButton = document.getElementById("upgradePanelClose");

const compactUpgradeQuery = window.matchMedia("(max-width: 1250px)");

// Keep hidden panels inaccessible to keyboard navigation.
function syncUpgradePanelAccessibility() {
  if (!upgradePanel) return;

  const hidden =
    compactUpgradeQuery.matches && !upgradePanel.classList.contains("is-open");

  upgradePanel.inert = hidden;
  upgradePanel.setAttribute("aria-hidden", String(hidden));
}

// Open the Plant Growth card on tablets and phones.
function openUpgradePanel() {
  if (!upgradePanel || !compactUpgradeQuery.matches) return;

  upgradePanel.classList.add("is-open");
  upgradeBackdrop?.classList.add("is-open");

  syncUpgradePanelAccessibility();
  upgradeCloseButton?.focus();
}

// Close the Plant Growth card.
function closeUpgradePanel() {
  upgradePanel?.classList.remove("is-open");
  upgradeBackdrop?.classList.remove("is-open");

  syncUpgradePanelAccessibility();
}

function showBossDetails() {
  const setText = (id, value) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  };

  upgradePanel.dataset.plant = "5";

  setText("upgradeInfoHeader", "FINAL CHALLENGE");
  setText("upgradeName", "Boss Castle");
  setText("upgradeTerritory", "The Final Siege");
  setText("upgradeRole", "Final Boss");

  const preview = document.getElementById("upgradePreview");

  preview.src = "./assets/plants/castle-icon.png";
  preview.alt = "Boss Castle";

  setText(
    "upgradeRequirements",
    "Prepare your plant army for the final challenge.",
  );

  setText("upgradeMissionDescription", "Destroy the enemy castle.");

  setText(
    "upgradeStrategy",
    "Combine your plants' unique abilities to defeat the final boss.",
  );

  // Animate the Boss Castle profile.
  animateUpgradeProfile();

  const battleButton = document.getElementById("upgradeGoBattle");

  battleButton.textContent = "Go to Battle";
  battleButton.disabled = false;

  // Highlight the castle checkpoint.
  document
    .querySelectorAll("#evolutionGrid .upgrade-stage")
    .forEach((stage) => {
      const selected = stage.classList.contains("boss-stage");

      stage.classList.toggle("selected", selected);
      stage.setAttribute("aria-pressed", String(selected));
    });

  // Highlight the Boss Level button.
  document.querySelectorAll(".roadmap-level").forEach((button) => {
    const selected = button.dataset.stage === "5";

    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

// Animate the selected upgrade profile.
function animateUpgradeProfile() {
  const content = document.querySelector("#upgradesTab .upgrade-info-content");

  if (!content) return;

  content.classList.remove("profile-enter");

  // Restart the animation.
  void content.offsetWidth;

  content.classList.add("profile-enter");
}

// Update the selected plant discovery card.
function showUpgradeDetails(index) {
  const plant = plantProgression[index];
  const discovery = plantDiscovery[index];

  if (!plant || !discovery) return;

  selectedUpgradeIndex = index;

  // Synchronize the level navigation.
  document.querySelectorAll(".roadmap-level").forEach((button) => {
    const selected = Number(button.dataset.stage) === index + 1;

    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  const currentLevel = Number(state.level) || 1;
  const unlocked = currentLevel >= plant.level;
  const isNext = plant.level === currentLevel + 1;

  const setText = (id, value) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = String(value ?? "—");
    }
  };

  // Update plant colour theme.
  // Update plant colour theme.
  if (upgradePanel) {
    upgradePanel.dataset.plant = plant.name.toLowerCase();
  }

  // Update discovery heading.
  setText(
    "upgradeInfoHeader",
    unlocked
      ? "PLANT DISCOVERED"
      : isNext
        ? "NEXT DISCOVERY"
        : "FUTURE DISCOVERY",
  );

  // Update plant illustration.
  const preview = document.getElementById("upgradePreview");

  if (preview) {
    preview.src = plant.image;
    preview.alt = `${plant.name} illustration`;
  }

  // Update plant information.
  setText("upgradeName", plant.name);
  setText("upgradeTerritory", discovery.territory);
  setText("upgradeRole", unlocked ? "Discovered" : "Locked");
  setText("upgradeMissionDescription", discovery.ability);
  setText("upgradeStrategy", discovery.tip);
  animateUpgradeProfile();
  // Display unlock requirements.
  const requirements = document.getElementById("upgradeRequirements");

  if (requirements) {
    requirements.innerHTML = `
      <div class="upgrade-requirement-row completed">
        <i class="icon-circle-check" aria-hidden="true"></i>
        Discover Flytrap
      </div>
    `;

    if (plant.level > 1) {
      requirements.innerHTML += `
        <div class="upgrade-requirement-row ${unlocked ? "completed" : ""}">
          <i class="${
            unlocked ? "icon-circle-check" : "icon-lock"
          }" aria-hidden="true"></i>
          Complete Level ${plant.level - 1}
        </div>
      `;
    }
  }

  // Update battle button.
  const battleButton = document.getElementById("upgradeGoBattle");

  if (battleButton) {
    battleButton.disabled = !unlocked;
    battleButton.textContent = unlocked ? "Go to Battle" : "Plant Locked";
  }

  // Highlight selected checkpoint.
  document
    .querySelectorAll("#evolutionGrid .upgrade-stage")
    .forEach((stage) => {
      const selected = Number(stage.dataset.plantIndex) === index;

      stage.classList.toggle("selected", selected);
      stage.setAttribute("aria-pressed", String(selected));
    });
}

document
  .querySelector(".roadmap-levels")
  ?.addEventListener("click", (event) => {
    const button = event.target.closest(".roadmap-level");

    if (!button) return;

    const level = Number(button.dataset.stage);

    const checkpoint = document.querySelector(
      `#evolutionGrid .upgrade-stage-${level}`,
    );

    checkpoint?.click();
  });

function updateMilestone(id, achieved) {
  const milestone = document.getElementById(id);

  if (!milestone) return;

  milestone.classList.toggle("achieved", achieved);

  const status = milestone.querySelector(".milestone-status");

  if (status) {
    status.textContent = achieved ? "Achieved" : "Locked";
  }
}

// Track the previous plant collection count.
let previousUnlockedCount = null;

// Celebration theme for each plant.
const celebrationThemes = {
  2: {
    color: "#98712e",
    territory: "Golden Marsh",
  },
  3: {
    color: "#5184a6",
    territory: "Crystal Wetlands",
  },
  4: {
    color: "#b15c85",
    territory: "Crimson Fortress",
  },
};

function showDiscoveryCelebration(plant, totalUnlocked) {
  const dialog = document.getElementById("discoveryCelebration");

  const theme = celebrationThemes[plant.level];

  if (!dialog || !theme) return;

  dialog.style.setProperty("--celebration-color", theme.color);

  document.getElementById("celebrationPlant").src = plant.image;

  document.getElementById("celebrationTitle").textContent =
    `${plant.name} Unlocked!`;

  document.getElementById("celebrationTerritory").textContent = theme.territory;

  document.getElementById("celebrationCollection").textContent =
    `Plant Collection: ${totalUnlocked} / ${plantProgression.length}`;

  if (!dialog.open) {
    dialog.showModal();
  }
}

document.getElementById("continueJourney")?.addEventListener("click", () => {
  document.getElementById("discoveryCelebration")?.close();
});

// Render the four checkpoints on the winding road.
export function renderEvolutionCards() {
  const grid = document.getElementById("evolutionGrid");
  const unlockedCount = document.getElementById("unlockedPlantCount");

  if (!grid) return;

  const currentLevel = Number(state.level) || 1;
  //if wanted to test level 2, to see the road is filled with green, uncomment this
  //const currentLevel = 2; // Testing Level 2

  const totalUnlocked = plantProgression.filter(
    (plant) => currentLevel >= plant.level,
  ).length;

  // Celebrate a newly discovered plant.
  if (previousUnlockedCount !== null && totalUnlocked > previousUnlockedCount) {
    refreshPlantLocks();
    const newPlant = plantProgression[totalUnlocked - 1];

    if (newPlant) {
      showDiscoveryCelebration(newPlant, totalUnlocked);
    }
  }

  previousUnlockedCount = totalUnlocked;
  refreshPlantLocks();

  // Update journey achievements.
  const conquered = loadCastleConquered();
  const collected = conquered ? plantProgression.length : totalUnlocked;

  updateMilestone("firstDiscoveryMilestone", totalUnlocked >= 1);

  updateMilestone(
    "plantCollectorMilestone",
    collected === plantProgression.length,
  );

  updateMilestone("castleConquerorMilestone", conquered);

  // Update the green progression path.
  const progressPath = document.querySelector(
    "#upgradesTab .upgrade-path-progress",
  );

  const progressByPlant = [0, 5, 25, 48, 72];

  if (progressPath) {
    const progress = progressByPlant[totalUnlocked] ?? 0;

    progressPath.style.strokeDasharray = `${progress} 100`;
    progressPath.style.opacity = progress > 0 ? "1" : "0";
  }

  // Update plant collection progress.
  const collectionCount = document.getElementById("collectionCount");
  const collectionProgress = document.getElementById("collectionProgress");
  const collectionPercentage = document.getElementById("collectionPercentage");

  const totalPlants = plantProgression.length;

  const percentage = Math.round((collected / totalPlants) * 100);

  if (collectionCount) {
    collectionCount.textContent = `${collected} / ${totalPlants}`;
  }

  if (collectionProgress) {
    collectionProgress.max = totalPlants;
    collectionProgress.value = collected;
  }

  if (collectionPercentage) {
    collectionPercentage.textContent = `${percentage}% of plants discovered`;
  }

  if (unlockedCount) {
    unlockedCount.textContent = `${collected} of ${plantProgression.length} unlocked`;
  }

  // Remove previous checkpoints before rendering.
  grid.replaceChildren();

  plantProgression.forEach((plant, index) => {
    const unlocked = currentLevel >= plant.level;

    const checkpoint = document.createElement("button");

    checkpoint.type = "button";

    checkpoint.className = [
      "upgrade-stage",
      `upgrade-stage-${plant.level}`,
      unlocked ? "unlocked" : "locked",
    ].join(" ");

    checkpoint.dataset.plantIndex = String(index);

    checkpoint.setAttribute(
      "aria-label",
      `${plant.name}, level ${plant.level}, ${
        unlocked ? "unlocked" : "locked"
      }`,
    );

    checkpoint.setAttribute("aria-pressed", "false");

    // LOCKED / UNLOCKED
    const status = document.createElement("span");
    status.className = "upgrade-stage-state";

    const isNext = plant.level === currentLevel + 1;

    // Set plant animation status.
    checkpoint.dataset.status = unlocked
      ? "discovered"
      : isNext
        ? "next"
        : "locked";

    if (unlocked) {
      status.innerHTML = `
        <i class="icon-circle-check" aria-hidden="true"></i>
        DISCOVERED
      `;
    } else if (isNext) {
      status.innerHTML = `
        <i class="icon-sparkles" aria-hidden="true"></i>
        NEXT
      `;
    } else {
      status.innerHTML = `
        <i class="icon-lock" aria-hidden="true"></i>
        LOCKED
      `;
    }

    // Plant name
    const name = document.createElement("span");
    name.className = "upgrade-stage-name";
    name.textContent = plant.name;

    // Plant illustration
    const image = document.createElement("img");
    image.className = "stage-plant-image";
    image.src = plant.image;
    image.alt = "";

    // Level number
    const number = document.createElement("span");
    number.className = "upgrade-stage-number";
    number.textContent = String(plant.level);

    checkpoint.append(status, image, name, number);

    checkpoint.addEventListener("click", () => {
      showUpgradeDetails(index);
      openUpgradePanel();
    });
    grid.appendChild(checkpoint);
  });

  // Create the final boss checkpoint.
  const bossCheckpoint = document.createElement("button");

  bossCheckpoint.type = "button";
  bossCheckpoint.className = "upgrade-stage upgrade-stage-5 boss-stage";

  bossCheckpoint.setAttribute("aria-label", "Final Boss Castle");

  bossCheckpoint.innerHTML = `
     <span class="upgrade-stage-state">
      <i class="icon-swords" aria-hidden="true"></i>
      FINAL BOSS
    </span>

      <div class="boss-stage-image">
        <img src="./assets/plants/castle-icon.png" alt="Boss Castle" />
      </div>

      <span class="upgrade-stage-name">
        Boss Castle
      </span>

      <span class="upgrade-stage-number">
        <i class="icon-swords" aria-hidden="true"></i>
      </span>
    `;

  bossCheckpoint.addEventListener("click", () => {
    showBossDetails();
    openUpgradePanel();
  });

  grid.appendChild(bossCheckpoint);

  // Update the next discovery banner.
  const nextPlant = plantProgression.find(
    (plant) => plant.level > currentLevel,
  );

  const discoveryTitle = document.getElementById("nextDiscoveryTitle");

  const discoveryText = document.getElementById("nextDiscoveryText");

  if (discoveryTitle && discoveryText) {
    discoveryTitle.textContent = nextPlant
      ? "Your next discovery"
      : "Collection complete!";

    discoveryText.textContent = nextPlant
      ? `Complete Level ${nextPlant.level - 1} to discover ${nextPlant.name}.`
      : "All four plants discovered. Prepare for the final boss!";
  }

  showUpgradeDetails(selectedUpgradeIndex);
  syncUpgradePanelAccessibility();
}

/* ==========================================
   PLANT GROWTH PANEL CONTROLS
   ========================================== */

// Close button
upgradeCloseButton?.addEventListener("click", closeUpgradePanel);

// Close when clicking the backdrop
upgradeBackdrop?.addEventListener("click", closeUpgradePanel);

// Close when Escape is pressed
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && upgradePanel?.classList.contains("is-open")) {
    closeUpgradePanel();
  }
});

// Close when navigating away
document.querySelectorAll(".nav-btn").forEach((button) => {
  button.addEventListener("click", closeUpgradePanel);
});

// Reset when resizing between desktop and smaller screens
compactUpgradeQuery.addEventListener("change", () => {
  closeUpgradePanel();
});

// Go to Battle
document.getElementById("upgradeGoBattle")?.addEventListener("click", () => {
  closeUpgradePanel();
  setActiveTab("battle");
});

// Set the initial accessibility state.
syncUpgradePanelAccessibility();

// Temporary level testing.
window.testLevel = (level) => {
  state.level = level;
  renderEvolutionCards();
};
