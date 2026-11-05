import { state } from "../state.js";
import { plantProgression } from "./assets.js";

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
