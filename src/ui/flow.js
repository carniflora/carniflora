import { dom } from "./dom.js";
import {
  session,
  activeBattle,
  activePhase,
  activePlants,
  setActivePhase,
} from "./session.js";
import { resetPhase } from "./loop.js";
import { state, build, deploySelected } from "../game.js";
import {
  createBossLevelState,
  spawnBossPlant,
  selectBossLane,
} from "../bossLevel.js";
import { saveProgress } from "../progress.js";
import { LEVEL_PATHS } from "../path.js";
import { MAP_COLS, MAP_ROWS } from "../levels.js";
import { TILE } from "../constants.js";
import { show } from "./overlay.js";
import { showPlantMessage } from "./messages.js";
import { showPlantDetails } from "./details.js";
import { setActiveTab } from "./tabs.js";
import { hud } from "./hud.js";

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
