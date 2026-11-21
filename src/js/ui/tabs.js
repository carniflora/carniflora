import { dom } from "./dom.js";
import { session, activePlants } from "./session.js";
import { plantImages, plantRoles } from "./assets.js";
import { showPlantMessage } from "./hud.js";
import { mountHome, updateHome } from "./home.js";

let navButtons = null;
let tabs = null;

export function mountTabs() {
  const { $ } = dom();
  mountHome();

  $("networkToggle").addEventListener("click", () => {
    const panel = document.querySelector(".network-panel");
    const isOpen = panel.classList.toggle("is-open");

    $("networkToggle").setAttribute("aria-expanded", String(isOpen));
  });

  navButtons = document.querySelectorAll(".nav-btn[data-tab]");

  tabs = {
    plants: $("plantsTab"),
    upgrades: $("upgradesTab"),
    battle: $("battleTab"),
  };

  $("playGameBtn").addEventListener("click", () => {
    setActiveTab("battle");
  });

  $("exploreGardenBtn").addEventListener("click", () => {
    setActiveTab("upgrades");
  });

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedTab = button.dataset.tab;
      setActiveTab(selectedTab);
    });
  });
}

// =====================================================
// function that changes tabs.
// =====================================================

export function setActiveTab(tabName) {
  navButtons.forEach((button) => {
    button.classList.remove("active");
  });

  Object.values(tabs).forEach((tab) => {
    tab.classList.remove("active");
  });

  const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);

  if (selectedButton) {
    selectedButton.classList.add("active");
  }

  if (tabs[tabName]) {
    tabs[tabName].classList.add("active");
  }

  const stats = document.querySelector(".stats");
  const battleHud = document.getElementById("battleHud");
  const upgradeHud = document.getElementById("upgradeHud");
  const header = document.querySelector("#app > header");

  if (tabName === "battle") {
    battleHud.appendChild(stats);
  } else if (tabName === "upgrades") {
    upgradeHud.appendChild(stats);
  } else {
    header.appendChild(stats);
  }
  if (tabName === "plants") {
    updateHome();
  }
}

// =====================================================
// SHOW SELECTED PLANT INFORMATION
// =====================================================

export function showPlantDetails(index) {
  const { $ } = dom();

  // Get selected plant.
  const plant = activePlants()[index];

  // Remember selected plant.
  session.selectedPlantIndex = index;

  // Apply the selected plant's profile colour.
  $("plantDetailsPanel").dataset.plant = index;

  // Update plant statistics.
  $("detailHealth").textContent = plant.hp;
  $("detailDamage").textContent = plant.dmg;
  $("detailRange").textContent = plant.rng;
  $("detailSpeed").textContent = plant.spd;
  $("detailCost").textContent = `${plant.cost} spores`;

  // Calculate the maximum value of each statistic.
  const plants = activePlants();

  const maxHealth = Math.max(...plants.map((p) => p.hp));
  const maxDamage = Math.max(...plants.map((p) => p.dmg));
  const maxRange = Math.max(...plants.map((p) => p.rng));
  const maxSpeed = Math.max(...plants.map((p) => p.spd));

  // Update the statistic progress bars.
  const updateStatBar = (id, value, max) => {
    const percentage =
      max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

    $(id).style.width = `${percentage}%`;
  };

  updateStatBar("healthBar", plant.hp, maxHealth);
  updateStatBar("damageBar", plant.dmg, maxDamage);
  updateStatBar("rangeBar", plant.rng, maxRange);
  updateStatBar("speedBar", plant.spd, maxSpeed);
  // Update the Battle deployment button.
  $("battleDeployBtn").innerHTML = `
    <strong>Deploy ${plant.n}</strong>
    <span>${plant.cost} spores</span>
  `;

  // Update description.
  $("detailDescription").textContent = plant.desc ?? plant.d;

  // Update plant role and special ability.
  $("detailRole").textContent = plantRoles[index];

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

  document
    .querySelectorAll(".plant-option, .battle-plant-option")
    .forEach((card) => {
      const isSelected = Number(card.dataset.plantIndex) === index;

      card.classList.toggle("selected", isSelected);
      card.setAttribute("aria-pressed", String(isSelected));
    });

  showPlantMessage(`${plant.n} selected`);
}
