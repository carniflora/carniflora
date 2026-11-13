import { dom } from "./dom.js";
import { TILE } from "../constants.js";
import { state } from "../state.js";
import { placeTower, maxTowers } from "../towers.js";
import { PLANTS } from "../plants.js";
import { session, activePhase } from "./session.js";
import { LANE_Y } from "../bossLevel.js";
import {
  pause,
  toggleMode,
  primaryAction,
  startLevel,
  setBossLane,
  setActivePlayer,
  setPlayers,
  deploy,
} from "./flow.js";
import { showPlantDetails } from "./tabs.js";
import { showPlantMessage } from "./hud.js";

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

  const playerToggle = $("playerToggle");

  playerToggle.addEventListener("click", () => {
    setPlayers(state.players === 2 ? 1 : 2);
    if (activePhase() !== "menu") startLevel(); // restart so towers match session.mode
  });
}
