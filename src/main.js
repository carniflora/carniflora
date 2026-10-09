import { state, build, update, PLANTS, sendOut, TILE } from "./game.js";
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

// let towerType = null;

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

  // Tell the player when they do not have enough spores.
  if (activeBattle().spores < k.cost) {
    showPlantMessage(`You need ${k.cost} spores to deploy ${k.n}.`);
    return;
  }

  if (mode === "boss") spawnBossPlant(bossState, i);
  else sendOut(i);
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

// // click to add a Tower
// addEventListener("click", (e) => {
//   if (state.phase !== "play") return;
//   const rect = canvas.getBoundingClientRect();
//   const c = Math.floor((e.clientX - rect.left) / TILE);
//   const r = Math.floor((e.clientY - rect.top) / TILE);

//   const existing = state.myTowers.find(
//     (tower) => tower.c === c && tower.r === r,
//   );
//   placeTower(c, r, towerType);
// });

// ==========================
// KEYBOARD CONTROLS
// =========================

addEventListener("keydown", (e) => {
  if (e.code === "KeyP" || e.code === "Escape") {
    pause();
  }

  const n = parseInt(e.key, 10);

  if (n >= 1 && n <= 4) {
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

  // Change plant colour circle.
  $("detailColor").style.background = plant.col;

  // Allow Select Plant button.
  $("selectPlantBtn").disabled = false;

  // Remove selected style
  // from every plant card.
  document.querySelectorAll(".plant-option").forEach((card) => {
    card.classList.remove("selected");
  });

  // Find selected plant card.
  const selectedCard = document.querySelector(`[data-plant-index="${index}"]`);

  // Highlight it.
  if (selectedCard) {
    selectedCard.classList.add("selected");
  }

  // Tell player what they selected.
  showPlantMessage(`${plant.n} selected.`);
}

const plantGrid = $("plantGrid");

// =================================
// CREATE PLANT CARDS
// =================================

PLANTS.forEach((plant, index) => {
  // Create button.
  const card = document.createElement("button");

  // CSS class.
  card.className = "plant-option";

  // Remember which plant
  // this button represents.
  card.dataset.plantIndex = index;

  // Add information to card.
  card.innerHTML = `
       <div class="plant-card-top">

        <span
          class="plant-card-color"
          style="background:${plant.col}">
        </span>

        <span class="plant-number">
          ${index + 1}
        </span>

      </div>

      <h3>
        ${plant.n}
      </h3>

      <p>
        ${plant.desc}
      </p>

      <div class="plant-card-cost">
        ${plant.cost} spores
      </div>
    `;

  // When clicked:
  // show information first.

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

  // // draw the number of towers that are allowed in the level
  // state.myTowers.forEach((tower) => {
  //   const x = (tower.c + 0.5) * TILE;
  //   const y = (tower.r + 0.5) * TILE;
  //   const plant = PLANTS[tower.plant];

  //   g.fillStyle = plant.col;
  //   g.fillRect(x - 16, y - 16, 32, 32);
  //   g.strokeStyle = "#ffffff";
  //   g.lineWidth = 2;
  //   g.strokeRect(x - 16, y - 16, 32, 32);
  // });

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

function hud() {
  const battle = activeBattle();
  const v = {
    sp: Math.floor(battle.spores),
    lv: mode === "boss" ? "Boss" : state.level,
    tw: (mode === "boss" ? battle.towers : battle.enemies).filter(
      (enemy) => enemy.hp > 0,
    ).length,
    // tc: state.myTowers.length + " / " + maxTowers(),
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
    $("selectPlantBtn").disabled =
      activePhase() !== "play" || battle.spores < plant.cost;
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
