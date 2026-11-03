import { state, build, TILE } from "./game.js";
import { loadProgress } from "./progress.js";
import { MAP_COLS, MAP_ROWS } from "./levels.js";
import { resizeCanvas } from "./ui/dom.js";
import { showPlantDetails } from "./ui/details.js";
import { mountPlantGrid } from "./ui/plantGrid.js";
import { show } from "./ui/overlay.js";
import { setActiveTab, mountTabs } from "./ui/tabs.js";
import { renderEvolutionCards } from "./ui/progression.js";
import { mountBossControls } from "./ui/bossControls.js";
import { startLoop } from "./ui/loop.js";
import { setPlayers, deploy, setBossLane } from "./ui/flow.js";
import { mountInput } from "./ui/input.js";

resizeCanvas(MAP_COLS * TILE, MAP_ROWS * TILE);

mountTabs();
mountInput();

mountPlantGrid({ onSelect: showPlantDetails, onDeploy: deploy });

mountBossControls({
  onLane: setBossLane,
  onDeploy: (index) => {
    showPlantDetails(index);
    deploy(index);
  },
});

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
