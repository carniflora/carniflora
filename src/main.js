import { at, TOTAL, PATH } from "./path.js";
// ===========
// CANVAS
// ===========
const C = document.getElementById("c"),
  g = C.getContext("2d");

// ===============
// PLANT TYPES
// ==============
const KINDS = [
  {
    n: "Flytrap",
    cost: 40,
    hp: 140,
    spd: 46,
    rng: 70,
    dmg: 16,
    cd: 0.8,
    col: "#8fd45a",
    r: 10,
    d: "Tough biter, short reach",
  },

  {
    n: "Sundew",
    cost: 30,
    hp: 55,
    spd: 58,
    rng: 115,
    dmg: 6,
    cd: 0.7,
    col: "#e0457b",
    r: 7,
    d: "Ranged, slows tower fire",
  },

  {
    n: "Pitcher",
    cost: 60,
    hp: 220,
    spd: 38,
    rng: 70,
    dmg: 5,
    cd: 1,
    col: "#e8b04a",
    r: 12,
    d: "Soaks hits, heals allies",
  },

  {
    n: "Rafflesia",
    cost: 90,
    hp: 90,
    spd: 34,
    rng: 125,
    dmg: 34,
    cd: 2.4,
    col: "#b05cf0",
    r: 9,
    d: "Splash blast on towers",
  },
];

// ===================
// TOWER POSITIONS
// ===================
const SPOTS = [
  [150, 160],
  [270, 250],
  [350, 350],
  [430, 260],
  [540, 200],
  [600, 90],
  [690, 260],
  [800, 370],
];

// ====================
// GAME STATE
// ====================
const S = {
  state: "menu",
  level: 1,
  spores: 0,
  plants: [],
  towers: [],
  fx: [],
  keep: null,
};

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

const $ = (id) => document.getElementById(id);

// ================
// BUILD LEVEL
// ================

function build() {
  const L = S.level - 1;
  S.towers = SPOTS.map((p) => ({
    x: p[0],
    y: p[1],
    hp: 90 * (1 + 0.35 * L),
    max: 90 * (1 + 0.35 * L),
    rng: 115,
    dmg: 8 * (1 + 0.2 * L),
    cd: 0,
    base: 1.1,
    slow: 0,
    r: 16,
  }));

  S.keep = {
    x: 905,
    y: 420,
    hp: 420 * (1 + 0.35 * L),
    max: 420 * (1 + 0.35 * L),
    rng: 105,
    dmg: 10 * (1 + 0.2 * L),
    cd: 0,
    base: 1.2,
    slow: 0,
    r: 30,
    keep: true,
  };
  S.towers.push(S.keep);
  S.plants = [];
  S.fx = [];
  S.spores = 120;
}

// =====================================================
// SEND / DEPLOY PLANT
// added messages for the new user interface.
// =====================================================

function send(i) {
  const k = KINDS[i];

  // Player cannot deploy until the game starts.
  if (S.state !== "play") {
    showPlantMessage("Start the battle before deploying a plant.");
    return;
  }

  // Tell the player when they do not have enough spores.
  if (S.spores < k.cost) {
    showPlantMessage(`You need ${k.cost} spores to deploy ${k.n}.`);
    return;
  }

  S.spores -= k.cost;
  S.plants.push({
    k: i,
    s: 0,
    x: -20,
    y: 110,
    hp: k.hp,
    cd: 0,
  });
  showPlantMessage(`${k.n} deployed!`);
}

// ============================
// FIND NEAREST TARGET
// =============================

function nearest(list, x, y, rng) {
  let b = null,
    bd = rng;
  for (const o of list) {
    const d = Math.hypot(o.x - x, o.y - y);
    if (d <= bd + (o.r || 0) && o.hp > 0) {
      b = o;
      bd = d;
    }
  }
  return b;
}

// =================================
// UPDATE GAME
// =================================
function update(dt) {
  // Regenerate spores over time.
  S.spores += 6 * dt;
  // Towers that are still alive.
  const alive = S.towers.filter((t) => t.hp > 0);

  // ===================
  // UPDATE PLANTS
  // ====================

  for (const p of S.plants) {
    const k = KINDS[p.k];
    // Move plant along the path.
    if (p.s < TOTAL) {
      p.s += k.spd * dt;
    }

    // Get x and y position.
    [p.x, p.y] = at(p.s);

    // Reduce attack cooldown.
    p.cd -= dt;

    // =========================
    // PITCHER HEALING
    // ==========================

    if (k.n === "Pitcher") {
      for (const q of S.plants) {
        if (q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 80) {
          q.hp = Math.min(KINDS[q.k].hp, q.hp + 4 * dt);
        }
      }
    }

    // ========================
    // PLANT ATTACK
    // =========================

    if (p.cd <= 0) {
      const t = nearest(alive, p.x, p.y, k.rng);

      if (t) {
        p.cd = k.cd;
        t.hp -= k.dmg;

        S.fx.push({
          x1: p.x,
          y1: p.y,
          x2: t.x,
          y2: t.y,
          t: 0.12,
          c: k.col,
        });

        // Sundew slows towers.
        if (k.n === "Sundew") {
          t.slow = 2;
        }

        // Rafflesia splash attack.
        if (k.n === "Rafflesia") {
          for (const o of alive) {
            if (o !== t && Math.hypot(o.x - t.x, o.y - t.y) < 60) {
              o.hp -= k.dmg * 0.5;
            }
          }

          S.fx.push({
            x1: t.x,
            y1: t.y,
            x2: t.x,
            y2: t.y,
            t: 0.3,
            c: k.col,
            ring: 60,
          });
        }
      }
    }
  }

  // =========================
  // TOWER ATTACKS
  // ==========================

  for (const t of alive) {
    t.slow = Math.max(0, t.slow - dt);
    t.cd -= dt * (t.slow > 0 ? 0.55 : 1);

    if (t.cd <= 0) {
      const p = nearest(S.plants, t.x, t.y, t.rng);
      if (p) {
        t.cd = t.base;
        p.hp -= t.dmg;
        S.fx.push({
          x1: t.x,
          y1: t.y,
          x2: p.x,
          y2: p.y,
          t: 0.1,
          c: "#ffd9a0",
        });
      }
    }
  }

  // Remove dead plants.
  S.plants = S.plants.filter((p) => p.hp > 0);

  // Update attack effects.
  S.fx.forEach((f) => (f.t -= dt));

  S.fx = S.fx.filter((f) => f.t > 0);

  // Win.
  if (S.keep.hp <= 0) {
    end(true);
  }

  // Lose.
  else if (
    !S.plants.length &&
    S.spores < Math.min(...KINDS.map((k) => k.cost))
  ) {
    end(false);
  }
}

// =======================
// END LEVEL
// ======================

function end(win) {
  S.state = win ? "won" : "lost";

  show(
    win ? "Keep breached" : "The swarm withered",
    win
      ? "Level " + S.level + " cleared. The next keep has tougher towers."
      : "No plants left and not enough spores to send more. Try mixing Pitchers and Rafflesia.",
    win ? "Next level" : "Retry",
  );
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
  build();
  S.state = "play";
  $("ov").classList.add("hide");
  showPlantMessage("Choose a plant and deploy it.");
}

// ====================
// PAUSE
// ==================

function pause() {
  if (S.state === "play") {
    S.state = "pause";
    show("Paused", "Timers are frozen.", "Resume");
  } else if (S.state === "pause") {
    S.state = "play";
    $("ov").classList.add("hide");
  }
}

// ========================
// BUTTON CONTROLS
// ========================

$("pz").onclick = pause;
$("rs").onclick = () => {
  if (S.state !== "menu") {
    startLevel();
  }
};

// =====================================================
// START / RESUME / NEXT LEVEL BUTTON
// =====================================================

$("ob").onclick = () => {
  // Start game.
  if (S.state === "menu") {
    startLevel();
    return;
  }

  // Resume game.
  if (S.state === "pause") {
    pause();
    return;
  }

  // Next level.
  if (S.state === "won") {
    S.level++;
  }

  // Retry / next level.
  startLevel();
};

// ==========================
// KEYBOARD CONTROLS
// =========================

addEventListener("keydown", (e) => {
  if (e.code === "KeyP" || e.code === "Escape") {
    pause();
  }

  const n = parseInt(e.key, 10);

  if (n >= 1 && n <= 4) {
    send(n - 1);
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
  const plant = KINDS[index];

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
  $("detailDescription").textContent = plant.d;

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

KINDS.forEach((plant, index) => {
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
        ${plant.d}
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

  // Uses ORIGINAL send() function.
  send(selectedPlantIndex);
});

// =====================================================
// HEALTH BAR
// =====================================================

function bar(x, y, w, v, m, c) {
  g.fillStyle = "rgba(0,0,0,.55)";
  g.fillRect(x - w / 2, y, w, 4);
  g.fillStyle = c;
  g.fillRect(x - w / 2, y, w * Math.max(0, v / m), 4);
}

// ============================
// DRAW GAME
// ============================

function draw() {
  // Clear canvas.
  g.clearRect(0, 0, 960, 540);

  // ==========================
  // BACKGROUND
  // ========================

  const bg = g.createLinearGradient(0, 0, 0, 540);
  bg.addColorStop(0, "#16301f");
  bg.addColorStop(1, "#0f2217");
  g.fillStyle = bg;
  g.fillRect(0, 0, 960, 540);

  // ==================
  // PATH
  // ==================

  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();

  PATH.forEach((p, i) => {
    if (i) {
      g.lineTo(p[0], p[1]);
    } else {
      g.moveTo(p[0], p[1]);
    }
  });

  g.strokeStyle = "#4a3a28";
  g.lineWidth = 40;
  g.stroke();
  g.strokeStyle = "#5d4a33";
  g.lineWidth = 30;
  g.stroke();

  // ============================
  // TOWERS
  // ============================

  for (const t of S.towers) {
    if (t.hp <= 0) {
      g.fillStyle = "#2b2f2a";
      g.beginPath();
      g.arc(t.x, t.y, t.r * 0.8, 0, 7);
      g.fill();
      continue;
    }

    // Tower attack range.
    g.strokeStyle = "rgba(255,200,160,.10)";
    g.lineWidth = 1;
    g.beginPath();
    g.arc(t.x, t.y, t.rng, 0, 7);
    g.stroke();
    g.fillStyle = t.slow > 0 ? "#7f8fa3" : "#9aa0a6";

    // Final keep.
    if (t.keep) {
      g.fillRect(t.x - t.r, t.y - t.r, t.r * 2, t.r * 2);
      g.fillStyle = "#c0392b";
      g.fillRect(t.x - 4, t.y - t.r - 14, 4, 14);
      g.fillRect(t.x, t.y - t.r - 14, 14, 8);
    }

    // Normal tower.
    else {
      g.beginPath();
      g.arc(t.x, t.y, t.r, 0, 7);
      g.fill();
      g.fillStyle = "#6c7279";
      g.fillRect(t.x - 5, t.y - t.r - 6, 10, 8);
    }

    // Tower health.
    bar(t.x, t.y + t.r + 4, t.keep ? 60 : 34, t.hp, t.max, "#e05a4a");
  }

  // ===================================================
  // PLANTS
  // ===================================================

  for (const p of S.plants) {
    const k = KINDS[p.k];

    // Plant body.
    g.fillStyle = k.col;
    g.beginPath();
    g.arc(p.x, p.y, k.r, 0, 7);
    g.fill();
    // Plant centre.
    g.fillStyle = "rgba(0,0,0,.45)";
    g.beginPath();
    g.arc(p.x, p.y, k.r * 0.45, 0, 7);
    g.fill();

    // Plant health bar.
    bar(p.x, p.y - k.r - 8, 20, p.hp, k.hp, "#8fd45a");
  }

  // ==============================
  // ATTACK EFFECTS
  // =============================

  for (const f of S.fx) {
    g.strokeStyle = f.c;
    g.lineWidth = 2;
    g.globalAlpha = Math.min(1, f.t * 6);

    // Splash ring.
    if (f.ring) {
      g.beginPath();
      g.arc(f.x1, f.y1, f.ring * (1 - f.t / 0.3), 0, 7);
      g.stroke();
    }
    // Normal attack line.
    else {
      g.beginPath();
      g.moveTo(f.x1, f.y1);
      g.lineTo(f.x2, f.y2);
      g.stroke();
    }
    g.globalAlpha = 1;
  }
}

let last = performance.now(),
  shown = {};

function hud() {
  const v = {
    sp: Math.floor(S.spores),
    lv: S.level,
    tw: S.towers.filter((t) => t.hp > 0).length,
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
    const plant = KINDS[selectedPlantIndex];
    $("selectPlantBtn").disabled = S.state !== "play" || S.spores < plant.cost;
  }
}

// =============================
// GAME LOOP
// =============================

function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  if (S.state === "play") {
    update(dt);
  }
  draw();
  hud();

  requestAnimationFrame(loop);
}

// =====================================================
// INITIALIZE GAME
// =====================================================

build();
S.state = "menu";

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
