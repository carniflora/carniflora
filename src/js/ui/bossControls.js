import { dom } from "./dom.js";
import { LANE_NAMES, KINDS as BOSS_KINDS } from "../bossLevel.js";

// The live button arrays. hud() mutates these elements, so it must
// receive these same arrays, never copies.
export let bossLaneButtons = [];
export let bossDeployButtons = [];

// Builds the lane and deploy buttons. onLane(lane) selects a lane,
// onDeploy(index) selects and sends out that plant.
export function mountBossControls({ onLane, onDeploy }) {
  const { $ } = dom();

  bossLaneButtons = LANE_NAMES.map((name, lane) => {
    const button = document.createElement("button");
    button.className = "boss-lane-button";
    button.textContent = `${lane + 1} / ${name}`;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => onLane(lane));
    $("bossLanes").appendChild(button);
    return button;
  });

  // Keep all four deployment choices within reach while watching the boss fight.
  bossDeployButtons = BOSS_KINDS.map((plant, index) => {
    const button = document.createElement("button");
    button.className = "boss-deploy-button";
    button.style.setProperty("--plant-color", plant.col);
    button.title = `${plant.d}. Deploy with ${index + 1}.`;
    button.setAttribute(
      "aria-label",
      `Deploy ${plant.n}, ${plant.cost} spores`,
    );
    button.innerHTML = `<kbd>${index + 1}</kbd><strong>${plant.n}</strong><span>${plant.cost} spores</span>`;
    button.addEventListener("click", () => {
      onDeploy(index);
    });
    $("bossDeploy").appendChild(button);
    return button;
  });
}
