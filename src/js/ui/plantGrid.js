import { dom } from "./dom.js";
import { PLANTS } from "../plants.js";
import { session } from "./session.js";
import { plantImages, plantRoles, plantRoleIcons } from "./assets.js";

export function mountPlantGrid({ onSelect, onDeploy }) {
  const { $ } = dom();
  const plantGrid = $("plantGrid");
  const battlePlantGrid = $("battlePlantGrid");

  PLANTS.forEach((plant, index) => {
    // Create button.
    const card = document.createElement("button");

    card.type = "button";
    card.className = "plant-option";

    card.dataset.plantIndex = index;

    // ==========================================
    // Plant card with image and information
    // ==========================================

    card.innerHTML = `
      <div class="plant-card-content">

        <div class="plant-card-top">
          <span class="plant-number">
            PLANT ${index + 1}
          </span>
        </div>

        <div class="plant-card-layout">

          <div class="plant-card-image">
            <img
              src="${plantImages[index]}"
              alt="${plant.n} illustration"
            />
          </div>

          <div class="plant-card-info">

            <h3>${plant.n}</h3>
            <p>${plant.desc}</p>

        
            <span class="plant-role plant-role-${index}">
            <i class="${plantRoleIcons[index]}" aria-hidden="true"></i>
            ${plantRoles[index]}
            </span>
          </div>
        </div>

      <div class="plant-card-footer">
      <span class="plant-card-cost">

        <i class="icon-leaf spore-icon" aria-hidden="true"></i>
        ${plant.cost} spores

      </span>
    </div>

      </div>
    `;

    const cardImage = card.querySelector(".plant-card-image img");

    cardImage.onload = () => {
      cardImage.style.display = "block";
      cardImage.parentElement.style.backgroundColor = "#eee9db";
    };

    cardImage.onerror = () => {
      console.error(`Failed to load ${plant.n} image:`, cardImage.src);

      cardImage.style.display = "none";
      cardImage.parentElement.style.backgroundColor = plant.col;
    };

    cardImage.src = plantImages[index];

    card.addEventListener("click", () => {
      onSelect(index);
    });

    plantGrid.appendChild(card);

    const battleCard = document.createElement("button");

    battleCard.type = "button";
    battleCard.className = "battle-plant-option";
    battleCard.dataset.plantIndex = index;

    battleCard.innerHTML = `
      <span class="battle-plant-key">${index + 1}</span>

      <img src="${plantImages[index]}" alt="${plant.n}" />

      <div class="battle-plant-text">
        <strong>${plant.n}</strong>
        <span>${plant.cost} spores</span>
      </div>
    `;

    battleCard.addEventListener("click", () => {
      onSelect(index);
    });

    battlePlantGrid.appendChild(battleCard);
  });

  // Shared deployment function.
  function deploySelectedPlant() {
    if (session.selectedPlantIndex === null) {
      return;
    }

    onDeploy(session.selectedPlantIndex);
  }

  $("selectPlantBtn").addEventListener("click", deploySelectedPlant);
  $("battleDeployBtn").addEventListener("click", deploySelectedPlant);
}
