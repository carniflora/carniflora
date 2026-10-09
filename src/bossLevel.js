/**
 * Carniflora: Breach - Final Boss Level
 * Gameplay matches the main game (path-following reverse tower defense),
 * but features an auto-scrolling world with a deadly left-hand killzone
 * slowly advancing across the battlefield.
 */

import { KINDS } from "./kinds.js";
export { KINDS } from "./kinds.js";

export const WORLD_WIDTH = 2400;
export const ARENA_X = 1440;
export const TAU = Math.PI * 2;

// Winding path through the scrolling landscape
export const BOSS_PATH = [
  [-20, 200],
  [280, 200],
  [440, 390],
  [740, 390],
  [900, 150],
  [1220, 150],
  [1380, 390],
  [1700, 390],
  [1860, 200],
  [2140, 200],
  [2280, 340],
];

export const BOSS_SEG = [];
let bossTotal = 0;
for (let i = 1; i < BOSS_PATH.length; i++) {
  const len = Math.hypot(
    BOSS_PATH[i][0] - BOSS_PATH[i - 1][0],
    BOSS_PATH[i][1] - BOSS_PATH[i - 1][1],
  );
  BOSS_SEG.push(len);
  bossTotal += len;
}
export const BOSS_TOTAL = bossTotal;

/** Returns [x, y] coordinates at distance s along the boss path */
export function atBossPath(s) {
  let d = Math.min(Math.max(s, 0), BOSS_TOTAL);
  if (d >= BOSS_TOTAL) return BOSS_PATH[BOSS_PATH.length - 1];
  for (let i = 0; i < BOSS_SEG.length; i++) {
    if (d <= BOSS_SEG[i]) {
      const t = d / BOSS_SEG[i];
      return [
        BOSS_PATH[i][0] + (BOSS_PATH[i + 1][0] - BOSS_PATH[i][0]) * t,
        BOSS_PATH[i][1] + (BOSS_PATH[i + 1][1] - BOSS_PATH[i][1]) * t,
      ];
    }
    d -= BOSS_SEG[i];
  }
  return BOSS_PATH[BOSS_PATH.length - 1];
}

/** Finds distance along path closest to given X coordinate */
export function getDistAtX(targetX) {
  if (targetX <= BOSS_PATH[0][0]) return 0;
  if (targetX >= BOSS_PATH[BOSS_PATH.length - 1][0]) return BOSS_TOTAL;
  let currentDist = 0;
  for (let i = 0; i < BOSS_PATH.length - 1; i++) {
    const p1 = BOSS_PATH[i];
    const p2 = BOSS_PATH[i + 1];
    const minX = Math.min(p1[0], p2[0]);
    const maxX = Math.max(p1[0], p2[0]);
    if (targetX >= minX && targetX <= maxX && p2[0] !== p1[0]) {
      const t = (targetX - p1[0]) / (p2[0] - p1[0]);
      return currentDist + t * BOSS_SEG[i];
    }
    currentDist += BOSS_SEG[i];
  }
  return currentDist;
}

export function createBossLevelState() {
  return {
    state: "play", // "play" | "won" | "lost"
    leftEdge: -20, // slowly advancing left-hand side
    advanceSpeed: 12, // 12 px/sec = ~120s fair clear window
    cameraX: 0,
    spores: 140,
    shake: 0,
    plants: [],

    // Towers placed along path loops, scaled for fair breaches
    towers: [
      {
        x: 360,
        y: 290,
        hp: 80,
        max: 80,
        rng: 110,
        dmg: 8,
        cd: 0,
        base: 1.1,
        slow: 0,
        r: 16,
      },
      {
        x: 600,
        y: 280,
        hp: 90,
        max: 90,
        rng: 110,
        dmg: 8,
        cd: 0,
        base: 1.1,
        slow: 0,
        r: 16,
      },
      {
        x: 820,
        y: 270,
        hp: 100,
        max: 100,
        rng: 115,
        dmg: 9,
        cd: 0,
        base: 1.0,
        slow: 0,
        r: 16,
      },
      {
        x: 1060,
        y: 270,
        hp: 105,
        max: 105,
        rng: 115,
        dmg: 9,
        cd: 0,
        base: 1.0,
        slow: 0,
        r: 16,
      },
      {
        x: 1300,
        y: 270,
        hp: 110,
        max: 110,
        rng: 120,
        dmg: 10,
        cd: 0,
        base: 1.0,
        slow: 0,
        r: 16,
      },
      {
        x: 1540,
        y: 280,
        hp: 120,
        max: 120,
        rng: 120,
        dmg: 10,
        cd: 0,
        base: 0.9,
        slow: 0,
        r: 16,
      },
      {
        x: 1780,
        y: 290,
        hp: 130,
        max: 130,
        rng: 125,
        dmg: 11,
        cd: 0,
        base: 0.9,
        slow: 0,
        r: 16,
      },
      {
        x: 2020,
        y: 320,
        hp: 140,
        max: 140,
        rng: 125,
        dmg: 11,
        cd: 0,
        base: 0.9,
        slow: 0,
        r: 16,
      },
    ],

    // Minions patrolling along the path
    minions: [
      createMinion(500, 390),
      createMinion(980, 150),
      createMinion(1450, 390),
      createMinion(1920, 200),
    ],

    // Final Boss tuned for a challenging but achievable climax
    boss: {
      name: "Big Boss",
      x: 2260,
      y: 340,
      hp: 750,
      maxHp: 750,
      r: 36,
      slow: 0,
      flash: 0,
      enraged: false,
      slamCooldown: 4.5,
      mortarCooldown: 5.0,
      summonCooldown: 8.5,
    },

    mortars: [],
    shockwaves: [],
    fx: [],
    damageNumbers: [],
  };
}

export function createMinion(x, y) {
  return {
    type: "minion",
    x,
    y,
    s: getDistAtX(x),
    hp: 60,
    maxHp: 60,
    r: 13,
    spd: 28,
    rng: 50,
    dmg: 9,
    cd: 1.1,
    base: 1.2,
    slow: 0,
  };
}

/**
 * Spawns a plant from the advancing safe line onto the path
 */
export function spawnBossPlant(state, kindIndex) {
  const k = KINDS[kindIndex];
  if (state.state !== "play" || !k || state.spores < k.cost) return false;

  state.spores -= k.cost;

  // Plant spawns just safely ahead of the advancing left-hand killzone
  const safeX = state.leftEdge + 65;
  const startS = getDistAtX(safeX);
  const [px, py] = atBossPath(startS);

  state.plants.push({
    k: kindIndex,
    s: startS,
    x: px,
    y: py,
    hp: k.hp,
    cd: 0,
    slow: 0,
  });
  return true;
}

/**
 * Main update loop for the boss level
 */
export function updateBossLevel(state, dt) {
  if (state.state !== "play") {
    updateFx(state, dt);
    return;
  }

  // Spore regeneration tuned to fuel continuous waves
  state.spores = Math.min(260, state.spores + 8 * dt);

  // The sidescrolling left-hand side slowly advances to the right
  if (state.leftEdge < ARENA_X) {
    state.leftEdge += state.advanceSpeed * dt;
    state.cameraX = Math.max(0, state.leftEdge);
  }

  // Screen shake decay
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 25);

  // ADVANCING KILLZONE: Any plant caught behind the advancing left-hand edge is consumed
  const killzoneX = state.leftEdge + 40;
  for (let pi = 0; pi < state.plants.length; pi++) {
    const p = state.plants[pi];
    if (p.x < killzoneX) {
      p.hp -= 65 * dt;
      if (Math.random() < 0.2) {
        addDamageNumber(state, p.x, p.y - 10, "KILLZONE", "#e0457b");
      }
    }
  }

  // --- 1. Update Plants marching along the path ---
  for (let pi = 0; pi < state.plants.length; pi++) {
    const p = state.plants[pi];
    const k = KINDS[p.k];
    const speed = k.spd * (p.slow > 0 ? 0.5 : 1);
    if (p.slow > 0) p.slow = Math.max(0, p.slow - dt);

    if (p.s < BOSS_TOTAL) p.s += speed * dt;
    [p.x, p.y] = atBossPath(p.s);
    p.cd -= dt;

    // Pitcher aura healing (heals allies within 80px)
    if (k.n === "Pitcher") {
      for (let qi = 0; qi < state.plants.length; qi++) {
        const q = state.plants[qi];
        if (q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 80) {
          q.hp = Math.min(KINDS[q.k].hp, q.hp + 5 * dt);
        }
      }
    }

    // Plant attacks nearest enemy
    if (p.cd <= 0) {
      const target = findNearestPlantTarget(state, p.x, p.y, k.rng);
      if (target) {
        p.cd = k.cd;
        target.hp -= k.dmg;
        if (target.flash !== undefined) target.flash = 0.12;

        state.fx.push({
          x1: p.x,
          y1: p.y,
          x2: target.x,
          y2: target.y,
          t: 0.12,
          c: k.col,
        });

        // Sundew slow
        if (k.n === "Sundew") target.slow = 2.0;

        // Rafflesia splash AoE
        if (k.n === "Rafflesia") {
          applyRafflesiaSplash(state, target, k.dmg);
          state.fx.push({
            x1: target.x,
            y1: target.y,
            x2: target.x,
            y2: target.y,
            t: 0.3,
            c: k.col,
            ring: 70,
          });
        }

        // Breaching towers awards bonus spores (+35 spores) to snowball the assault!
        if (target.hp <= 0 && !target.looted) {
          target.looted = true;
          const reward = target.type === "minion" ? 18 : 35;
          state.spores = Math.min(260, state.spores + reward);
          addDamageNumber(
            state,
            target.x,
            target.y - 14,
            `+${reward} SPORES`,
            "#8fd45a",
          );
        }
      }
    }
  }

  // --- 2. Update Towers firing at plants ---
  for (let ti = 0; ti < state.towers.length; ti++) {
    const t = state.towers[ti];
    if (t.hp <= 0) continue;
    t.slow = Math.max(0, t.slow - dt);
    t.cd -= dt * (t.slow > 0 ? 0.55 : 1);
    if (t.cd <= 0) {
      const p = nearestEntity(state.plants, t.x, t.y, t.rng);
      if (p) {
        t.cd = t.base;
        p.hp -= t.dmg;
        state.fx.push({
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

  // --- 3. Update Minions marching down path ---
  for (let mi = 0; mi < state.minions.length; mi++) {
    const m = state.minions[mi];
    if (m.hp <= 0) continue;
    m.slow = Math.max(0, m.slow - dt);
    m.cd -= dt * (m.slow > 0 ? 0.55 : 1);

    if (m.s > 0) {
      const speed = m.spd * (m.slow > 0 ? 0.5 : 1);
      m.s -= speed * dt;
      [m.x, m.y] = atBossPath(m.s);
    }

    // Minion breaches spawn line if player idles without units
    if (m.x <= state.leftEdge + 65) {
      m.hp = 0;
      state.spores = Math.max(0, state.spores - 25);
      state.shake = 6;
      addDamageNumber(state, m.x + 20, m.y, "-25 SPORES", "#e0457b");
      continue;
    }

    if (m.cd <= 0) {
      const p = nearestEntity(state.plants, m.x, m.y, m.rng);
      if (p) {
        m.cd = m.base;
        p.hp -= m.dmg;
        state.fx.push({
          x1: m.x,
          y1: m.y,
          x2: p.x,
          y2: p.y,
          t: 0.1,
          c: "#ffd9a0",
        });
      }
    }
  }

  // --- 4. Update Final Boss Attacks ---
  updateBossAI(state, dt);

  // --- 5. Update Projectiles & Shockwaves ---
  updateProjectiles(state, dt);

  // Clean dead entities
  state.plants = state.plants.filter((p) => p.hp > 0);
  state.minions = state.minions.filter((m) => m.hp > 0);

  // Update visual effects
  updateFx(state, dt);

  // Win / Loss Conditions
  if (state.boss.hp <= 0) {
    state.boss.hp = 0;
    state.state = "won";
    state.shake = 14;
  } else if (state.leftEdge >= ARENA_X && state.boss.hp > 0) {
    state.state = "lost";
    state.defeatReason = "overrun";
  } else if (
    !state.plants.length &&
    state.spores < 30 &&
    state.leftEdge > 400
  ) {
    state.state = "lost";
    state.defeatReason = "withered";
  }
}

function updateBossAI(state, dt) {
  const b = state.boss;
  if (b.hp <= 0) return;

  if (b.flash > 0) b.flash -= dt;
  if (b.slow > 0) b.slow = Math.max(0, b.slow - dt);

  // Enraged state at <= 50% HP
  if (b.hp <= b.maxHp * 0.5 && !b.enraged) {
    b.enraged = true;
    state.shake = 10;
    addDamageNumber(state, b.x, b.y - 30, "ENRAGED!", "#e0457b");
    state.minions.push(createMinion(b.x - 70, b.y));
  }

  const rate = (b.enraged ? 1.3 : 1.0) * (b.slow > 0 ? 0.55 : 1.0);

  // 1. Shockwave Blast (knocks plants back toward the advancing left edge!)
  b.slamCooldown -= dt * rate;
  if (b.slamCooldown <= 0) {
    b.slamCooldown = b.enraged ? 3.4 : 4.6;
    state.shake = 7;
    state.shockwaves.push({
      x: b.x - 30,
      y: b.y,
      vx: -240,
      r: 30,
      dmg: 18,
      lifetime: 3.5,
    });
  }

  // 2. Mortar Bombardment
  b.mortarCooldown -= dt * rate;
  if (b.mortarCooldown <= 0) {
    b.mortarCooldown = b.enraged ? 3.8 : 5.0;
    if (state.plants.length > 0) {
      const count = b.enraged ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const randPlant =
          state.plants[Math.floor(Math.random() * state.plants.length)];
        state.mortars.push({
          x: randPlant.x + (Math.random() - 0.5) * 30,
          y: randPlant.y + (Math.random() - 0.5) * 20,
          timer: 1.2,
          radius: 50,
          dmg: 24,
        });
      }
    }
  }

  // 3. Minion Reinforcements
  b.summonCooldown -= dt * rate;
  if (b.summonCooldown <= 0) {
    b.summonCooldown = b.enraged ? 8.0 : 10.5;
    state.minions.push(createMinion(b.x - 60, b.y));
  }
}

function updateProjectiles(state, dt) {
  // Mortar shells
  for (const m of state.mortars) {
    m.timer -= dt;
    if (m.timer <= 0) {
      state.shake = 5;
      state.fx.push({
        x1: m.x,
        y1: m.y,
        x2: m.x,
        y2: m.y,
        t: 0.3,
        c: "#e0457b",
        ring: m.radius,
      });
      for (const p of state.plants) {
        if (Math.hypot(p.x - m.x, p.y - m.y) <= m.radius) {
          p.hp -= m.dmg;
          addDamageNumber(state, p.x, p.y, m.dmg, "#e0457b");
        }
      }
    }
  }
  state.mortars = state.mortars.filter((m) => m.timer > 0);

  // Shockwaves: knock plants back toward the advancing killzone
  for (const sw of state.shockwaves) {
    sw.lifetime -= dt;
    sw.x += sw.vx * dt;
    for (const p of state.plants) {
      if (Math.hypot(p.x - sw.x, p.y - sw.y) <= sw.r + 10) {
        p.hp -= sw.dmg * dt * 2;
        p.slow = 1.2;
        // Knockback along path
        p.s = Math.max(0, p.s - 140 * dt);
      }
    }
  }
  state.shockwaves = state.shockwaves.filter((sw) => sw.lifetime > 0);
}

function updateFx(state, dt) {
  state.fx.forEach((f) => (f.t -= dt));
  state.fx = state.fx.filter((f) => f.t > 0);

  for (const dn of state.damageNumbers) {
    dn.t -= dt;
    dn.y -= 25 * dt;
  }
  state.damageNumbers = state.damageNumbers.filter((dn) => dn.t > 0);
}

function findNearestPlantTarget(state, x, y, rng) {
  let best = null;
  let minDistance = rng;

  for (let i = 0; i < state.minions.length; i++) {
    const target = state.minions[i];
    if (target.hp <= 0) continue;
    const centerDist = Math.hypot(target.x - x, target.y - y);
    const surfaceDist = centerDist - (target.r || 0);
    if (surfaceDist <= minDistance) {
      minDistance = surfaceDist;
      best = target;
    }
  }

  for (let i = 0; i < state.towers.length; i++) {
    const target = state.towers[i];
    if (target.hp <= 0) continue;
    const centerDist = Math.hypot(target.x - x, target.y - y);
    const surfaceDist = centerDist - (target.r || 0);
    if (surfaceDist <= minDistance) {
      minDistance = surfaceDist;
      best = target;
    }
  }

  if (state.boss && state.boss.hp > 0) {
    const target = state.boss;
    const centerDist = Math.hypot(target.x - x, target.y - y);
    const surfaceDist = centerDist - (target.r || 0);
    if (surfaceDist <= minDistance) {
      best = target;
    }
  }

  return best;
}

function applyRafflesiaSplash(state, target, dmg) {
  const splashDmg = dmg * 0.5;
  for (let i = 0; i < state.minions.length; i++) {
    const other = state.minions[i];
    if (
      other !== target &&
      other.hp > 0 &&
      Math.hypot(other.x - target.x, other.y - target.y) < 70
    ) {
      other.hp -= splashDmg;
    }
  }
  for (let i = 0; i < state.towers.length; i++) {
    const other = state.towers[i];
    if (
      other !== target &&
      other.hp > 0 &&
      Math.hypot(other.x - target.x, other.y - target.y) < 70
    ) {
      other.hp -= splashDmg;
    }
  }
  if (
    state.boss &&
    state.boss !== target &&
    state.boss.hp > 0 &&
    Math.hypot(state.boss.x - target.x, state.boss.y - target.y) < 70
  ) {
    state.boss.hp -= splashDmg;
  }
}

function nearestEntity(list, x, y, rng) {
  let best = null;
  let minDistance = rng;
  for (const target of list) {
    if (target.hp <= 0) continue;
    const centerDist = Math.hypot(target.x - x, target.y - y);
    const surfaceDist = centerDist - (target.r || 0);
    if (surfaceDist <= minDistance) {
      minDistance = surfaceDist;
      best = target;
    }
  }
  return best;
}

function addDamageNumber(state, x, y, text, color) {
  state.damageNumbers.push({
    x,
    y,
    text: String(text),
    color,
    t: 0.75,
  });
}

// =========================================================================
// RENDERER: Main Game Style with Advancing Left-Hand Killzone
// =========================================================================

export function drawBossLevel(ctx, state, width = 960) {
  ctx.save();

  if (state.shake > 0) {
    const ox = (Math.random() - 0.5) * state.shake;
    const oy = (Math.random() - 0.5) * state.shake;
    ctx.translate(ox, oy);
  }

  // 1. Clear background with classic dark green gradient (like the main game)
  ctx.clearRect(0, 0, width, 540);
  const bg = ctx.createLinearGradient(0, 0, 0, 540);
  bg.addColorStop(0, "#16301f");
  bg.addColorStop(1, "#0f2217");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, 540);

  // Apply camera translation for scrolling world
  ctx.save();
  ctx.translate(-state.cameraX, 0);

  // 2. Classic Path Rendering (like the main game)
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  BOSS_PATH.forEach((p, i) =>
    i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]),
  );
  ctx.strokeStyle = "#4a3a28";
  ctx.lineWidth = 40;
  ctx.stroke();
  ctx.strokeStyle = "#5d4a33";
  ctx.lineWidth = 30;
  ctx.stroke();

  // 3. Advancing Safe Spawner Portal (where plants sprout onto the active front line)
  const safeX = state.leftEdge + 65;
  const [spX, spY] = atBossPath(getDistAtX(safeX));
  ctx.fillStyle = "rgba(143, 212, 90, 0.25)";
  ctx.beginPath();
  ctx.arc(spX, spY, 20, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#8fd45a";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 4. Telegraphed Mortar Circles
  for (const m of state.mortars) {
    ctx.fillStyle = "rgba(224, 69, 123, 0.22)";
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#e0457b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius * (m.timer / 1.2), 0, TAU);
    ctx.stroke();
  }

  // 5. Boss Shockwaves
  for (const sw of state.shockwaves) {
    ctx.strokeStyle = "rgba(224, 69, 123, 0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.r, 0, TAU);
    ctx.stroke();
  }

  // 6. Defensive Towers (rendered exactly like the main game)
  for (const t of state.towers) {
    drawTower(ctx, t);
  }

  // 7. Patrolling Minions
  for (const m of state.minions) {
    drawMinion(ctx, m);
  }

  // 8. Final Boss: Big Boss (rendered at end of path)
  drawBossKeep(ctx, state.boss);

  // 9. Carnivorous Plants (rendered exactly like the main game)
  for (const p of state.plants) {
    drawPlant(ctx, p);
  }

  // 10. Attack Beams & Particle Rings
  for (const f of state.fx) {
    ctx.strokeStyle = f.c;
    ctx.lineWidth = 2;
    ctx.globalAlpha = Math.min(1, f.t * 6);
    if (f.ring) {
      ctx.beginPath();
      ctx.arc(f.x1, f.y1, f.ring * (1 - f.t / 0.3), 0, TAU);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(f.x1, f.y1);
      ctx.lineTo(f.x2, f.y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // 11. Floating Damage Numbers
  for (const dn of state.damageNumbers) {
    ctx.font = "bold 13px Palatino, sans-serif";
    ctx.fillStyle = dn.color;
    ctx.textAlign = "center";
    ctx.fillText(dn.text, dn.x, dn.y);
  }

  // 12. ADVANCING SIDESCROLLING KILLZONE (Left-Hand Side)
  drawAdvancingKillzone(ctx, state.leftEdge);

  ctx.restore(); // Restore camera translation

  // 13. Top Screen HUD
  drawTopHUD(ctx, state, width);

  ctx.restore();
}

function drawAdvancingKillzone(ctx, leftEdge) {
  const killzoneW = 45;
  const killzoneX = leftEdge + killzoneW;

  // Ominous crimson/purple mist wall encroaching from the left
  const grad = ctx.createLinearGradient(leftEdge - 80, 0, killzoneX, 0);
  grad.addColorStop(0, "rgba(224, 69, 123, 0.95)");
  grad.addColorStop(0.7, "rgba(180, 40, 90, 0.65)");
  grad.addColorStop(1, "rgba(224, 69, 123, 0.15)");

  ctx.fillStyle = grad;
  ctx.fillRect(leftEdge - 150, 0, killzoneW + 150, 540);

  // Deadly advance barrier line
  ctx.strokeStyle = "#e0457b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(killzoneX, 0);
  ctx.lineTo(killzoneX, 540);
  ctx.stroke();

  // Outer soft glow for the encroaching barrier
  ctx.strokeStyle = "rgba(255, 120, 160, 0.4)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(killzoneX, 0);
  ctx.lineTo(killzoneX, 540);
  ctx.stroke();
}

function drawTower(ctx, t) {
  if (t.hp <= 0) {
    ctx.fillStyle = "#2b2f2a";
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 0.8, 0, TAU);
    ctx.fill();
    return;
  }
  ctx.strokeStyle = "rgba(255,200,160,.10)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.rng, 0, TAU);
  ctx.stroke();

  ctx.fillStyle = t.slow > 0 ? "#7f8fa3" : "#9aa0a6";
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#6c7279";
  ctx.fillRect(t.x - 5, t.y - t.r - 6, 10, 8);

  drawMiniBar(ctx, t.x, t.y + t.r + 4, 34, t.hp, t.max, "#e05a4a");
}

function drawMinion(ctx, m) {
  ctx.fillStyle = m.slow > 0 ? "#5a6268" : "#4a5350";
  ctx.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);

  // Spear/blade
  ctx.strokeStyle = "#c0c6c8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(m.x - m.r, m.y);
  ctx.lineTo(m.x - m.r - 10, m.y - 4);
  ctx.stroke();

  drawMiniBar(ctx, m.x, m.y - m.r - 6, 24, m.hp, m.maxHp, "#e05a4a");
}

function drawBossKeep(ctx, b) {
  ctx.save();
  ctx.translate(b.x, b.y);

  if (b.flash > 0) {
    ctx.fillStyle = "#ffffff";
  } else if (b.enraged) {
    ctx.fillStyle = "#5a1f2b";
  } else {
    ctx.fillStyle = "#2e3438";
  }

  // Large Keep Base (like the main game's keep, but reinforced)
  ctx.fillRect(-b.r, -b.r, b.r * 2, b.r * 2);
  ctx.strokeStyle = b.enraged ? "#e0457b" : "#7f8fa3";
  ctx.lineWidth = 3;
  ctx.strokeRect(-b.r, -b.r, b.r * 2, b.r * 2);

  // Glowing core
  ctx.fillStyle = b.enraged ? "#ff4040" : "#e8b04a";
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, TAU);
  ctx.fill();

  // Flag at top of the keep
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(-4, -b.r - 18, 4, 18);
  ctx.fillRect(0, -b.r - 18, 16, 10);

  // Big Boss health bar
  drawMiniBar(
    ctx,
    0,
    b.r + 8,
    70,
    b.hp,
    b.maxHp,
    b.enraged ? "#c2255f" : "#e05a4a",
  );

  ctx.restore();
}

function drawPlant(ctx, p) {
  const k = KINDS[p.k];
  ctx.fillStyle = k.col;
  ctx.beginPath();
  ctx.arc(p.x, p.y, k.r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.beginPath();
  ctx.arc(p.x, p.y, k.r * 0.45, 0, TAU);
  ctx.fill();
  drawMiniBar(ctx, p.x, p.y - k.r - 8, 20, p.hp, k.hp, "#8fd45a");
}

function drawMiniBar(ctx, x, y, w, val, max, col) {
  ctx.fillStyle = "rgba(0,0,0,.6)";
  ctx.fillRect(x - w / 2, y, w, 4);
  ctx.fillStyle = col;
  ctx.fillRect(x - w / 2, y, Math.max(0, w * (val / max)), 4);
}

function drawTopHUD(ctx, state, width) {
  const b = state.boss;

  // Boss Health Bar at Top Center
  const barW = 420;
  const barX = (width - barW) / 2;
  const barY = 22;

  ctx.fillStyle = "rgba(10, 20, 14, 0.88)";
  ctx.fillRect(barX - 10, barY - 16, barW + 20, 38);
  ctx.strokeStyle = "#2a4436";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX - 10, barY - 16, barW + 20, 38);

  ctx.font = "bold 12px Palatino, sans-serif";
  ctx.fillStyle = b.enraged ? "#e0457b" : "#e8efe0";
  ctx.textAlign = "center";
  ctx.fillText(
    b.enraged ? "BIG BOSS (ENRAGED)" : "BIG BOSS",
    width / 2,
    barY - 2,
  );

  // Health bar fill
  ctx.fillStyle = "#1c2b20";
  ctx.fillRect(barX, barY + 3, barW, 12);
  ctx.fillStyle = b.enraged ? "#c2255f" : "#e05a4a";
  ctx.fillRect(barX, barY + 3, Math.max(0, barW * (b.hp / b.maxHp)), 12);

  // Overrun Deadline Display (Tuned for ~120s fair clear window)
  const remainingDist = Math.max(0, ARENA_X - state.leftEdge);
  const remainingSecs = Math.ceil(remainingDist / state.advanceSpeed);
  ctx.font = "bold 11px monospace";
  ctx.fillStyle = remainingSecs <= 25 ? "#ff4d6d" : "#ffd9a0";
  ctx.textAlign = "right";
  ctx.fillText(`⏱️ OVERRUN: ${remainingSecs}s`, barX + barW, barY + 30);
}
