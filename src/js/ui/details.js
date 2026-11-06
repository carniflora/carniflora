import { dom } from "./dom.js";
import { session, activePlants } from "./session.js";
import { plantImages } from "./assets.js";
import { showPlantMessage } from "./messages.js";

// =====================================================
// SHOW SELECTED PLANT INFORMATION
// This fills the right-hand panel.
// =====================================================

export function showPlantDetails(index) {
  const { $ } = dom();

  // Get selected plant.
  const plant = activePlants()[index];

  // Remember selected plant.
  session.selectedPlantIndex = index;

  // Update plant name.
  $("detailName").textContent = plant.n;

  // Update health.
  $("detailHealth").textContent = plant.hp;

  // Update damage.
  $("detailDamage").textContent = plant.dmg;

  // Update range.
  $("detailRange").textContent = plant.rng;

  // Update speed.
  $("detailSpeed").textContent = plant.spd;

  // Update cost.
  $("detailCost").textContent = plant.cost;

  // Update description.
  $("detailDescription").textContent = plant.desc ?? plant.d;

  // ==========================================
  //  Display the selected plant illustration
  // ==========================================

  const detailContainer = $("detailColor");

  // Check whether the image already exists.
  let detailImage = detailContainer.querySelector("img");

  // Create an image if none exists.
  if (!detailImage) {
    detailImage = document.createElement("img");
    detailContainer.appendChild(detailImage);
  }

  // Show the plant colour while loading.
  detailContainer.style.backgroundColor = plant.col;
  detailImage.style.display = "none";

  // Set alternative text.
  detailImage.alt = `${plant.n} illustration`;

  // Show the image after loading.
  detailImage.onload = () => {
    detailImage.style.display = "block";
    detailContainer.style.backgroundColor = "#eee9db";
  };

  // Use the plant colour if the image is missing.
  detailImage.onerror = () => {
    detailImage.style.display = "none";
    detailContainer.style.backgroundColor = plant.col;
  };

  detailImage.src = plantImages[index];

  $("selectPlantBtn").disabled = false;

  document.querySelectorAll(".plant-option").forEach((card) => {
    card.classList.remove("selected");
  });

  const selectedCard = document.querySelector(`[data-plant-index="${index}"]`);

  if (selectedCard) {
    selectedCard.classList.add("selected");
  }

  showPlantMessage(`${plant.n} selected`);
}
