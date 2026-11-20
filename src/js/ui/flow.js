import { battleService } from "../battleService.js";
import { Action } from "../network/protocol.js";
import { dom } from "./dom.js";
import {
  state,
  loadProgress,
  saveProgress,
  BOSS_LEVEL,
  normalLevel,
} from "../state.js";
import { plantProgression } from "./assets.js";

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

import { MAP_COLS, MAP_ROWS, TILE } from "../constants.js";
import { setActiveTab, showPlantDetails } from "./tabs.js";
import { hud, showPlantMessage, show } from "./hud.js";

export function setActivePlayer(p) {
  session.pickedBy[session.activePlayer] = session.selectedPlantIndex;
  session.activePlayer = p;
  session.selectedPlantIndex = session.pickedBy[p];
  if (session.selectedPlantIndex !== null)
    showPlantDetails(session.selectedPlantIndex);
  showPlantMessage(`Player ${p + 1} active.`);
}

export function deploy(i, player = session.activePlayer) {
  if (battleService.online()) {
    battleService.submit({ type: Action.DEPLOY, plant: i });
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

  if (session.mode === "boss") {
    if (!spawnBossPlant(session.bossState, i, undefined, player)) {
      return;
    }
  } else {
    deploySelected(i, session.activePlayer);
  }
  showPlantMessage(
    session.mode === "boss"
      ? `${k.n} deployed to lane ${session.bossState.selectedLanes[player] + 1}.`
      : `${k.n} deployed!`,
    "success",
  );
}

export function restoreCampaign() {
  state.level = loadProgress();
  session.mode = state.level === BOSS_LEVEL ? "boss" : "td";
  startLevel("menu");
}

export function startLevel(phase = "play") {
  if (battleService.online()) {
    battleService.submit({ type: Action.RESTART });
    return;
  }
  // towerType = null;
  const { canvas } = dom();
  if (session.mode === "boss") {
    session.bossState = createBossLevelState(state.players);
    canvas.width = 960;
    canvas.height = 540;
  } else {
    state.level = normalLevel(state.level);
    build();
    canvas.width = MAP_COLS * TILE;
    canvas.height = MAP_ROWS * TILE;
  }
  setActivePhase(phase);
  resetPhase();

  const { $ } = dom();
  const boss = session.mode === "boss";
  if ($("bm").getAttribute("aria-pressed") !== String(boss)) {
    $("bm").textContent = boss ? "Normal Battle" : "Boss Battle";
    $("bm").setAttribute("aria-pressed", String(boss));
  }
  $("bossControls").hidden = session.mode !== "boss";
  $("battleTitle").textContent =
    session.mode === "boss" ? "Boss Battle" : "Battle Arena";
  $("battleHint").textContent =
    session.mode === "boss"
      ? state.players === 2
        ? "P1: W/S and 1-4. P2: Up/Down and 7, 8, 9, 0. Share spores. P pauses."
        : "Click a lane or use ↑/↓ to choose it. Keys 1–4 deploy plants. P pauses."
      : "Click a plant (or press 1–4), click a tile beside the path to place its tower, then deploy.";
  $("ov").classList.toggle("hide", phase === "play");
  showPlantMessage(
    session.mode === "boss"
      ? "Choose a lane, then deploy plants to break the chemical tanks."
      : "Choose a plant and deploy it.",
  );
  hud();
}

export function toggleMode() {
  if (battleService.online()) {
    return;
  }
  const { $ } = dom();

  session.mode = session.mode === "td" ? "boss" : "td";
  startLevel();

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

export function setBossLane(lane, player = session.activePlayer) {
  if (
    session.mode !== "boss" ||
    !selectBossLane(session.bossState, lane, player)
  ) {
    return;
  }
  showPlantMessage(`Player ${player + 1} selected lane ${lane + 1}.`);
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
    state.level++;
    saveProgress(state.level);
    if (state.level === BOSS_LEVEL) {
      toggleMode();
      return;
    }
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

// Display unlock messages.
function showEvolutionMessage(message) {
  const element = document.getElementById("evolutionMessage");

  if (element) {
    element.textContent = message;
  }
}

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

// Update the information for the selected plant.
function showUpgradeDetails(index) {
  const plant = plantProgression[index];
  const gamePlant = activePlants()[index];

  if (!plant) return;

  selectedUpgradeIndex = index;

  const setText = (id, value) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = String(value ?? "—");
    }
  };

  const preview = document.getElementById("upgradePreview");

  if (preview) {
    preview.src = plant.image;
    preview.alt = `${plant.name} illustration`;
  }

  setText("upgradeRole", plant.role);
  setText("upgradeName", plant.name);
  setText("upgradeDescription", plant.description);
  setText("upgradeStage", String(plant.level).padStart(2, "0"));

  // Display available gameplay statistics.
  setText("upgradeDamage", gamePlant?.dmg);
  setText("upgradeRange", gamePlant?.rng);
  setText("upgradeSpeed", gamePlant?.spd);

  setText("upgradeMission", gamePlant?.n ?? plant.name);
  setText(
    "upgradeMissionDescription",
    gamePlant?.desc ?? gamePlant?.d ?? plant.description,
  );

  // Highlight the selected checkpoint.
  document
    .querySelectorAll("#evolutionGrid .upgrade-stage")
    .forEach((stage) => {
      const selected = Number(stage.dataset.plantIndex) === index;

      stage.classList.toggle("selected", selected);
      stage.setAttribute("aria-pressed", String(selected));
    });
}

// Render the four checkpoints on the winding road.
export function renderEvolutionCards() {
  const grid = document.getElementById("evolutionGrid");
  const unlockedCount = document.getElementById("unlockedPlantCount");

  if (!grid) return;

  const currentLevel = Number(state.level) || 1;

  const totalUnlocked = plantProgression.filter(
    (plant) => currentLevel >= plant.level,
  ).length;

  // Preserve the team's collection counter.
  if (unlockedCount) {
    unlockedCount.textContent = `${totalUnlocked} of ${plantProgression.length} unlocked`;
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
    status.textContent = unlocked ? "UNLOCKED" : "LOCKED";

    // Plant name
    const name = document.createElement("span");
    name.className = "upgrade-stage-name";
    name.textContent = plant.level === 4 ? "Boss Castle" : plant.name;

    // Plant illustration
    const image = document.createElement("img");
    image.className = "stage-plant-image";
    image.src = plant.image;
    image.alt = "";

    // Level number
    const number = document.createElement("span");
    number.className = "upgrade-stage-number";
    number.textContent = String(plant.level);

    checkpoint.append(status, name, image, number);

    checkpoint.addEventListener("click", () => {
      showUpgradeDetails(index);
      openUpgradePanel();

      showEvolutionMessage(
        unlocked
          ? `${plant.name} is unlocked.`
          : `${plant.name} unlocks at Level ${plant.level}.`,
      );
    });

    grid.appendChild(checkpoint);
  });

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
