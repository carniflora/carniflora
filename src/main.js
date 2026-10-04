import { at, TOTAL, PATH } from "./path.js";

const C = document.getElementById("c"),
  g = C.getContext("2d");
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
const S = {
  state: "menu",
  level: 1,
  spores: 0,
  plants: [],
  towers: [],
  fx: [],
  keep: null,
};
const $ = (id) => document.getElementById(id);
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
function send(i) {
  const k = KINDS[i];
  if (S.state !== "play" || S.spores < k.cost) return;
  S.spores -= k.cost;
  S.plants.push({ k: i, s: 0, x: -20, y: 110, hp: k.hp, cd: 0 });
}
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
function update(dt) {
  S.spores += 6 * dt;
  const alive = S.towers.filter((t) => t.hp > 0);
  for (const p of S.plants) {
    const k = KINDS[p.k];
    if (p.s < TOTAL) p.s += k.spd * dt;
    [p.x, p.y] = at(p.s);
    p.cd -= dt;
    if (k.n === "Pitcher")
      for (const q of S.plants)
        if (q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 80)
          q.hp = Math.min(KINDS[q.k].hp, q.hp + 4 * dt);
    if (p.cd <= 0) {
      const t = nearest(alive, p.x, p.y, k.rng);
      if (t) {
        p.cd = k.cd;
        t.hp -= k.dmg;
        S.fx.push({ x1: p.x, y1: p.y, x2: t.x, y2: t.y, t: 0.12, c: k.col });
        if (k.n === "Sundew") t.slow = 2;
        if (k.n === "Rafflesia") {
          for (const o of alive)
            if (o !== t && Math.hypot(o.x - t.x, o.y - t.y) < 60)
              o.hp -= k.dmg * 0.5;
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
  for (const t of alive) {
    t.slow = Math.max(0, t.slow - dt);
    t.cd -= dt * (t.slow > 0 ? 0.55 : 1);
    if (t.cd <= 0) {
      const p = nearest(S.plants, t.x, t.y, t.rng);
      if (p) {
        t.cd = t.base;
        p.hp -= t.dmg;
        S.fx.push({ x1: t.x, y1: t.y, x2: p.x, y2: p.y, t: 0.1, c: "#ffd9a0" });
      }
    }
  }
  S.plants = S.plants.filter((p) => p.hp > 0);
  S.fx.forEach((f) => (f.t -= dt));
  S.fx = S.fx.filter((f) => f.t > 0);
  if (S.keep.hp <= 0) end(true);
  else if (!S.plants.length && S.spores < Math.min(...KINDS.map((k) => k.cost)))
    end(false);
}
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
function show(t, m, b) {
  $("ot").textContent = t;
  $("om").textContent = m;
  $("ob").textContent = b;
  $("ov").classList.remove("hide");
  $("ob").focus();
}
function startLevel() {
  build();
  S.state = "play";
  $("ov").classList.add("hide");
}
function pause() {
  if (S.state === "play") {
    S.state = "pause";
    show("Paused", "Timers are frozen.", "Resume");
  } else if (S.state === "pause") {
    S.state = "play";
    $("ov").classList.add("hide");
  }
}
$("ob").onclick = () => {
  if (S.state === "pause") pause();
  else {
    if (S.state === "won") S.level++;
    startLevel();
  }
};
$("pz").onclick = pause;
$("rs").onclick = () => {
  if (S.state !== "menu") startLevel();
};
addEventListener("keydown", (e) => {
  if (e.code === "KeyP" || e.code === "Escape") pause();
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 4) send(n - 1);
});
const cards = $("cards");
KINDS.forEach((k, i) => {
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
    k.d +
    "</div>";
  b.onclick = () => send(i);
  cards.appendChild(b);
});
function bar(x, y, w, v, m, c) {
  g.fillStyle = "rgba(0,0,0,.55)";
  g.fillRect(x - w / 2, y, w, 4);
  g.fillStyle = c;
  g.fillRect(x - w / 2, y, w * Math.max(0, v / m), 4);
}
function draw() {
  g.clearRect(0, 0, 960, 540);
  const bg = g.createLinearGradient(0, 0, 0, 540);
  bg.addColorStop(0, "#16301f");
  bg.addColorStop(1, "#0f2217");
  g.fillStyle = bg;
  g.fillRect(0, 0, 960, 540);
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  PATH.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.strokeStyle = "#4a3a28";
  g.lineWidth = 40;
  g.stroke();
  g.strokeStyle = "#5d4a33";
  g.lineWidth = 30;
  g.stroke();
  for (const t of S.towers) {
    if (t.hp <= 0) {
      g.fillStyle = "#2b2f2a";
      g.beginPath();
      g.arc(t.x, t.y, t.r * 0.8, 0, 7);
      g.fill();
      continue;
    }
    g.strokeStyle = "rgba(255,200,160,.10)";
    g.lineWidth = 1;
    g.beginPath();
    g.arc(t.x, t.y, t.rng, 0, 7);
    g.stroke();
    g.fillStyle = t.slow > 0 ? "#7f8fa3" : "#9aa0a6";
    if (t.keep) {
      g.fillRect(t.x - t.r, t.y - t.r, t.r * 2, t.r * 2);
      g.fillStyle = "#c0392b";
      g.fillRect(t.x - 4, t.y - t.r - 14, 4, 14);
      g.fillRect(t.x, t.y - t.r - 14, 14, 8);
    } else {
      g.beginPath();
      g.arc(t.x, t.y, t.r, 0, 7);
      g.fill();
      g.fillStyle = "#6c7279";
      g.fillRect(t.x - 5, t.y - t.r - 6, 10, 8);
    }
    bar(t.x, t.y + t.r + 4, t.keep ? 60 : 34, t.hp, t.max, "#e05a4a");
  }
  for (const p of S.plants) {
    const k = KINDS[p.k];
    g.fillStyle = k.col;
    g.beginPath();
    g.arc(p.x, p.y, k.r, 0, 7);
    g.fill();
    g.fillStyle = "rgba(0,0,0,.45)";
    g.beginPath();
    g.arc(p.x, p.y, k.r * 0.45, 0, 7);
    g.fill();
    bar(p.x, p.y - k.r - 8, 20, p.hp, k.hp, "#8fd45a");
  }
  for (const f of S.fx) {
    g.strokeStyle = f.c;
    g.lineWidth = 2;
    g.globalAlpha = Math.min(1, f.t * 6);
    if (f.ring) {
      g.beginPath();
      g.arc(f.x1, f.y1, f.ring * (1 - f.t / 0.3), 0, 7);
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
let last = performance.now(),
  shown = {};
function hud() {
  const v = {
    sp: Math.floor(S.spores),
    lv: S.level,
    tw: S.towers.filter((t) => t.hp > 0).length,
  };
  for (const id in v)
    if (shown[id] !== v[id]) {
      $(id).textContent = v[id];
      shown[id] = v[id];
    }
  [...cards.children].forEach((b, i) => {
    b.disabled = S.state !== "play" || S.spores < KINDS[i].cost;
  });
}
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  if (S.state === "play") update(dt);
  draw();
  hud();
  requestAnimationFrame(loop);
}
build();
S.state = "menu";
show(
  "Carniflora: Breach",
  "Send carnivorous plants down the path. They bite towers as they pass. Destroy the keep at the end before your swarm runs out.",
  "Start",
);
$("ob").onclick = () => {
  if (S.state === "menu") {
    startLevel();
    return;
  }
  if (S.state === "pause") {
    pause();
    return;
  }
  if (S.state === "won") S.level++;
  startLevel();
};
requestAnimationFrame(loop);
