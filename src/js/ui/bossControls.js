import { dom } from "./dom.js";
import { COOP_LANE_NAMES } from "../bossLevel.js";
import { BOSS_KINDS } from "../plants.js";

import { plantImages, plantRoles, plantRoleIcons } from "./assets.js";
import { showPlantDetails } from "./tabs.js";
import { session } from "./session.js";

export const BOSS_KEYS = [
  ["1", "2", "3", "4"],
  ["7", "8", "9", "0"],
];

// The live button arrays. hud() mutates these elements, so it must
// receive these same arrays, never copies.
export let bossLaneButtons = [];
export let bossDeployButtons = [];

const laneIcons = [
  "icon-shield",
  "icon-crosshair",
  "icon-shield",
  "icon-shield",
];

const laneDescriptions = [
  "Armoured defence",
  "Enemy artillery",
  "Approach lane",
  "Armoured defence",
];

export function mountBossControls({ onLane, onDeploy }) {
  const { $ } = dom();

  $("bossLanes").replaceChildren();
  $("bossDeploy").replaceChildren();

  // Attack direction buttons
  bossLaneButtons = COOP_LANE_NAMES.map((name, lane) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "boss-lane-button";
    button.dataset.lane = lane;
    button.setAttribute("aria-pressed", "false");

    button.innerHTML = `
      <i class="${laneIcons[lane]} boss-lane-icon"
        aria-hidden="true"></i>

      <div class="boss-lane-content">
        <strong class="boss-lane-name">${name}</strong>

        <span class="boss-lane-description">
          ${laneDescriptions[lane]}
        </span>

        <span class="boss-lane-number">
          Lane ${lane + 1}
        </span>
      </div>
    `;

    button.addEventListener("click", () => onLane(lane));

    $("bossLanes").appendChild(button);

    return button;
  });

  // Plant Arsenal cards
  bossDeployButtons = BOSS_KINDS.map((plant, index) => {
    const card = document.createElement("div");

    card.className = "boss-plant-card";
    card.dataset.plantIndex = index;

    // Plant information
    const profile = document.createElement("button");

    profile.type = "button";
    profile.className = "boss-plant-profile";

    profile.innerHTML = `
    <img
      src="${plantImages[index]}"
      alt="${plant.n}"
      class="boss-plant-image"
    />

    <div class="boss-plant-information">
      <strong>${plant.n}</strong>

      <span class="boss-plant-role">
        <i class="${plantRoleIcons[index]}" aria-hidden="true"></i>
        ${plantRoles[index]}
      </span>

      <span class="boss-plant-cost">
        <i class="icon-leaf" aria-hidden="true"></i>
        ${plant.cost} spores
      </span>
    </div>
  `;

    // Show plant profile without deploying.
    profile.addEventListener("click", () => {
      session.selectedPlantIndex = index;
      showPlantDetails(index);
    });

    // Individual deployment button
    const button = document.createElement("button");

    button.type = "button";
    button.className = "boss-deploy-button";
    button.style.setProperty("--plant-color", plant.col);
    button.title = plant.d;
    button.setAttribute(
      "aria-label",
      `Deploy ${plant.n}, ${plant.cost} spores`,
    );

    button.innerHTML = `
    <i class="icon-sprout" aria-hidden="true"></i>
    Deploy ${plant.n} <kbd>${index + 1}</kbd>
  `;

    button.addEventListener("click", () => onDeploy(index));

    card.append(profile, button);

    $("bossDeploy").appendChild(card);

    return button;
  });
}
