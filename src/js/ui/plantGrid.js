import { dom } from "./dom.js";
import { PLANTS } from "../plants.js";
import { session } from "./session.js";
import { plantImages, plantRoles, plantRoleIcons } from "./assets.js";

// Builds the plant cards and wires the deploy button.
// onSelect(index) picks a plant; onDeploy(index) sends it out.
export function mountPlantGrid({ onSelect, onDeploy }) {
  const { $ } = dom();
  const plantGrid = $("plantGrid");

  PLANTS.forEach((plant, index) => {
    // Create button.
    const card = document.createElement("button");

    card.type = "button";
    card.className = "plant-option";

    // Remember which plant
    // this button represents.
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

    // Load the plant image.
    const cardImage = card.querySelector(".plant-card-image img");

    cardImage.onload = () => {
      cardImage.style.display = "block";
      cardImage.parentElement.style.backgroundColor = "#eee9db";
    };

    // Show why a plant picture failed to load.

    cardImage.onerror = () => {
      console.error(`Failed to load ${plant.n} image:`, cardImage.src);

      cardImage.style.display = "none";
      cardImage.parentElement.style.backgroundColor = plant.col;
    };

    cardImage.src = plantImages[index];

    card.addEventListener("click", () => {
      onSelect(index);
    });

    // Put plant card
    // inside plantGrid.
    plantGrid.appendChild(card);
  });

  $("selectPlantBtn").addEventListener("click", () => {
    // No plant selected.
    if (session.selectedPlantIndex === null) {
      return;
    }

    onDeploy(session.selectedPlantIndex);
  });
}
