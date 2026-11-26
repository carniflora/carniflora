import { dom } from "./dom.js";
import { session } from "./session.js";
import { state } from "../state.js";
import { PLANTS } from "../plants.js";
import { TILE } from "../constants.js";
import { canPlaceTower } from "../towers.js";
import { effects } from "../effects.js";
import { drawPlant, drawEnemy, drawTree } from "../sprites.js";

const MINION_SIZE = 48;
const KEEP_SIZE = 96;
const TREE_SIZE = TILE * 1.2;
const SPRITE_SIZE = 48;

function healthBar(x, y, width, valueHp, maxHp, colour) {
  const { ctx: g } = dom();
  g.fillStyle = "rgba(0,0,0,.55)";
  g.fillRect(x - width / 2, y, width, 4);
  g.fillStyle = colour;
  g.fillRect(x - width / 2, y, width * Math.max(0, valueHp / maxHp), 4);
}

export function draw() {
  const { canvas, ctx: g } = dom();
  const now = performance.now();

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

  // dead enemies first so everything else is drawn above them
  for (const enemy of state.enemies) {
    if (enemy.hp > 0) continue;
    g.fillStyle = "#2b2f2a";
    g.beginPath();
    g.arc(enemy.x, enemy.y, enemy.radius * 0.8, 0, 7);
    g.fill();
  }

  // living enemies
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;

    const size = enemy.keep ? KEEP_SIZE : MINION_SIZE;

    if (!drawEnemy(g, enemy, now, size)) {
      // fallback: the old shapes
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
        g.arc(enemy.x, enemy.y, enemy.radius, 0, 7);
        g.fill();
        g.fillStyle = "#6c7279";
        g.fillRect(enemy.x - 5, enemy.y - enemy.radius - 6, 10, 8);
      }
    }
    healthBar(
      enemy.x,
      enemy.y + size / 2 + 2,
      enemy.keep ? 60 : 34,
      enemy.hp,
      enemy.max,
      "#e05a4a",
    );
  } // ← end of the living-enemies loop

  // towers (trees)
  state.myTowers.forEach((tower) => {
    const x = (tower.c + 0.5) * TILE;
    const y = (tower.r + 0.5) * TILE;
    const baseY = y + TILE * 0.45;

    // owner ring under the trunk
    g.strokeStyle = tower.owner === 0 ? "#fff" : "#7300f7";
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(x, baseY - 3, TILE * 0.36, TILE * 0.14, 0, 0, 7);
    g.stroke();

    if (!drawTree(g, tower, x, baseY, TREE_SIZE)) {
      // fallback: the old box
      g.fillStyle = PLANTS[tower.plant].col;
      g.fillRect(x - 16, y - 16, 32, 32);
      g.strokeRect(x - 16, y - 16, 32, 32);
    }

    // countdown timer under the tree
    g.font = "12px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillStyle = tower.timeLeft <= 5 ? "#ff6b6b" : "#fff";
    g.fillText(Math.ceil(tower.timeLeft) + "s", x, baseY + 14);
    g.textAlign = "left";
  });

  // placement preview: green if allowed, red if not
  if (
    session.hoverCell &&
    state.phase === "play" &&
    session.selectedPlantIndex !== null
  ) {
    const [c, r] = session.hoverCell;
    g.fillStyle = canPlaceTower(
      c,
      r,
      session.selectedPlantIndex,
      session.activePlayer,
    )
      ? "rgba(143,212,90,.35)"
      : "rgba(224,69,123,.35)";
    g.fillRect(c * TILE, r * TILE, TILE, TILE);
  }

  // seeds (US 4.1): a plant that reaches one destroys it and gains an effect.
  for (const s of state.seeds ?? []) {
    const pulse = 0.7 + 0.3 * Math.sin(now / 200);
    g.globalAlpha = Math.min(1, s.ttl / 3) * pulse;
    g.fillStyle = "#f5d76e";
    g.beginPath();
    g.arc(s.x, s.y, 8, 0, 7);
    g.fill();
    g.strokeStyle = "#b8860b";
    g.lineWidth = 2;
    g.stroke();
    g.globalAlpha = 1;
  }

  // plants that are sent out (drawn after towers so they sit on top)
  for (const p of state.plants) {
    const k = PLANTS[p.plant];
    if (!drawPlant(g, p, now, SPRITE_SIZE)) {
      g.fillStyle = k.col;
      g.beginPath();
      g.arc(p.x, p.y, k.radius, 0, 7);
      g.fill();
      g.strokeStyle = p.owner === 0 ? "#fff" : "#7300f7";
      g.stroke();
      g.fillStyle = "rgba(0,0,0,.45)";
      g.beginPath();
      g.arc(p.x, p.y, k.radius * 0.45, 0, 7);
      g.fill();
    }
    healthBar(p.x, p.y - SPRITE_SIZE / 2 - 2, 20, p.hp, k.hp, "#8fd45a");
  }

  // attack effects
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

  // ── Active buffs/debuffs HUD strip (EPIC 4 / US 6.5) ──────────────────
  const active = effects.displayList();
  if (active.length) {
    g.font = "13px system-ui, sans-serif";
    g.textBaseline = "top";
    active.forEach((d, i) => {
      const y = 12 + i * 18;
      // Plant-type scoped effects show which plant they target (US 4.2/4.3).
      const tag =
        d.plantType !== null && d.plantType !== undefined
          ? ` (${PLANTS[d.plantType].n})`
          : "";
      g.fillStyle = "rgba(0,0,0,.5)";
      g.fillRect(8, y - 2, 168, 16);
      g.fillStyle = d.kind === "buff" ? "#4ade80" : "#f87171";
      g.fillText(`${d.icon} ${d.name}${tag}  ${d.remaining}s`, 14, y);
    });
    g.textBaseline = "alphabetic";
  }
}
