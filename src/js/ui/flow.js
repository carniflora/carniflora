import { dom } from "./dom.js";
import { state } from "../state.js";
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

import { saveProgress } from "../progress.js";
import { LEVEL_PATHS } from "../path.js";
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

export function deploy(i) {
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

export function startLevel() {
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

export function toggleMode() {
  const { $ } = dom();
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

export function pause() {
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
}

//===================================
// RENDER PLANT PROGRESSION CARDS
//==================================

export function renderEvolutionCards() {
  const evolutionGrid = document.getElementById("evolutionGrid");
  const unlockedCount = document.getElementById("unlockedPlantCount");

  if (!evolutionGrid) {
    return;
  }

  // The current game level determines which plants
  // appear unlocked in the collection.
  const currentLevel = state.level;

  const totalUnlocked = plantProgression.filter(
    (plant) => currentLevel >= plant.level,
  ).length;

  // Update the collection counter.
  if (unlockedCount) {
    unlockedCount.textContent = `${totalUnlocked} of ${plantProgression.length} unlocked`;
  }

  // Clear the previous cards before rebuilding them.
  evolutionGrid.innerHTML = "";

  plantProgression.forEach((plant) => {
    const unlocked = currentLevel >= plant.level;

    const card = document.createElement("article");
    card.className = "evolution-card";

    if (unlocked) {
      card.classList.add("is-unlocked");
    }

    if (plant.level === 4) {
      card.classList.add("is-boss");
    }

    // Create the card content.
    card.innerHTML = `
      <div class="evolution-card-top">
        <span class="evolution-level">
          LEVEL ${plant.level}
        </span>

        <span class="evolution-status">
          <i
            class="${unlocked ? "icon-check-circle-2" : "icon-lock-keyhole"}"
            aria-hidden="true"
          ></i>
          ${unlocked ? "UNLOCKED" : "LOCKED"}
        </span>
      </div>

      <div class="evolution-image">
        <img
          src="${plant.image}"
          alt="${plant.name}"
        />
      </div>

      <div class="evolution-card-body">
        <h3>${plant.name}</h3>

        <span class="evolution-role">
          ${plant.role}
        </span>

        <p class="evolution-description">
          ${plant.description}
        </p>

      <div class="evolution-action">
        <i
          class="${unlocked ? "icon-check-circle-2" : "icon-lock-keyhole"}"
          aria-hidden="true"
        ></i>

        <div class="evolution-action-text">
          <strong>${unlocked ? "Available" : "Locked"}</strong>

          <span>
            ${
              unlocked
                ? "Ready to use in battle"
                : `Unlocks at Level ${plant.level}`
            }
          </span>
        </div>
      </div>

    </div>
    `;

    evolutionGrid.appendChild(card);
  });
}
