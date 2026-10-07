import {
  state,
  build,
  update,
  PLANTS,
  sendOut,
  maxTowers,
  placeTower,
  TILE,
} from "./game.js";
import { MAP_COLS, MAP_ROWS } from "./levels.js";

const canvas = document.getElementById("c"),
  g = canvas.getContext("2d");

// set canvas size
canvas.width = MAP_COLS * TILE;
canvas.height = MAP_ROWS * TILE;

let towerType = null;

const $ = (id) => document.getElementById(id);

function show(title, message, buttonLabel) {
  $("ot").textContent = title;
  $("om").textContent = message;
  $("ob").textContent = buttonLabel;
  $("ov").classList.remove("hide");
  $("ob").focus();
}
function startLevel() {
  towerType = null;
  build();
  state.phase = "play";
  $("ov").classList.add("hide");
}

function pause() {
  if (state.phase === "play") {
    state.phase = "pause";
    show("Paused", "Timers are frozen.", "Resume");
  } else if (state.phase === "pause") {
    state.phase = "play";
    $("ov").classList.add("hide");
  }
}

$("ob").onclick = () => {
  if (state.phase === "pause") pause();
  else {
    if (state.phase === "won") state.level++;
    startLevel();
  }
};
$("pz").onclick = pause;
$("rs").onclick = () => {
  if (state.phase !== "menu") startLevel();
};

// click to add a Tower
addEventListener("click", (e) => {
  if (state.phase !== "play") return;
  const rect = canvas.getBoundingClientRect();
  const c = Math.floor((e.clientX - rect.left) / TILE);
  const r = Math.floor((e.clientY - rect.top) / TILE);

  const existing = state.myTowers.find(
    (tower) => tower.c === c && tower.r === r,
  );
  if (existing) sendOut(existing);
  else placeTower(c, r, towerType);
});

// keyboard handler
addEventListener("keydown", (e) => {
  if (e.code === "KeyP" || e.code === "Escape") pause();
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= PLANTS.length) towerType = n - 1;
});

// card-building loop
const cards = $("cards");
PLANTS.forEach((k, i) => {
  const b = document.createElement("button");
  b.className = "card";
  b.innerHTML =
    '<div class="n"><span><span class="sw" style="background:' +
    k.col +
    '"></span>' +
    (i + 1) +
    ". " +
    k.n +
    "</span><span>" +
    k.cost +
    '</span></div><div class="d">' +
    k.desc +
    "</div>";
  b.onclick = () => (towerType = i); // send out plants when clicked
  cards.appendChild(b);
});

// render the health bar
function healthBar(x, y, width, valueHp, maxHp, colour) {
  g.fillStyle = "rgba(0,0,0,.55)";
  g.fillRect(x - width / 2, y, width, 4);
  g.fillStyle = colour;
  g.fillRect(x - width / 2, y, width * Math.max(0, valueHp / maxHp), 4);
}

// draw the whole screen every time loop() is called
function draw() {
  // draw the map area
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

// store timestamp of previous frame
let last = performance.now(),
  // store currently displayed HUD value
  shown = {};
function hud() {
  const v = {
    sp: Math.floor(state.spores),
    lv: state.level,
    tw: state.enemies.filter((enemy) => enemy.hp > 0).length,
    tc: state.myTowers.length + " / " + maxTowers(),
  };

  // loops over ids and updates with new values if needed
  for (const id in v)
    if (shown[id] !== v[id]) {
      $(id).textContent = v[id];
      shown[id] = v[id];
    }
  [...cards.children].forEach((b, i) => {
    b.disabled = state.phase !== "play" || state.spores < PLANTS[i].cost;
  });
}

let lastPhase = state.phase;

function loop(timer) {
  const deltaTime = Math.min(0.05, (timer - last) / 1000);
  last = timer;
  if (state.phase === "play") update(deltaTime);

  // check if game is ended
  if (state.phase !== lastPhase) {
    if (state.phase == "won")
      show("Keep breached", "Level " + state.level + " cleared.", "Next level");
    if (state.phase === "lost")
      show(
        "The swarm withered",
        "No plants left and not enough spores.",
        "Retry",
      );
    lastPhase = state.phase;
  }

  draw();
  hud();
  requestAnimationFrame(loop);
}

// load levels
build();
state.phase = "menu";
show(
  "Carniflora: Breach",
  "Send carnivorous plants down the path. They bite towers as they pass. Destroy the keep at the end before your swarm runs out.",
  "Start",
);
$("ob").onclick = () => {
  if (state.phase === "menu") {
    startLevel();
    return;
  }
  if (state.phase === "pause") {
    pause();
    return;
  }
  if (state.phase === "won") state.level++;
  startLevel();
};
requestAnimationFrame(loop);
