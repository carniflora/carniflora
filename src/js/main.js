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
