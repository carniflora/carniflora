import {
  getBossOverrunSeconds,
  WORLD_WIDTH,
  BOSS_PATH,
  KILLZONE_OFFSET,
  KINDS,
  LANE_Y,
  LANE_NAMES,
  TAU,
  atBossPath,
  getDistAtX,
} from "./bossLanes.js";

const INK = "#e5efdc";
const MUTED = "#8da58e";
const PINK = "#f06891";

function text(ctx, value, x, y, color = INK, size = 11, align = "left") {
  ctx.font = `${size >= 13 ? "bold " : ""}${size}px monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}

function circle(ctx, x, y, r, fill, stroke) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function bar(ctx, x, y, width, hp, max, color, height = 4) {
  ctx.fillStyle = "#0b1710";
  ctx.fillRect(x - width / 2, y, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(
    x - width / 2,
    y,
    width * Math.max(0, Math.min(1, hp / max)),
    height,
  );
}

function pathPoints(state, lane) {
  const points = BOSS_PATH.map(([x]) => atBossPath(getDistAtX(x), lane));
  if (state.phase === "core")
    points.splice(
      points.length - 1,
      1,
      [1560, LANE_Y[lane]],
      [1800, 290],
      [1840, 290],
    );
  return points;
}

function drawPath(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = "#283c29";
  ctx.lineWidth = 35;
  ctx.stroke();
  ctx.strokeStyle = "#49503a";
  ctx.lineWidth = 25;
  ctx.stroke();
  ctx.setLineDash([3, 18]);
  ctx.strokeStyle = "rgba(225,208,155,0.28)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawGround(ctx, state, width) {
  const bg = ctx.createLinearGradient(0, 0, 0, 540);
  bg.addColorStop(0, "#11251b");
  bg.addColorStop(1, "#0a1a13");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, 540);
  ctx.fillStyle = "rgba(143,212,90,0.06)";
  ctx.fillRect(0, LANE_Y[state.selectedLane] - 55, width, 110);
  ctx.strokeStyle = "rgba(143,212,90,0.16)";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 9]);
  for (const y of [235, 345]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawHarvester(ctx, state) {
  const b = state.boss;
  const alive = b.hp > 0;
  ctx.fillStyle = alive ? "#26332f" : "#273125";
  ctx.fillRect(1740, 120, 220, 335);
  ctx.strokeStyle = "#607264";
  ctx.lineWidth = 3;
  ctx.strokeRect(1740, 120, 220, 335);
  ctx.fillStyle = "#17241d";
  ctx.fillRect(1751, 133, 198, 309);
  ctx.fillRect(1725, 445, 245, 20);
  for (let x = 1740; x < 1960; x += 26) {
    ctx.fillStyle = "#3a4b3a";
    ctx.fillRect(x, 448, 16, 14);
  }
  for (const tank of state.tanks) {
    ctx.strokeStyle = tank.hp > 0 && alive ? "#b39b4e" : "#3c4939";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(tank.x + 70, tank.y);
    ctx.lineTo(1920, tank.y);
    ctx.lineTo(1920, b.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle =
      tank.flash > 0 ? "#f7eec9" : tank.hp > 0 && alive ? "#5d4d27" : "#2e382b";
    ctx.fillRect(tank.x - 37, tank.y - 26, 145, 52);
    ctx.strokeStyle = tank.hp > 0 && alive ? "#c6a752" : "#53604a";
    ctx.lineWidth = 2;
    ctx.strokeRect(tank.x - 37, tank.y - 26, 145, 52);
    text(
      ctx,
      `${tank.lane === 0 ? "UPPER" : "LOWER"} / ARMOUR ${tank.armour}`,
      tank.x + 34,
      tank.y - 8,
      "#e8c97d",
      10,
      "center",
    );
    text(
      ctx,
      tank.hp > 0 && alive ? `${Math.ceil(tank.hp)} / ${tank.max}` : "BREACHED",
      tank.x + 34,
      tank.y + 12,
      INK,
      11,
      "center",
    );
    bar(ctx, tank.x + 34, tank.y + 32, 135, tank.hp, tank.max, "#e8b04a");
  }
  if (alive) {
    ctx.shadowBlur = 18;
    ctx.shadowColor = b.shielded ? "#77b8b0" : PINK;
  }
  circle(
    ctx,
    b.x,
    b.y,
    37,
    b.flash > 0 ? "#ffffff" : b.shielded ? "#163e3d" : "#7b2540",
    b.shielded ? "#77b8b0" : PINK,
  );
  ctx.shadowBlur = 0;
  if (b.shielded && alive) {
    ctx.setLineDash([6, 5]);
    circle(
      ctx,
      b.x,
      b.y,
      49 + Math.sin(state.elapsed * 3) * 2,
      null,
      "#82c0b1",
    );
    ctx.setLineDash([]);
    text(ctx, "SHIELDED", b.x, b.y + 4, "#b9e0d5", 11, "center");
  } else circle(ctx, b.x, b.y, 17, alive ? "#ffbb83" : "#3d4e36");
  text(
    ctx,
    alive ? "FURNACE CORE" : "RECLAIMED",
    b.x,
    354,
    alive ? PINK : "#a9e67b",
    10,
    "center",
  );
}

function drawDefense(ctx, t) {
  if (t.hp <= 0) {
    ctx.fillStyle = "#34402e";
    ctx.fillRect(t.x - 12, t.y + 6, 24, 10);
    return;
  }
  if (t.type === "cannon") {
    ctx.fillStyle = t.slow > 0 ? "#608890" : "#9a9e8d";
    ctx.fillRect(t.x - 18, t.y - 19, 36, 38);
    ctx.fillStyle = "#657465";
    ctx.fillRect(t.x - 37, t.y - 6, 34, 12);
    text(ctx, "CANNON", t.x - 10, t.y - 31, "#d5d6bd", 10, "center");
  } else {
    circle(ctx, t.x, t.y, t.r, t.slow > 0 ? "#608890" : "#7e8b7b", "#b9c5af");
    ctx.fillStyle = "#465849";
    ctx.fillRect(t.x - 23, t.y - 4, 22, 8);
  }
  bar(
    ctx,
    t.x,
    t.y + t.r + 7,
    t.type === "cannon" ? 44 : 30,
    t.hp,
    t.max,
    PINK,
  );
}

function drawPlant(ctx, plant, elapsed) {
  const kind = KINDS[plant.k];
  const y = plant.y + Math.sin(elapsed * 7 + plant.s * 0.04) * 1.5;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(plant.x, plant.y + 11, kind.r + 4, 4, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#536f39";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(plant.x, y + 5);
  ctx.lineTo(plant.x - 5, y + 12);
  ctx.stroke();
  if (plant.k === 2) {
    ctx.fillStyle = kind.col;
    ctx.fillRect(plant.x - 10, y - 12, 20, 23);
    circle(ctx, plant.x, y - 11, 10, "#f2cf73");
    circle(ctx, plant.x, y - 11, 5, "#564623");
    circle(ctx, plant.x, plant.y, 77, null, "rgba(232,176,74,0.08)");
  } else if (plant.k === 3) {
    for (let i = 0; i < 5; i++) {
      const angle = (i * TAU) / 5 + elapsed * 0.15;
      circle(
        ctx,
        plant.x + Math.cos(angle) * 7,
        y + Math.sin(angle) * 7,
        6,
        kind.col,
      );
    }
    circle(ctx, plant.x, y, 5, "#422e50");
  } else {
    circle(ctx, plant.x, y, kind.r, kind.col);
    if (plant.k === 0) {
      ctx.strokeStyle = "#29432a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(plant.x - 5, y - 2);
      ctx.lineTo(plant.x + 5, y + 2);
      ctx.stroke();
    } else {
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6;
        circle(
          ctx,
          plant.x + Math.cos(a) * 10,
          y + Math.sin(a) * 10,
          2,
          "#f6a7b8",
        );
      }
    }
  }
  bar(ctx, plant.x, y - kind.r - 11, 22, plant.hp, kind.hp, "#a9e67b");
}

function drawWorld(ctx, state) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let x = 60; x < WORLD_WIDTH; x += 75) {
    const y = 130 + ((x * 19) % 310);
    ctx.strokeStyle = "rgba(143,212,90,0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 4);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 5, y + 4);
    ctx.stroke();
  }
  LANE_Y.forEach((_, lane) => drawPath(ctx, pathPoints(state, lane)));
  if (state.spray) {
    const s = state.spray;
    const y = LANE_Y[s.lane] - 51;
    const firing = s.stage === "firing";
    ctx.fillStyle = firing ? "rgba(240,68,113,0.38)" : "rgba(232,176,74,0.12)";
    ctx.fillRect(s.x1, y, s.x2 - s.x1, 102);
    ctx.strokeStyle = firing ? PINK : "#e8b04a";
    ctx.lineWidth = 2;
    ctx.setLineDash(firing ? [] : [8, 6]);
    ctx.strokeRect(s.x1, y, s.x2 - s.x1, 102);
    ctx.setLineDash([]);
    text(
      ctx,
      firing ? "HERBICIDE ACTIVE" : `SPRAY IN ${s.timer.toFixed(1)}s`,
      Math.max(state.cameraX + 200, s.x1 + 80),
      y + 21,
      firing ? "#ffc6d3" : "#f2ce7c",
      12,
    );
  }
  drawHarvester(ctx, state);
  state.towers.forEach((t) => drawDefense(ctx, t));
  for (const m of state.minions) {
    ctx.fillStyle = m.slow > 0 ? "#67959b" : "#96a5a0";
    ctx.fillRect(m.x - 10, m.y - 10, 20, 20);
    ctx.strokeStyle = "#e5dbb7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m.x - 9, m.y);
    ctx.lineTo(m.x - 20, m.y - 5);
    ctx.stroke();
    bar(ctx, m.x, m.y - 18, 22, m.hp, m.max, PINK);
  }
  state.plants.forEach((p) => drawPlant(ctx, p, state.elapsed));
  for (let lane = 0; lane < 3; lane++) {
    const [x, y] = atBossPath(getDistAtX(state.leftEdge + 85), lane);
    const selected = lane === state.selectedLane;
    ctx.lineWidth = selected ? 2 : 1;
    circle(
      ctx,
      x,
      y,
      18 + (selected ? Math.sin(state.elapsed * 4) * 2 : 0),
      selected ? "rgba(143,212,90,0.18)" : "rgba(143,212,90,0.04)",
      selected ? "#a9e67b" : "#49684a",
    );
    text(
      ctx,
      selected ? "DEPLOY" : `0${lane + 1}`,
      x,
      y + 35,
      selected ? "#a9e67b" : MUTED,
      10,
      "center",
    );
  }
  for (const fx of state.fx) {
    ctx.globalAlpha = Math.min(1, fx.t * 6);
    ctx.strokeStyle = fx.c;
    ctx.lineWidth = 2;
    if (fx.ring)
      circle(
        ctx,
        fx.x1,
        fx.y1,
        fx.ring * Math.max(0, 1 - fx.t / (fx.duration || 0.3)),
        null,
        fx.c,
      );
    else {
      ctx.beginPath();
      ctx.moveTo(fx.x1, fx.y1);
      ctx.lineTo(fx.x2, fx.y2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  for (const n of state.damageNumbers) {
    ctx.globalAlpha = Math.min(1, n.t * 3);
    text(ctx, n.text, n.x, n.y, n.color, 11, "center");
  }
  ctx.globalAlpha = 1;
  const edge = state.leftEdge + KILLZONE_OFFSET;
  const mist = ctx.createLinearGradient(edge - 100, 0, edge + 12, 0);
  mist.addColorStop(0, "rgba(120,25,70,0.85)");
  mist.addColorStop(1, "rgba(240,68,113,0.04)");
  ctx.fillStyle = mist;
  ctx.fillRect(
    state.cameraX - 20,
    112,
    Math.max(0, edge + 12 - state.cameraX + 20),
    354,
  );
  // Animated wisps keep the moving front readable; the bright line marks
  // the exact collision boundary used by the simulation.
  for (let y = 126; y < 456; y += 28) {
    const drift = Math.sin(state.elapsed * 2 + y * 0.05);
    circle(
      ctx,
      edge - 12 + drift * 7,
      y,
      21 + drift * 3,
      "rgba(240,68,113,0.13)",
    );
  }
  ctx.strokeStyle = "rgba(240,68,113,0.25)";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(edge, 112);
  ctx.lineTo(edge, 465);
  ctx.stroke();
  ctx.strokeStyle = PINK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(edge, 112);
  ctx.lineTo(edge, 465);
  ctx.stroke();
  text(ctx, "MIST >", edge + 10, 124, PINK, 10);
}

function drawHUD(ctx, state, width) {
  const b = state.boss;
  ctx.fillStyle = "rgba(7,18,12,0.96)";
  ctx.fillRect(0, 0, width, 108);
  text(ctx, "FINAL ASSAULT", 20, 25, "#a9e67b", 13);
  text(
    ctx,
    state.phase === "approach"
      ? "01 / THROUGH THE GARDEN"
      : state.phase === "shields"
        ? "02 / BREAK THE TANKS"
        : "03 / OVERRUN THE CORE",
    20,
    46,
    MUTED,
    10,
  );
  text(
    ctx,
    `TANKS ${state.tanks.filter((t) => t.hp > 0).length}/2  |  CANNON ${state.towers.some((t) => t.type === "cannon" && t.hp > 0) ? "ONLINE" : "SILENCED"}`,
    20,
    67,
    "#d7c79b",
    10,
  );
  text(ctx, "APEX HARVESTER", width / 2, 25, INK, 14, "center");
  bar(
    ctx,
    width / 2,
    36,
    340,
    b.hp,
    b.maxHp,
    b.shielded ? "#588d83" : PINK,
    12,
  );
  text(
    ctx,
    b.shielded
      ? "CORE SHIELDED — BREAK BOTH TANKS"
      : `CORE EXPOSED / ${Math.ceil(b.hp)} HP / ARMOUR ${b.armour}`,
    width / 2,
    65,
    b.shielded ? "#9ac8b8" : "#ff9bb6",
    10,
    "center",
  );
  const seconds = Math.ceil(getBossOverrunSeconds(state));
  text(
    ctx,
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
    width - 20,
    40,
    seconds <= 25 ? PINK : "#e8c97d",
    24,
    "right",
  );
  text(ctx, "UNTIL OVERRUN", width - 20, 62, MUTED, 10, "right");
  if (state.spray)
    text(
      ctx,
      `LANE ${state.spray.lane + 1} / ${state.spray.stage === "warning" ? `HERBICIDE IN ${state.spray.timer.toFixed(1)}s` : "HERBICIDE FIRING"}`,
      width / 2,
      92,
      state.spray.stage === "warning" ? "#e8c97d" : PINK,
      12,
      "center",
    );
  else
    text(
      ctx,
      state.noticeTime > 0
        ? state.notice
        : state.phase === "core"
          ? "All lanes converge on the furnace. Keep deploying."
          : "Rafflesia pierces armour. Sundew slows boss fire.",
      width / 2,
      92,
      state.noticeTime > 0 ? "#c2d7af" : MUTED,
      11,
      "center",
    );
  for (let lane = 0; lane < 3; lane++) {
    const selected = state.selectedLane === lane;
    ctx.fillStyle = "rgba(9,24,16,0.88)";
    ctx.fillRect(8, LANE_Y[lane] - 53, 168, 22);
    text(
      ctx,
      `${selected ? ">" : " "} 0${lane + 1} / ${state.phase === "core" ? "Furnace core" : LANE_NAMES[lane]}`,
      15,
      LANE_Y[lane] - 38,
      selected ? "#a9e67b" : MUTED,
      10,
    );
  }
}

function drawMap(ctx, state, width) {
  ctx.fillStyle = "#08170f";
  ctx.fillRect(0, 474, width, 66);
  text(ctx, "ASSAULT PROGRESS", 20, 489, MUTED, 10);
  text(
    ctx,
    `${state.stats.deployed} DEPLOYED / ${state.stats.lost} LOST`,
    width - 20,
    489,
    MUTED,
    10,
    "right",
  );
  const scale = (width - 48) / WORLD_WIDTH;
  const x = (worldX) => 24 + Math.max(0, worldX) * scale;
  ctx.fillStyle = "rgba(240,68,113,0.25)";
  ctx.fillRect(
    24,
    496,
    Math.max(0, state.leftEdge + KILLZONE_OFFSET) * scale,
    29,
  );
  for (let lane = 0; lane < 3; lane++) {
    const y = 502 + lane * 9;
    ctx.strokeStyle = lane === state.selectedLane ? "#6a9158" : "#354d36";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(x(1840), y);
    ctx.stroke();
    for (const p of state.plants.filter((p) => p.lane === lane))
      circle(ctx, x(p.x), y, 2.5, KINDS[p.k].col);
    const tank = state.tanks.find((t) => t.lane === lane);
    ctx.fillStyle = tank
      ? tank.hp > 0
        ? "#e8b04a"
        : "#6d8955"
      : state.boss.shielded
        ? "#83b8aa"
        : PINK;
    ctx.fillRect(x(1870) - 3, y - 3, 6, 6);
  }
  ctx.strokeStyle = "rgba(221,236,211,0.45)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x(state.cameraX), 496, 960 * scale, 29);
}

export function drawBossLevel(ctx, state, width = 960) {
  ctx.save();
  ctx.clearRect(0, 0, width, 540);
  drawGround(ctx, state, width);
  ctx.save();
  ctx.translate(-state.cameraX, 0);
  if (state.shake > 0)
    ctx.translate(
      (Math.random() - 0.5) * state.shake,
      (Math.random() - 0.5) * state.shake,
    );
  drawWorld(ctx, state);
  ctx.restore();
  drawHUD(ctx, state, width);
  drawMap(ctx, state, width);
  ctx.restore();
}
