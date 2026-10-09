import {
  state,
  build,
  update,
  PLANTS,
  TILE,
  placeTower,
  canPlaceTower,
  deploySelected,
  maxTowers,
} from "./game.js";
import {
  createBossLevelState,
  spawnBossPlant,
  updateBossLevel,
  drawBossLevel,
  KINDS as BOSS_KINDS,
} from "./bossLevel.js";

import { MAP_COLS, MAP_ROWS } from "./levels.js";

const $ = (id) => document.getElementById(id);

// ===========
// CANVAS
// ===========
const canvas = document.getElementById("c"),
  g = canvas.getContext("2d");

// set canvas size
canvas.width = MAP_COLS * TILE;
canvas.height = MAP_ROWS * TILE;

// =====================================================
//
// Keeps track of which plant the player selected.
//
// 0 = Flytrap
// 1 = Sundew
// 2 = Pitcher
// 3 = Rafflesia
//
// null = no plant selected
// =====================================================

let selectedPlantIndex = null;
let mode = "td";
let bossState = null;

function activeBattle() {
  return mode === "boss" ? bossState : state;
}

function activePlants() {
  return mode === "boss" ? BOSS_KINDS : PLANTS;
}

function activePhase() {
  return mode === "boss" ? bossState.state : state.phase;
}

function setActivePhase(phase) {
  if (mode === "boss") bossState.state = phase;
  else state.phase = phase;
}

const plantImages = [
  "./assets/plants/flytrap.png",
  "./assets/plants/sundew.png",
  "./assets/plants/pitcher.png",
  "./assets/plants/rafflesia.png",
];

//==========================================
//   PLANT PROGRESSION DATA
//==========================================

const plantProgression = [
  {
    name: "Flytrap",
    level: 1,
    role: "Frontline",
    description:
      "A tough plant that attacks enemies up close and can withstand damage.",
    image: "./assets/plants/flytrap.png",
    cost: 0,
  },

  {
    name: "Sundew",
    level: 2,
    role: "Support",
    description:
      "A specialized plant that helps control enemies during battle.",
    image: "./assets/plants/sundew.png",
    cost: 200,
  },

  {
    name: "Pitcher",
    level: 3,
    role: "Defender",
    description:
      "A resilient plant that strengthens your strategy as levels progress.",
    image: "./assets/plants/pitcher.png",
    cost: 300,
  },
  {
    name: "Rafflesia",
    level: 4,
    role: "Boss",
    description:
      "A powerful plant with abilities designed for tougher battles.",
    image: "./assets/plants/rafflesia.png",
    cost: 400,
  },
];

// =====================================================
// SEND / DEPLOY PLANT
// added messages for the new user interface.
// =====================================================
function deploy(i) {
  const k = activePlants()[i];

  // Player cannot deploy until the game starts.
  if (activePhase() !== "play") {
    showPlantMessage("Start the battle before deploying a plant.");
    return;
  }

  // Normal battles deploy from placed towers; boss plants use the moving front line.
  if (mode === "td" && !state.myTowers.some((t) => t.plant === i)) {
    showPlantMessage(
      `Place a ${k.n} tower first then click a tile next to the path.`,
    );
    return;
  }

  // Tell the player when they do not have enough spores.
  if (activeBattle().spores < k.cost) {
    showPlantMessage(`You need ${k.cost} spores to deploy ${k.n}.`);
    return;
  }

  if (mode === "boss") spawnBossPlant(bossState, i);
  else deploySelected(i);
  showPlantMessage(`${k.n} deployed!`);
}

// ======================
// SHOW OVERLAY
// =====================
function show(t, m, b) {
  $("ot").textContent = t;
  $("om").textContent = m;
  $("ob").textContent = b;
  $("ov").classList.remove("hide");
  $("ob").focus();
}

// =========================
// START LEVEL
// =========================
function startLevel() {
  // towerType = null;
  if (mode === "boss") {
    bossState = createBossLevelState();
    canvas.width = 960;
    canvas.height = 540;
  } else {
    build();
    state.phase = "play";
    canvas.width = MAP_COLS * TILE;
    canvas.height = MAP_ROWS * TILE;
  }
  lastPhase = null;
  $("ov").classList.add("hide");
  showPlantMessage("Choose a plant and deploy it.");
  hud();
}

function toggleMode() {
  mode = mode === "td" ? "boss" : "td";
  startLevel();
  $("bm").textContent = mode === "boss" ? "Normal Battle" : "Boss Battle";
  $("bm").setAttribute("aria-pressed", String(mode === "boss"));
  setActiveTab("battle");
  if (selectedPlantIndex !== null) showPlantDetails(selectedPlantIndex);
  hud();
  $("bm").focus();
}

// ====================
// PAUSE
// ==================
function pause() {
  if (activePhase() === "play") {
    setActivePhase("pause");
    show("Paused", "Timers are frozen.", "Resume");
  } else if (activePhase() === "pause") {
    setActivePhase("play");
    $("ov").classList.add("hide");
  }
  hud();
}

// ========================
// BUTTON CONTROLS
// ========================

$("pz").onclick = pause;
$("bm").onclick = toggleMode;
$("rs").onclick = () => {
  if (activePhase() !== "menu") {
    startLevel();
  }
};

// =====================================================
// START / RESUME / NEXT LEVEL BUTTON
// =====================================================

$("ob").onclick = () => {
  if (mode === "boss") {
    if (bossState.state === "pause") pause();
    else startLevel();
    return;
  }

  // Start game.
  if (state.phase === "menu") {
    startLevel();
    return;
  }

  // Resume game.
  if (state.phase === "pause") {
    pause();
    return;
  }

  // Next level.
  if (state.phase === "won") {
    state.level++;
  }

  // Retry / next level.
  startLevel();
};

// convert a mouse event to a grid cell
function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  return [Math.floor(x / TILE), Math.floor(y / TILE)];
}

// hover preview
let hoverCell = null;
canvas.addEventListener("mousemove", (e) => (hoverCell = cellFromEvent(e)));
canvas.addEventListener("mouseleave", () => (hoverCell = null));

// click to place a tower of the selected plant type
canvas.addEventListener("click", (e) => {
  if (mode !== "td" || state.phase !== "play") return;
  if (selectedPlantIndex === null) {
    showPlantMessage("Select a plant first.");
    return;
  }

  const [c, r] = cellFromEvent(e);
  const plant = PLANTS[selectedPlantIndex];

  if (placeTower(c, r, selectedPlantIndex)) {
    showPlantMessage(
      `${plant.n} tower placed. Press deploy to send out plants.`,
    );
  } else if (state.myTowers.some((t) => t.plant === selectedPlantIndex)) {
    showPlantMessage(`You already have a ${plant.n} tower.`);
  } else if (state.myTowers.length >= maxTowers()) {
    showPlantMessage(`Tower limit reached (${maxTowers()}) on this level`);
  } else {
    showPlantMessage(`Towerss go on a free tile next to the path.`);
  }
});

// ==========================
// KEYBOARD CONTROLS
// =========================

addEventListener("keydown", (e) => {
  if (e.code === "KeyP" || e.code === "Escape") {
    pause();
  }

  // place a plant tower using the number keys 1-4
  const n = parseInt(e.key, 10);

  if (n >= 1 && n <= 4) {
    showPlantDetails(n - 1); // select the plant so clicks place it.
    deploy(n - 1);
  }
});

// =====================================================
// TAB NAVIGATION
//
// Controls:
//
// Plants
// Upgrades
// Battle
// Map
// =====================================================

const navButtons = document.querySelectorAll(".nav-btn");

const tabs = {
  plants: $("plantsTab"),
  upgrades: $("upgradesTab"),
  battle: $("battleTab"),
  map: $("mapTab"),
};

// =====================================================
// function that changes tabs.
// =====================================================

function setActiveTab(tabName) {
  // Remove active style
  // from every navigation button.
  navButtons.forEach((button) => {
    button.classList.remove("active");
  });

  // Hide every tab.
  Object.values(tabs).forEach((tab) => {
    tab.classList.remove("active");
  });

  // Find navigation button
  // belonging to this tab.
  const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);

  // Highlight selected button.
  if (selectedButton) {
    selectedButton.classList.add("active");
  }

  // Show selected tab.
  if (tabs[tabName]) {
    tabs[tabName].classList.add("active");
  }
}

// =====================================================
// Make navigation buttons clickable.
// =====================================================

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedTab = button.dataset.tab;
    setActiveTab(selectedTab);
  });
});

// =================================
// PLANT MESSAGE
// =================================

function showPlantMessage(message) {
  $("plantMessage").textContent = message;
}

// =====================================================
// SHOW SELECTED PLANT INFORMATION
// This fills the right-hand panel.
// =====================================================

function showPlantDetails(index) {
  // Get selected plant.
  const plant = activePlants()[index];

  // Remember selected plant.
  selectedPlantIndex = index;

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

const plantRoles = [
  "Strong Attacker", // Flytrap
  "Slows Towers", // Sundew
  "Protects & Heals", // Pitcher
  "Splash Damage", // Rafflesia
];

// Lucide icons for each combat role
const plantRoleIcons = [
  "icon-shield", // Flytrap
  "icon-crosshair", // Sundew
  "icon-heart-pulse", // Pitcher
  "icon-bomb", // Rafflesia
];

const plantGrid = $("plantGrid");

// =================================
// CREATE PLANT CARDS
// =================================

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
    showPlantDetails(index);
  });

  // Put plant card
  // inside plantGrid.
  plantGrid.appendChild(card);
});

// =====================================================
// SELECT / DEPLOY PLANT BUTTON
// =====================================================

$("selectPlantBtn").addEventListener("click", () => {
  // No plant selected.
  if (selectedPlantIndex === null) {
    return;
  }

  deploy(selectedPlantIndex);
});

// =====================================================
// HEALTH BAR
// =====================================================

function healthBar(x, y, width, valueHp, maxHp, colour) {
  g.fillStyle = "rgba(0,0,0,.55)";
  g.fillRect(x - width / 2, y, width, 4);
  g.fillStyle = colour;
  g.fillRect(x - width / 2, y, width * Math.max(0, valueHp / maxHp), 4);
}

// ============================
// DRAW GAME
// ============================
function draw() {
  // clear the canvas
  g.clearRect(0, 0, canvas.width, canvas.height);
  const bg = g.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#16301f");
  bg.addColorStop(1, "#0f2217");
  g.fillStyle = bg;
  g.fillRect(0, 0, canvas.width, canvas.height);

  // draw the paths
  g.lineCap = "round";
  g.lineJoin = "round";

  for (const path of state.map.paths) {
    // get each path from the level paths
    g.beginPath();
    path.cells.forEach((cell, i) => {
      const x = (cell.c + 0.5) * TILE;
      const y = (cell.r + 0.5) * TILE;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.strokeStyle = "#4a3a28";
    g.lineWidth = TILE * 0.65;
    g.stroke();
    g.strokeStyle = "#5d4a33";
    g.lineWidth = TILE * 0.5;
    g.stroke();
  }

  // draw the enemies on the screen
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) {
      g.fillStyle = "#2b2f2a";
      g.beginPath();
      g.arc(enemy.x, enemy.y, enemy.radius * 0.8, 0, 7);
      g.fill();
      continue;
    }
    g.strokeStyle = "rgba(255,200,160,.10)";
    g.lineWidth = 1;
    g.beginPath();
    g.arc(enemy.x, enemy.y, enemy.rng, 0, 7);
    g.stroke();
    g.fillStyle = enemy.slow > 0 ? "#7f8fa3" : "#9aa0a6"; // if enemy slowed use first colour otherwise other
    if (enemy.keep) {
      g.fillRect(
        enemy.x - enemy.radius,
        enemy.y - enemy.radius,
        enemy.radius * 2,
        enemy.radius * 2,
      );
      g.fillStyle = "#c0392b";
      g.fillRect(enemy.x - 4, enemy.y - enemy.radius - 14, 4, 14);
      g.fillRect(enemy.x, enemy.y - enemy.radius - 14, 14, 8);
    } else {
      g.beginPath();
      g.arc(enemy.x, enemy.y, enemy.radius, 0, 7);
      g.fill();
      g.fillStyle = "#6c7279";
      g.fillRect(enemy.x - 5, enemy.y - enemy.radius - 6, 10, 8);
    }
    healthBar(
      enemy.x,
      enemy.y + enemy.radius + 4,
      enemy.keep ? 60 : 34,
      enemy.hp,
      enemy.max,
      "#e05a4a",
    );
  }

  // draw the number of towers that are allowed in the level
  state.myTowers.forEach((tower) => {
    const x = (tower.c + 0.5) * TILE;
    const y = (tower.r + 0.5) * TILE;
    const plant = PLANTS[tower.plant];

    g.fillStyle = plant.col;
    g.fillRect(x - 16, y - 16, 32, 32);
    g.strokeStyle = "#ffffff";
    g.lineWidth = 2;
    g.strokeRect(x - 16, y - 16, 32, 32);
  });

  // placement preview: green if allowed, red if not
  if (hoverCell && state.phase === "play" && selectedPlantIndex !== null) {
    const [c, r] = hoverCell;
    g.fillStyle = canPlaceTower(c, r, selectedPlantIndex)
      ? "rgba(143,212,90,.35)"
      : "rgba(224,69,123,.35)";
    g.fillRect(c * TILE, r * TILE, TILE, TILE);
  }

  // draw plants that are sent out -- plants above enemies/mytowers because drawn after
  for (const p of state.plants) {
    const k = PLANTS[p.plant];
    g.fillStyle = k.col;
    g.beginPath();
    g.arc(p.x, p.y, k.radius, 0, 7);
    g.fill();
    g.fillStyle = "rgba(0,0,0,.45)";
    g.beginPath();
    g.arc(p.x, p.y, k.radius * 0.45, 0, 7);
    g.fill();
    healthBar(p.x, p.y - k.radius - 8, 20, p.hp, k.hp, "#8fd45a");
  }

  // draw the effects
  for (const f of state.fx) {
    g.strokeStyle = f.colour;
    g.lineWidth = 2;
    g.globalAlpha = Math.min(1, f.timer * 6);
    if (f.ring) {
      g.beginPath();
      g.arc(f.x1, f.y1, f.ring * (1 - f.timer / 0.3), 0, 7);
      g.stroke();
    } else {
      g.beginPath();
      g.moveTo(f.x1, f.y1);
      g.lineTo(f.x2, f.y2);
      g.stroke();
    }
    g.globalAlpha = 1;
  }
}

let lastPhase = null;

// store timestamp of previous frame
let last = performance.now(),
  // store currently displayed HUD value
  shown = {};

let lastRenderedEvolutionLevel = null;
function hud() {
  const battle = activeBattle();
  // Refresh the collection when the level changes.
  if (lastRenderedEvolutionLevel !== state.level) {
    renderEvolutionCards();
    lastRenderedEvolutionLevel = state.level;
  }

  const v = {
    sp: Math.floor(battle.spores),
    lv: mode === "boss" ? "Boss" : state.level,
    tw: (mode === "boss" ? battle.towers : battle.enemies).filter(
      (enemy) => enemy.hp > 0,
    ).length,
    tc: mode === "boss" ? "—" : state.myTowers.length + " / " + maxTowers(),
  };

  // Update spores, level, and towers.
  for (const id in v) {
    if (shown[id] !== v[id]) {
      $(id).textContent = v[id];
      shown[id] = v[id];
    }
  }

  // ===================================================
  // Disables the Select Plant button.
  // ===================================================

  if (selectedPlantIndex !== null) {
    const plant = activePlants()[selectedPlantIndex];
    const hasTower =
      mode === "boss" ||
      state.myTowers.some((t) => t.plant === selectedPlantIndex);
    $("selectPlantBtn").disabled =
      activePhase() !== "play" || !hasTower || battle.spores < plant.cost;
  }
}

// =============================
// GAME LOOP
// =============================

function loop(timer) {
  const deltaTime = Math.min(0.05, (timer - last) / 1000);
  last = timer;
  if (activePhase() === "play") {
    if (mode === "boss") updateBossLevel(bossState, deltaTime);
    else update(deltaTime);
  }

  // check if game is ended
  const phase = activePhase();
  if (phase !== lastPhase) {
    if (mode === "boss" && phase === "won")
      show("Boss defeated", "Big Boss has fallen.", "Retry Boss");
    else if (mode === "boss" && phase === "lost")
      show(
        "The swarm withered",
        bossState.defeatReason === "overrun"
          ? "The advancing killzone overran the battlefield."
          : "No plants left and not enough spores to send more.",
        "Retry Boss",
      );
    else if (phase === "won")
      show("Keep breached", "Level " + state.level + " cleared.", "Next level");
    else if (phase === "lost")
      show(
        "The swarm withered",
        "No plants left and not enough spores.",
        "Retry",
      );
    lastPhase = phase;
  }
  if (mode === "boss") drawBossLevel(g, bossState, canvas.width);
  else draw();
  hud();

  requestAnimationFrame(loop);
}

// =====================================================
// INITIALIZE GAME
// =====================================================

build();
state.phase = "menu";

// =====================================================
// Select Flytrap by default so that
// the right panel is not empty.
// =====================================================

showPlantDetails(0);

setActiveTab("battle");

show(
  "Carniflora: Breach",
  "Send carnivorous plants down the path. They bite towers as they pass. Destroy the keep at the end before your swarm runs out.",
  "Start",
);

requestAnimationFrame(loop);

//===================================
// RENDER PLANT PROGRESSION CARDS
//==================================

function renderEvolutionCards() {
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

renderEvolutionCards();
