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

import { MAP_COLS, MAP_ROWS } from "./levels.js";

// =====================================================
// CARNIFLORA: BREACH — MAIN JAVASCRIPT
// =====================================================

const $ = (id) => document.getElementById(id);

// =====================================================
// CANVAS
// =====================================================

const canvas = $("c");
const g = canvas.getContext("2d");

canvas.width = MAP_COLS * TILE;
canvas.height = MAP_ROWS * TILE;

// =====================================================
// PLANT DATA
// =====================================================

let selectedPlantIndex = null;

const plantImages = [
  "./assets/plants/flytrap.png",
  "./assets/plants/sundew.png",
  "./assets/plants/pitcher.png",
  "./assets/plants/rafflesia.png",
];

const plantProgression = [
  {
    name: "Flytrap",
    level: 1,
    role: "Frontline",
    description:
      "A tough plant that attacks enemies up close and can withstand damage.",
    image: plantImages[0],
  },
  {
    name: "Sundew",
    level: 2,
    role: "Support",
    description:
      "A specialized plant that helps control enemies during battle.",
    image: plantImages[1],
  },
  {
    name: "Pitcher",
    level: 3,
    role: "Defender",
    description:
      "A resilient plant that strengthens your strategy as levels progress.",
    image: plantImages[2],
  },
  {
    name: "Rafflesia",
    level: 4,
    role: "Boss",
    description:
      "A powerful plant with abilities designed for tougher battles.",
    image: plantImages[3],
  },
];

const plantRoles = [
  "Strong Attacker",
  "Slows Towers",
  "Protects & Heals",
  "Splash Damage",
];

const plantRoleIcons = [
  "icon-shield",
  "icon-crosshair",
  "icon-heart-pulse",
  "icon-bomb",
];

// =====================================================
// MESSAGES
// =====================================================

function showPlantMessage(message) {
  const element = $("plantMessage");

  if (element) {
    element.textContent = message;
  }
}

/*********************************************************adddedddddddddddddddddd */
let evolutionMessageTimeout;

function showEvolutionMessage(message) {
  const messageElement = document.getElementById("evolutionMessage");

  if (!messageElement) return;

  // Cancel the previous timer if another stage was clicked.
  clearTimeout(evolutionMessageTimeout);

  // Show the notification.
  messageElement.textContent = message;

  // Hide it automatically after 3 seconds.
  evolutionMessageTimeout = setTimeout(() => {
    messageElement.textContent = "";
  }, 3000);
}

/*********************************************************adddedddddddddddddddddd */
// =====================================================
// PLANT DEPLOYMENT
// =====================================================

function deploy(index) {
  const plant = PLANTS[index];

  if (!plant) {
    return;
  }

  if (state.phase !== "play") {
    showPlantMessage("Start the battle before deploying a plant.");
    return;
  }

  const hasTower = state.myTowers.some((tower) => tower.plant === index);

  if (!hasTower) {
    showPlantMessage(`Place a ${plant.n} tower first, then deploy your plant.`);
    return;
  }

  if (state.spores < plant.cost) {
    showPlantMessage(`You need ${plant.cost} spores to deploy ${plant.n}.`);
    return;
  }

  deploySelected(index);

  showPlantMessage(`${plant.n} deployed!`);
}

// =====================================================
// GAME OVERLAY
// =====================================================

function show(title, message, buttonText) {
  $("ot").textContent = title;
  $("om").textContent = message;
  $("ob").textContent = buttonText;

  const overlay = $("ov");

  overlay.classList.remove("hide");
  overlay.classList.add("show");

  $("ob").focus();
}

function hideOverlay() {
  const overlay = $("ov");

  overlay.classList.remove("show");
  overlay.classList.add("hide");
}

// =====================================================
// START LEVEL
// =====================================================

function startLevel() {
  build();

  state.phase = "play";

  hideOverlay();

  showPlantMessage("Choose a plant and deploy it.");
}

// =====================================================
// PAUSE
// =====================================================

function pause() {
  if (state.phase === "play") {
    state.phase = "pause";

    show("Paused", "Timers are frozen.", "Resume");
  } else if (state.phase === "pause") {
    state.phase = "play";

    hideOverlay();
  }
}

// =====================================================
// GAME CONTROLS
// =====================================================

$("pz").addEventListener("click", pause);

$("rs").addEventListener("click", () => {
  if (state.phase !== "menu") {
    startLevel();
  }
});

$("ob").addEventListener("click", () => {
  if (state.phase === "menu") {
    startLevel();
    return;
  }

  if (state.phase === "pause") {
    pause();
    return;
  }

  if (state.phase === "won") {
    state.level++;
  }

  startLevel();
});

// =====================================================
// CANVAS INPUT
// =====================================================

function cellFromEvent(event) {
  const rect = canvas.getBoundingClientRect();

  const x = (event.clientX - rect.left) * (canvas.width / rect.width);

  const y = (event.clientY - rect.top) * (canvas.height / rect.height);

  return [Math.floor(x / TILE), Math.floor(y / TILE)];
}

let hoverCell = null;

canvas.addEventListener("mousemove", (event) => {
  hoverCell = cellFromEvent(event);
});

canvas.addEventListener("mouseleave", () => {
  hoverCell = null;
});

canvas.addEventListener("click", (event) => {
  if (state.phase !== "play") {
    return;
  }

  if (selectedPlantIndex === null) {
    showPlantMessage("Select a plant first.");
    return;
  }

  const [column, row] = cellFromEvent(event);

  const plant = PLANTS[selectedPlantIndex];

  if (placeTower(column, row, selectedPlantIndex)) {
    showPlantMessage(
      `${plant.n} tower placed. Press Deploy to send out plants.`,
    );
  } else if (
    state.myTowers.some((tower) => tower.plant === selectedPlantIndex)
  ) {
    showPlantMessage(`You already have a ${plant.n} tower.`);
  } else if (state.myTowers.length >= maxTowers()) {
    showPlantMessage(`Tower limit reached (${maxTowers()}) on this level.`);
  } else {
    showPlantMessage("Towers go on a free tile next to the path.");
  }
});

// =====================================================
// KEYBOARD CONTROLS
// =====================================================

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyP" || event.code === "Escape") {
    pause();
    return;
  }

  const number = Number.parseInt(event.key, 10);

  if (number >= 1 && number <= 4) {
    showPlantDetails(number - 1);
    deploy(number - 1);
  }
});

// =====================================================
// TAB NAVIGATION
// =====================================================

const navButtons = document.querySelectorAll(".nav-btn[data-tab]");

const tabs = {
  plants: $("plantsTab"),
  upgrades: $("upgradesTab"),
  battle: $("battleTab"),
  map: $("mapTab"),
};

function setActiveTab(tabName) {
  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  Object.entries(tabs).forEach(([name, tab]) => {
    tab.classList.toggle("active", name === tabName);
  });

  if (tabName === "upgrades") {
    renderEvolutionCards();
  }
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tab);
  });
});

// =====================================================
// SELECTED PLANT DETAILS — ORIGINAL RIGHT PANEL
// =====================================================

function showPlantDetails(index) {
  const plant = PLANTS[index];

  if (!plant) {
    return;
  }

  selectedPlantIndex = index;

  $("detailName").textContent = plant.n;
  $("detailHealth").textContent = plant.hp;
  $("detailDamage").textContent = plant.dmg;
  $("detailRange").textContent = plant.rng;
  $("detailSpeed").textContent = plant.spd;
  $("detailCost").textContent = plant.cost;
  $("detailDescription").textContent = plant.desc;

  const detailContainer = $("detailColor");

  let detailImage = detailContainer.querySelector("img");

  if (!detailImage) {
    detailImage = document.createElement("img");
    detailContainer.appendChild(detailImage);
  }

  detailContainer.style.backgroundColor = plant.col;

  detailImage.style.display = "none";
  detailImage.alt = `${plant.n} illustration`;

  detailImage.onload = () => {
    detailImage.style.display = "block";

    detailContainer.style.backgroundColor = "#eee9db";
  };

  detailImage.onerror = () => {
    detailImage.style.display = "none";

    detailContainer.style.backgroundColor = plant.col;
  };

  detailImage.src = plantImages[index];

  $("selectPlantBtn").disabled = false;

  document.querySelectorAll(".plant-option").forEach((card) => {
    card.classList.toggle(
      "selected",
      Number(card.dataset.plantIndex) === index,
    );
  });

  showPlantMessage(`${plant.n} selected`);
}

// =====================================================
// PLANTS PAGE — CREATE PLANT CARDS
// =====================================================

const plantGrid = $("plantGrid");

PLANTS.forEach((plant, index) => {
  const card = document.createElement("button");

  card.type = "button";
  card.className = "plant-option";

  card.dataset.plantIndex = String(index);

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
            <i
              class="${plantRoleIcons[index]}"
              aria-hidden="true"
            ></i>
            ${plantRoles[index]}
          </span>
        </div>

      </div>

      <div class="plant-card-footer">
        <span class="plant-card-cost">
          <i
            class="icon-leaf spore-icon"
            aria-hidden="true"
          ></i>
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

  card.addEventListener("click", () => {
    showPlantDetails(index);
  });

  plantGrid.appendChild(card);
});

$("selectPlantBtn").addEventListener("click", () => {
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

// =====================================================
// DRAW GAME
// =====================================================

function draw() {
  g.clearRect(0, 0, canvas.width, canvas.height);

  const background = g.createLinearGradient(0, 0, 0, canvas.height);

  background.addColorStop(0, "#16301f");
  background.addColorStop(1, "#0f2217");

  g.fillStyle = background;

  g.fillRect(0, 0, canvas.width, canvas.height);

  // Draw level paths.
  g.lineCap = "round";
  g.lineJoin = "round";

  for (const path of state.map.paths) {
    g.beginPath();

    path.cells.forEach((cell, index) => {
      const x = (cell.c + 0.5) * TILE;
      const y = (cell.r + 0.5) * TILE;

      if (index > 0) {
        g.lineTo(x, y);
      } else {
        g.moveTo(x, y);
      }
    });

    g.strokeStyle = "#4a3a28";
    g.lineWidth = TILE * 0.65;
    g.stroke();

    g.strokeStyle = "#5d4a33";
    g.lineWidth = TILE * 0.5;
    g.stroke();
  }

  // Draw enemy towers and castle.
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) {
      g.fillStyle = "#2b2f2a";

      g.beginPath();

      g.arc(enemy.x, enemy.y, enemy.radius * 0.8, 0, Math.PI * 2);

      g.fill();
      continue;
    }

    g.strokeStyle = "rgba(255,200,160,.10)";
    g.lineWidth = 1;

    g.beginPath();

    g.arc(enemy.x, enemy.y, enemy.rng, 0, Math.PI * 2);

    g.stroke();

    g.fillStyle = enemy.slow > 0 ? "#7f8fa3" : "#9aa0a6";

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

      g.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);

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

  // Draw placed plant towers.
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

  // Show placement preview.
  if (hoverCell && state.phase === "play" && selectedPlantIndex !== null) {
    const [column, row] = hoverCell;

    g.fillStyle = canPlaceTower(column, row, selectedPlantIndex)
      ? "rgba(143,212,90,.35)"
      : "rgba(224,69,123,.35)";

    g.fillRect(column * TILE, row * TILE, TILE, TILE);
  }

  // Draw deployed plants.
  for (const plantUnit of state.plants) {
    const plant = PLANTS[plantUnit.plant];

    g.fillStyle = plant.col;

    g.beginPath();

    g.arc(plantUnit.x, plantUnit.y, plant.radius, 0, Math.PI * 2);

    g.fill();

    g.fillStyle = "rgba(0,0,0,.45)";

    g.beginPath();

    g.arc(plantUnit.x, plantUnit.y, plant.radius * 0.45, 0, Math.PI * 2);

    g.fill();

    healthBar(
      plantUnit.x,
      plantUnit.y - plant.radius - 8,
      20,
      plantUnit.hp,
      plant.hp,
      "#8fd45a",
    );
  }

  // Draw attack effects.
  for (const effect of state.fx) {
    g.strokeStyle = effect.colour;
    g.lineWidth = 2;

    g.globalAlpha = Math.min(1, effect.timer * 6);

    if (effect.ring) {
      g.beginPath();

      g.arc(
        effect.x1,
        effect.y1,
        effect.ring * (1 - effect.timer / 0.3),
        0,
        Math.PI * 2,
      );

      g.stroke();
    } else {
      g.beginPath();

      g.moveTo(effect.x1, effect.y1);

      g.lineTo(effect.x2, effect.y2);

      g.stroke();
    }

    g.globalAlpha = 1;
  }
}

// =====================================================
// UPGRADES PAGE
// =====================================================

let upgradeSelection = 0;
let lastRenderedEvolutionLevel = null;

// =====================================================
// UPDATE PINK PLANT INFORMATION PANEL
// =====================================================

function showUpgradeDetails(index) {
  const entry = plantProgression[index];
  const plant = PLANTS[index];

  if (!entry || !plant) {
    return;
  }

  upgradeSelection = index;

  const setText = (id, value) => {
    const element = $(id);

    if (element) {
      element.textContent = String(value ?? "—");
    }
  };

  // Selected plant illustration.
  const preview = $("upgradePreview");

  if (preview) {
    preview.style.visibility = "visible";

    // Show the castle when Boss (Stage 4) is selected
    preview.src = index === 3 ? "./assets/plants/castle.png" : entry.image;

    preview.alt = index === 3 ? "Boss Castle" : `${entry.name} illustration`;
  }

  // Plant details.
  setText("upgradeRole", entry.role.toUpperCase());

  setText("upgradeName", index === 3 ? "Boss" : entry.name);

  setText("upgradeDescription", entry.description);

  setText("upgradeStage", String(entry.level).padStart(2, "0"));

  // Read actual plant stats from game.js.
  setText("upgradeDamage", plant.dmg);
  setText("upgradeHealth", plant.hp);
  setText("upgradeRange", plant.rng);
  setText("upgradeSpeed", plant.spd);

  // Special ability information.
  const missions = [
    {
      title: "Strong Attacker",
      description:
        "Use Flytrap to attack enemies up close and support your frontline.",
    },
    {
      title: "Slows Towers",
      description: "Use Sundew to help control enemy defenses during battle.",
    },
    {
      title: "Protects & Heals",
      description: "Use Pitcher to strengthen your plant army.",
    },
    {
      title: "Splash Damage",
      description: "Use Rafflesia to prepare for tougher battles.",
    },
  ];

  setText("upgradeMission", missions[index].title);

  setText("upgradeMissionDescription", missions[index].description);

  // Highlight selected island.
  // Remove the previous selection timer
  clearTimeout(window.upgradeSelectionTimer);

  // Highlight the selected stage
  document.querySelectorAll(".upgrade-stage").forEach((button) => {
    button.classList.toggle(
      "selected",
      Number(button.dataset.stage) === index + 1,
    );
  });

  // Automatically remove the gold highlight after 3 seconds
  window.upgradeSelectionTimer = setTimeout(() => {
    document.querySelectorAll(".upgrade-stage").forEach((button) => {
      button.classList.remove("selected");
    });
  }, 3000);

  // Highlight selected plant in bottom collection.
  document.querySelectorAll(".upgrade-collection-choice").forEach((button) => {
    button.classList.toggle("selected", Number(button.dataset.plant) === index);
  });
}

// =====================================================
// CREATE FOUR FLOATING LEVEL ISLANDS
// =====================================================

function renderEvolutionCards() {
  const grid = $("evolutionGrid");

  const selector = $("upgradePlantSelector");

  if (!grid) {
    return;
  }

  const currentLevel = Math.max(1, Number(state.level) || 1);

  const count = $("unlockedPlantCount");

  if (count) {
    count.textContent = `Level ${Math.min(currentLevel, 4)} of 4`;
  }

  grid.replaceChildren();

  plantProgression.forEach((entry, index) => {
    const stage = index + 1;

    const unlocked = currentLevel >= stage;

    const button = document.createElement("button");

    button.type = "button";

    button.dataset.stage = String(stage);

    button.className = [
      "upgrade-stage",
      `upgrade-stage-${stage}`,
      unlocked ? "unlocked" : "locked",
    ].join(" ");

    button.setAttribute(
      "aria-label",
      `Level  ${stage}: ${index === 3 ? "Boss" : entry.name}, ${unlocked ? "unlocked" : "locked"}`,
    );

    // Plant image inside the checkpoint.
    const image = document.createElement("img");
    image.className = "stage-plant-image";

    image.src = index === 3 ? "./assets/plants/castle.png" : entry.image;

    image.alt = index === 3 ? "Boss castle" : entry.name;

    // Level number badge.
    const number = document.createElement("span");

    number.className = "upgrade-stage-number";

    number.textContent = String(stage);

    // Plant name label.
    const name = document.createElement("span");

    name.className = "upgrade-stage-name";

    name.textContent = index === 3 ? "Boss" : entry.name;

    // Locked / unlocked label.
    const status = document.createElement("span");

    status.className = "upgrade-stage-state";

    status.innerHTML = unlocked
      ? '<span class="stage-status-icon">✓</span> UNLOCKED'
      : `<svg
       class="stage-status-icon"
       xmlns="http://www.w3.org/2000/svg"
       width="12"
       height="12"
       viewBox="0 0 24 24"
       fill="none"
       stroke="currentColor"
       stroke-width="2"
       stroke-linecap="round"
       stroke-linejoin="round"
       aria-hidden="true"
     >
       <rect x="3" y="11" width="18" height="11" rx="2"/>
       <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
       <circle cx="12" cy="16" r="1"/>
     </svg>
     LOCKED`;

    button.append(image, number, name, status);

    button.addEventListener("click", () => {
      showUpgradeDetails(index);

      if (unlocked) {
        showEvolutionMessage(`Level ${stage}: ${entry.name}`);
      } else {
        showEvolutionMessage(
          `Level ${stage} is locked. Complete earlier battles to unlock it.`,
        );
      }
    });

    if (stage === 4) {
      const flowers = document.createElement("div");
      flowers.className = "castle-flowers";

      flowers.innerHTML = `
    <i class="bi bi-flower1"></i>
    <i class="bi bi-flower2"></i>
    <i class="bi bi-flower1"></i>
  `;

      button.appendChild(flowers);
    }
    grid.appendChild(button);
  });

  // ===================================================
  // BOTTOM PLANT COLLECTION
  // ===================================================

  if (selector) {
    selector.replaceChildren();

    PLANTS.forEach((plant, index) => {
      const button = document.createElement("button");

      button.type = "button";

      button.className = "upgrade-collection-choice";

      button.dataset.plant = String(index);

      const image = document.createElement("img");
      image.className = "upgrade-collection-image";
      image.src = plantImages[index];
      image.alt = `${plant.n} illustration`;

      const label = document.createElement("span");

      label.textContent = plant.n;

      button.append(image, label);

      button.addEventListener("click", () => {
        showUpgradeDetails(index);

        showEvolutionMessage(`${plant.n} selected`);
      });

      selector.appendChild(button);
    });
  }

  showUpgradeDetails(upgradeSelection);
}

// =====================================================
// GO TO BATTLE FROM UPGRADES
// =====================================================

$("upgradeGoBattle")?.addEventListener("click", () => {
  setActiveTab("battle");
});

// =====================================================
// HUD
// =====================================================

let lastPhase = null;

let last = performance.now();

let shown = {};

function hud() {
  // Refresh level islands after progression.
  if (lastRenderedEvolutionLevel !== state.level) {
    renderEvolutionCards();

    lastRenderedEvolutionLevel = state.level;
  }

  const values = {
    sp: Math.floor(state.spores),
    lv: state.level,
    tw: state.enemies.filter((enemy) => enemy.hp > 0).length,
    tc: state.myTowers.length + " / " + maxTowers(),
  };

  for (const id in values) {
    const element = $(id);

    if (element && shown[id] !== values[id]) {
      element.textContent = values[id];

      shown[id] = values[id];
    }
  }

  if (selectedPlantIndex !== null) {
    const plant = PLANTS[selectedPlantIndex];

    const hasTower = state.myTowers.some(
      (tower) => tower.plant === selectedPlantIndex,
    );

    $("selectPlantBtn").disabled =
      state.phase !== "play" || !hasTower || state.spores < plant.cost;
  }
}

// =====================================================
// GAME LOOP
// =====================================================

function loop(timer) {
  const deltaTime = Math.min(0.05, (timer - last) / 1000);

  last = timer;

  if (state.phase === "play") {
    update(deltaTime);
  }

  if (state.phase !== lastPhase) {
    if (state.phase === "won") {
      show("Keep breached", `Level ${state.level} cleared.`, "Next level");
    }

    if (state.phase === "lost") {
      show(
        "The swarm withered",
        "No plants left and not enough spores.",
        "Retry",
      );
    }

    lastPhase = state.phase;
  }

  draw();
  hud();

  requestAnimationFrame(loop);
}

// =====================================================
// INITIALIZE GAME
// =====================================================

build();

state.phase = "menu";

showPlantDetails(0);

renderEvolutionCards();

setActiveTab("battle");

show(
  "Carniflora: Breach",
  "Send carnivorous plants down the path. They bite towers as they pass. Destroy the keep at the end before your swarm runs out.",
  "Start",
);

requestAnimationFrame(loop);
