import { battleService } from "../battleService.js";
import { dom } from "./dom.js";
import { TILE } from "../constants.js";
import { state } from "../state.js";
import { maxTowers } from "../towers.js";
import { PLANTS } from "../plants.js";
import { session, activePhase } from "./session.js";
import { BOSS_KEYS } from "./bossControls.js";
import {
  pause,
  toggleMode,
  primaryAction,
  startLevel,
  setBossLane,
  setActivePlayer,
  setPlayers,
  deploy,
  restartFromLevelOne,
} from "./flow.js";
import { showPlantDetails } from "./tabs.js";
import { showPlantMessage } from "./hud.js";
import { isPlantUnlocked } from "./plantGrid.js";

export function mountInput() {
  const { $, canvas } = dom();

  $("pz").onclick = pause;
  $("bm").onclick = toggleMode;
  $("rs").onclick = () => {
    if (activePhase() !== "menu") {
      startLevel();
    }
  };

  $("ob").onclick = () => primaryAction();
  $("ob2").onclick = restartFromLevelOne;

  function cellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    return [Math.floor(x / TILE), Math.floor(y / TILE)];
  }

  canvas.addEventListener(
    "mousemove",
    (e) => (session.hoverCell = cellFromEvent(e)),
  );
  canvas.addEventListener("mouseleave", () => (session.hoverCell = null));

  canvas.addEventListener("click", (e) => {
    if (session.mode === "boss") {
      const rect = canvas.getBoundingClientRect();
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      if (y >= 120 && y <= 455) {
        const { laneY } = session.bossState;
        const lane = laneY.reduce(
          (best, center, i) =>
            Math.abs(center - y) < Math.abs(laneY[best] - y) ? i : best,
          0,
        );
        setBossLane(lane);
      }
      return;
    }
    if (state.phase !== "play") return;
    if (session.selectedPlantIndex === null) {
      showPlantMessage("Select a plant first.", "warning");
      return;
    }

    const [c, r] = cellFromEvent(e);
    const plant = PLANTS[session.selectedPlantIndex];
    if (!isPlantUnlocked(session.selectedPlantIndex)) {
      showPlantMessage(
        `${plant.n} is locked. Win more levels to discover it.`,
        "warning",
      );
      return;
    }
    if (battleService.online()) {
      battleService.place(
        c,
        r,
        session.selectedPlantIndex,
        session.activePlayer,
      );
      return;
    }

    if (
      battleService.place(
        c,
        r,
        session.selectedPlantIndex,
        session.activePlayer,
      )
    ) {
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

  addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, textarea, select, [contenteditable=true]")) {
      return;
    }
    if (session.mode === "boss") {
      const battle = session.bossState;
      const coop = battle.selectedLanes.length === 2;
      const arrows = e.key === "ArrowUp" || e.key === "ArrowDown";
      const letters = coop && (e.code === "KeyW" || e.code === "KeyS");
      if (arrows || letters) {
        e.preventDefault();
        const player = coop && arrows ? 1 : 0;
        const step = e.key === "ArrowUp" || e.code === "KeyW" ? -1 : 1;
        setBossLane(battle.selectedLanes[player] + step, player);
        return;
      }
      for (const [player, keys] of BOSS_KEYS.entries()) {
        const plant = keys.indexOf(e.key);
        if (plant >= 0 && player < battle.selectedLanes.length) {
          if (player === session.activePlayer) {
            showPlantDetails(plant);
          }
          deploy(plant, player);
          return;
        }
      }
    }
    if (e.code === "KeyP" || e.code === "Escape") {
      pause();
    }

    // tab to switch players
    if (
      session.mode !== "boss" &&
      e.code === "Tab" &&
      state.players === 2 &&
      !battleService.online()
    ) {
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

  $("bossPlayer").onclick = () => setActivePlayer(1 - session.activePlayer);

  const playerToggle = $("playerToggle");

  playerToggle.addEventListener("click", () => {
    if (activePhase() !== "menu" || state.level > 1) return;
    setPlayers(state.players === 2 ? 1 : 2);
  });
}
