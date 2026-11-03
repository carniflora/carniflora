import { state, build, TILE } from "../game.js";
import { loadProgress } from "../progress.js";
import { MAP_COLS, MAP_ROWS } from "../levels.js";
import { dom, resizeCanvas } from "./dom.js";
import { showPlantDetails } from "./details.js";
import { mountPlantGrid } from "./plantGrid.js";
import { show } from "./overlay.js";
import { setActiveTab, mountTabs } from "./tabs.js";
import { renderEvolutionCards } from "./progression.js";
import { mountBossControls } from "./bossControls.js";
import { startLoop } from "./loop.js";
import { setPlayers, deploy, setBossLane } from "./flow.js";
import { mountInput } from "./input.js";

// Composition root
// All mount calls must run before first render
export function boot() {
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
}
