import {
  plantImages,
  plantProgression,
  plantDiscovery,
  plantRoles,
} from "./assets.js";

import { state } from "../state.js";

export function mountHome() {
  const container = document.getElementById("gardenPlantCards");

  if (!container) return;

  container.innerHTML = plantProgression
    .map(
      (plant, index) => `
        <button
          class="garden-plant-card"
          data-home-plant="${index}"
          type="button"
          aria-pressed="false"
        >
          <img src="${plantImages[index]}" alt="" />
          <strong>${plant.name}</strong>
          <span>${plantRoles[index]}</span>
        </button>
      `,
    )
    .join("");

  document.querySelectorAll(".garden-character").forEach((button) => {
    const index = Number(button.dataset.homePlant);
    const plant = plantProgression[index];

    button.insertAdjacentHTML(
      "afterbegin",
      `<span class="garden-status"></span>`,
    );

    button.insertAdjacentHTML(
      "beforeend",
      `
        <span class="garden-plant-name">${plant.name}</span>
        <span class="garden-level">${plant.level}</span>
        `,
    );
  });

  document.querySelectorAll("[data-home-plant]").forEach((button) => {
    button.addEventListener("click", () => {
      selectHomePlant(Number(button.dataset.homePlant));
    });
  });

  const achievementsDialog = document.getElementById(
    "gardenAchievementsDialog",
  );

  document
    .getElementById("gardenAchievementsBtn")
    .addEventListener("click", () => {
      const container = document.getElementById("gardenMilestones");

      container.replaceChildren();

      document
        .querySelectorAll("#upgradesTab .journey-milestones .milestone")
        .forEach((milestone) => {
          const copy = milestone.cloneNode(true);

          copy.removeAttribute("id");
          container.appendChild(copy);
        });

      achievementsDialog.showModal();
    });

  document
    .getElementById("closeGardenAchievements")
    .addEventListener("click", () => {
      achievementsDialog.close();
    });

  selectHomePlant(0);
  updateHome();
}

function selectHomePlant(index) {
  const plant = plantProgression[index];

  if (!plant) return;

  document.getElementById("gardenPlantName").textContent =
    `${plant.name} — ${plantRoles[index]}`;

  document.getElementById("gardenPlantAbility").textContent =
    plantDiscovery[index].ability;

  document.getElementById("gardenPlantDetails").dataset.plant = index;

  document.querySelectorAll("[data-home-plant]").forEach((button) => {
    const selected = Number(button.dataset.homePlant) === index;

    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

export function updateHome() {
  const level = Number(state.level) || 1;
  const label = document.getElementById("gardenPlayLabel");

  if (label) {
    label.textContent = level > 1 ? "Continue Journey" : "Begin Your Journey";
  }

  document.querySelectorAll(".garden-character").forEach((button) => {
    const index = Number(button.dataset.homePlant);
    const plant = plantProgression[index];
    const status = button.querySelector(".garden-status");

    if (!status) return;

    const discovered = level >= plant.level;
    const next = plant.level === level + 1;

    status.dataset.status = discovered
      ? "discovered"
      : next
        ? "next"
        : "locked";

    status.innerHTML = discovered
      ? `<i class="icon-circle-check"></i> DISCOVERED`
      : next
        ? `<i class="icon-sparkles"></i> NEXT`
        : `<i class="icon-lock"></i> LOCKED`;
  });
}
