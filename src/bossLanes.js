/** Three-lane reverse tower defense simulation. Coordinates are in world pixels. */
import { KINDS } from "./kinds.js";
export { KINDS } from "./kinds.js";

export const WORLD_WIDTH = 2000;
export const ARENA_X = WORLD_WIDTH - 960;
export const SCROLL_SPEED = 30;
// The mist overruns the arena when its damaging edge reaches the harvester chassis.
export const OVERRUN_X = 1700;
export const TAU = Math.PI * 2;
export const LANE_Y = [180, 290, 400];
export const LANE_NAMES = ["Upper tank", "Centre cannon", "Lower tank"];
export const BOSS_PATH = [
  [-20, 290],
  [300, 290],
  [550, 278],
  [850, 302],
  [1200, 290],
  [1520, 290],
  [1840, 290],
];
export const BOSS_SEG = BOSS_PATH.slice(1).map((p, i) =>
  Math.hypot(p[0] - BOSS_PATH[i][0], p[1] - BOSS_PATH[i][1]),
);
export const BOSS_TOTAL = BOSS_SEG.reduce((sum, length) => sum + length, 0);
export const KILLZONE_OFFSET = 40;
export const SPORE_CAP = 260;
const SPAWN_OFFSET = 85;
const APPROACH_X = 1300;
const MINION_SPAWN_X = 1680;
const MINION_SPAWN_CLEARANCE = 120;

export function atBossPath(s, lane = 1) {
  let d = Math.max(0, Math.min(BOSS_TOTAL, s));
  for (let i = 0; i < BOSS_SEG.length; i++) {
    if (d <= BOSS_SEG[i] || i === BOSS_SEG.length - 1) {
      const t = Math.min(1, d / BOSS_SEG[i]);
      return [
        BOSS_PATH[i][0] + (BOSS_PATH[i + 1][0] - BOSS_PATH[i][0]) * t,
        BOSS_PATH[i][1] +
          (BOSS_PATH[i + 1][1] - BOSS_PATH[i][1]) * t +
          LANE_Y[lane] -
          290,
      ];
    }
    d -= BOSS_SEG[i];
  }
}

export function getDistAtX(x) {
  if (x <= BOSS_PATH[0][0]) return 0;
  let s = 0;
  for (let i = 0; i < BOSS_SEG.length; i++) {
    if (x <= BOSS_PATH[i + 1][0]) {
      return (
        s +
        ((x - BOSS_PATH[i][0]) / (BOSS_PATH[i + 1][0] - BOSS_PATH[i][0])) *
          BOSS_SEG[i]
      );
    }
    s += BOSS_SEG[i];
  }
  return BOSS_TOTAL;
}

function tower(x, lane, hp, cannon = false) {
  const [, y] = atBossPath(getDistAtX(x), lane);
  return {
    type: cannon ? "cannon" : "tower",
    lane,
    x,
    y,
    hp,
    max: hp,
    r: cannon ? 23 : 16,
    rng: cannon ? 420 : 115,
    dmg: cannon ? 11 : 9,
    cd: 0,
    base: cannon ? 1.4 : 1.2,
    slow: 0,
  };
}

export function createMinion(x, lane = 1) {
  const s = getDistAtX(x);
  const [px, y] = atBossPath(s, lane);
  return {
    type: "minion",
    lane,
    x: px,
    y,
    s,
    hp: 50,
    max: 50,
    r: 12,
    spd: 22,
    rng: 45,
    dmg: 7,
    cd: 1,
    base: 1.3,
    slow: 0,
  };
}

export function createBossLevelState() {
  return {
    state: "play",
    phase: "approach",
    selectedLane: 0,
    elapsed: 0,
    leftEdge: -20,
    advanceSpeed: 9,
    cameraX: 0,
    spores: 140,
    shake: 0,
    plants: [],
    towers: LANE_Y.flatMap((_, lane) => [
      tower(500, lane, 80),
      tower(1000, lane, 100),
    ]).concat(tower(1770, 1, 200, true)),
    minions: LANE_Y.map((_, lane) => createMinion(760, lane)),
    tanks: [0, 2].map((lane) => ({
      type: "tank",
      lane,
      x: 1840,
      y: LANE_Y[lane],
      hp: 450,
      max: 450,
      r: 34,
      slow: 0,
      flash: 0,
      rng: 180,
      dmg: 10,
      cd: 0,
      base: 1.4,
    })),
    boss: {
      name: "Apex Harvester",
      x: 1870,
      y: 290,
      hp: 750,
      maxHp: 750,
      r: 40,
      shielded: true,
      active: false,
      enraged: false,
      slow: 0,
      flash: 0,
      sprayCooldown: 5,
      summonCooldown: 10,
      attackCooldown: 1,
    },
    spray: null,
    fx: [],
    damageNumbers: [],
    notice: "Break both chemical tanks to expose the furnace.",
    noticeTime: 5,
    stats: { deployed: 0, lost: 0, mistLost: 0 },
  };
}

export function selectBossLane(state, lane) {
  if (!Number.isInteger(lane) || lane < 0 || lane >= LANE_Y.length)
    return false;
  if (state.state !== "play" && state.state !== "pause") return false;
  state.selectedLane = lane;
  return true;
}

export function getBossOverrunSeconds(state) {
  const distance = Math.max(0, OVERRUN_X - state.leftEdge);
  const scrollDistance = Math.max(0, ARENA_X - state.cameraX);
  const scrollTime = scrollDistance / SCROLL_SPEED;
  const closingDistance = scrollDistance + state.advanceSpeed * scrollTime;
  return distance <= closingDistance
    ? distance / (SCROLL_SPEED + state.advanceSpeed)
    : scrollTime + (distance - closingDistance) / state.advanceSpeed;
}

export function spawnBossPlant(state, kindIndex, lane = state.selectedLane) {
  const kind = KINDS[kindIndex];
  if (
    state.state !== "play" ||
    !kind ||
    state.spores < kind.cost ||
    !Number.isInteger(lane) ||
    lane < 0 ||
    lane >= LANE_Y.length
  )
    return false;
  state.spores -= kind.cost;
  const s = getDistAtX(state.leftEdge + SPAWN_OFFSET);
  const [x, y] = atBossPath(s, lane);
  state.plants.push({
    k: kindIndex,
    lane,
    s,
    x,
    y,
    hp: kind.hp,
    cd: 0,
    slow: 0,
    formation: (state.stats.deployed % 3) * 8,
  });
  state.stats.deployed++;
  return true;
}

function syncPlant(state, plant) {
  [plant.x, plant.y] = atBossPath(plant.s, plant.lane);
  // Once exposed, the flank paths physically join the central furnace approach.
  if (state.phase === "core") {
    const merge = Math.max(0, Math.min(1, (plant.x - 1560) / 240));
    plant.y += (state.boss.y - plant.y) * merge;
  }
}

function enemies(state) {
  return [
    ...state.minions,
    ...state.towers,
    ...state.tanks,
    ...(state.boss.shielded ? [] : [state.boss]),
  ];
}

function nearest(list, x, y, range) {
  let best = null;
  let distance = range;
  for (const entity of list) {
    if (entity.hp <= 0) continue;
    const d = Math.hypot(entity.x - x, entity.y - y) - (entity.r || 0);
    if (d <= distance) {
      distance = d;
      best = entity;
    }
  }
  return best;
}

function number(state, x, y, text, color = "#a9e67b") {
  state.damageNumbers.push({ x, y, text: String(text), color, t: 0.9 });
}

function beam(state, source, target, color) {
  state.fx.push({
    x1: source.x,
    y1: source.y,
    x2: target.x,
    y2: target.y,
    c: color,
    t: 0.12,
  });
}

function damageEnemy(state, target, amount) {
  if (target.hp <= 0 || (target === state.boss && state.boss.shielded)) return;
  target.hp = Math.max(0, target.hp - amount);
  if (target.flash !== undefined) target.flash = 0.12;
  if (target.hp > 0 || target === state.boss || target.looted) return;
  target.looted = true;
  const reward =
    { minion: 18, tank: 55, cannon: 65, tower: 35 }[target.type] || 35;
  state.spores = Math.min(SPORE_CAP, state.spores + reward);
  number(state, target.x, target.y - 32, `+${reward} SPORES`);
  if (target.type === "cannon") {
    state.notice =
      "Cannon silenced. Herbicide attacks will recharge more slowly.";
    state.noticeTime = 4;
  }
}

function updatePlants(state, dt) {
  for (const plant of state.plants) {
    if (plant.hp <= 0) continue;
    if (plant.x < state.leftEdge + KILLZONE_OFFSET) {
      plant.hp -= 65 * dt;
      if (plant.hp <= 0) {
        state.stats.mistLost++;
        continue;
      }
    }
    const kind = KINDS[plant.k];
    const front = state.boss.shielded
      ? [...state.tanks, ...state.towers].find(
          (target) =>
            target.hp > 0 &&
            target.lane === plant.lane &&
            ["tank", "cannon"].includes(target.type),
        ) || state.boss
      : state.boss;
    const stopS = getDistAtX(front.x - front.r - 45 - (plant.formation || 0));
    // A moving spawn line can already be past the preferred attack position.
    // Hold there rather than pulling a deployed plant backward into the mist.
    plant.s = Math.max(
      plant.s,
      Math.min(stopS, plant.s + kind.spd * (plant.slow > 0 ? 0.5 : 1) * dt),
    );
    plant.slow = Math.max(0, plant.slow - dt);
    syncPlant(state, plant);
    if (kind.n === "Pitcher") {
      for (const ally of state.plants) {
        if (
          ally !== plant &&
          ally.hp > 0 &&
          Math.hypot(ally.x - plant.x, ally.y - plant.y) < 80
        ) {
          ally.hp = Math.min(KINDS[ally.k].hp, ally.hp + 5 * dt);
        }
      }
    }
    plant.cd -= dt;
    if (plant.cd > 0) continue;
    const targets = enemies(state).filter(
      (enemy) => enemy === state.boss || enemy.lane === plant.lane,
    );
    const target = nearest(targets, plant.x, plant.y, kind.rng);
    if (!target) continue;
    plant.cd = kind.cd;
    damageEnemy(state, target, kind.dmg);
    beam(state, plant, target, kind.col);
    if (kind.n === "Sundew") target.slow = 2;
    if (kind.n === "Rafflesia") {
      for (const other of targets) {
        if (
          other !== target &&
          Math.hypot(other.x - target.x, other.y - target.y) < 70
        ) {
          damageEnemy(state, other, kind.dmg * 0.5);
        }
      }
      state.fx.push({
        x1: target.x,
        y1: target.y,
        c: kind.col,
        t: 0.3,
        ring: 70,
      });
    }
  }
}

function updateDefenses(state, dt) {
  for (const enemy of [...state.towers, ...state.minions, ...state.tanks]) {
    if (enemy.hp <= 0) continue;
    enemy.slow = Math.max(0, enemy.slow - dt);
    enemy.cd -= dt * (enemy.slow > 0 ? 0.55 : 1);
    if (enemy.type === "minion") {
      enemy.s = Math.max(
        0,
        enemy.s - enemy.spd * (enemy.slow > 0 ? 0.5 : 1) * dt,
      );
      [enemy.x, enemy.y] = atBossPath(enemy.s, enemy.lane);
      if (enemy.x <= state.leftEdge + SPAWN_OFFSET) {
        enemy.hp = 0;
        state.spores = Math.max(0, state.spores - 20);
        number(state, enemy.x, enemy.y - 20, "-20 SPORES", "#ff8a9d");
        continue;
      }
    }
    if (enemy.cd > 0) continue;
    const targets = state.plants.filter(
      (p) => enemy.type === "cannon" || p.lane === enemy.lane,
    );
    const target = nearest(targets, enemy.x, enemy.y, enemy.rng);
    if (target) {
      enemy.cd = enemy.base;
      target.hp -= enemy.dmg;
      beam(state, enemy, target, "#ffd9a0");
    }
  }
}

function updateBoss(state, dt) {
  const boss = state.boss;
  for (const part of [boss, ...state.tanks]) {
    part.flash = Math.max(0, part.flash - dt);
  }
  boss.slow = Math.max(0, boss.slow - dt);
  if (!boss.active && state.plants.some((p) => p.hp > 0 && p.x >= APPROACH_X)) {
    boss.active = true;
    state.phase = "shields";
    state.notice = "Harvester engaged. Break the upper and lower tanks.";
    state.noticeTime = 4;
  }
  if (boss.shielded && state.tanks.every((tank) => tank.hp <= 0)) {
    boss.shielded = false;
    boss.active = true;
    boss.enraged = true;
    state.phase = "core";
    state.advanceSpeed = 11.25;
    state.shake = 9;
    state.notice = "CORE EXPOSED — all lanes converge. Mist speed +25%.";
    state.noticeTime = 5;
    state.plants.forEach((plant) => syncPlant(state, plant));
  }
  if (!boss.active || boss.hp <= 0) return;

  if (!boss.shielded) {
    boss.attackCooldown -= dt * (boss.slow > 0 ? 0.55 : 1);
    const target = nearest(state.plants, boss.x, boss.y, 220);
    if (target && boss.attackCooldown <= 0) {
      boss.attackCooldown = 0.9;
      target.hp -= 14;
      beam(state, boss, target, "#f06891");
    }
  }

  // Resolve an existing warning before scheduling a new one, preserving its full two seconds.
  if (state.spray) {
    const spray = state.spray;
    spray.timer = Math.max(0, spray.timer - dt);
    if (spray.stage === "firing") {
      for (const plant of state.plants) {
        if (
          plant.hp > 0 &&
          plant.lane === spray.lane &&
          plant.x >= spray.x1 &&
          plant.x <= spray.x2
        ) {
          plant.hp -= (boss.enraged ? 30 : 24) * dt;
        }
      }
    }
    if (spray.timer <= 0) {
      if (spray.stage === "warning") {
        spray.stage = "firing";
        spray.timer = 1.5;
        state.shake = 5;
      } else state.spray = null;
    }
  } else {
    boss.sprayCooldown -= dt * (boss.slow > 0 ? 0.55 : 1);
    if (boss.sprayCooldown <= 0) {
      const x1 = state.leftEdge + 140;
      const x2 = 1760;
      if (x1 < x2) {
        state.spray = {
          lane: Math.floor(Math.random() * 3),
          stage: "warning",
          timer: 2,
          x1,
          x2,
        };
      }
      const cannonAlive = state.towers.some(
        (t) => t.type === "cannon" && t.hp > 0,
      );
      boss.sprayCooldown = (boss.enraged ? 6 : 8) + (cannonAlive ? 0 : 4);
    }
  }
  boss.summonCooldown -= dt;
  if (boss.summonCooldown <= 0) {
    boss.summonCooldown = boss.enraged ? 8 : 11;
    const spawnX = Math.max(
      MINION_SPAWN_X,
      state.leftEdge + SPAWN_OFFSET + MINION_SPAWN_CLEARANCE,
    );
    // Keep time to intercept a guard; skip the wave if that gap no longer fits.
    if (spawnX <= BOSS_PATH[BOSS_PATH.length - 1][0]) {
      const lane = Math.floor(Math.random() * 3);
      state.minions.push(createMinion(spawnX, lane));
    }
  }
}

function updateFx(state, dt) {
  state.shake = Math.max(0, state.shake - dt * 25);
  state.noticeTime = Math.max(0, state.noticeTime - dt);
  state.fx.forEach((fx) => {
    fx.t -= dt;
  });
  state.fx = state.fx.filter((fx) => fx.t > 0);
  state.damageNumbers.forEach((n) => {
    n.t -= dt;
    n.y -= dt * 25;
  });
  state.damageNumbers = state.damageNumbers.filter((n) => n.t > 0);
}

export function updateBossLevel(state, dt) {
  if (!Number.isFinite(dt) || dt <= 0 || state.state === "pause") return;
  if (state.state !== "play") {
    updateFx(state, dt);
    return;
  }
  let remaining = dt;
  while (remaining > 0 && state.state === "play") {
    const step = Math.min(0.05, remaining);
    remaining -= step;
    state.elapsed += step;
    state.spores = Math.min(SPORE_CAP, state.spores + 8 * step);
    const cameraStep = Math.min(SCROLL_SPEED * step, ARENA_X - state.cameraX);
    state.cameraX += cameraStep;
    // Scroll carries the world past the trailing wall, while the mist itself
    // closes in on screen. Spawns stay just ahead of the same damaging edge.
    state.leftEdge = Math.min(
      OVERRUN_X,
      state.leftEdge + cameraStep + state.advanceSpeed * step,
    );
    updatePlants(state, step);
    // A destroyed core ends combat before any enemy can retaliate.
    if (state.boss.hp > 0) {
      updateDefenses(state, step);
      updateBoss(state, step);
    }
    const survivors = state.plants.filter((plant) => plant.hp > 0);
    state.stats.lost += state.plants.length - survivors.length;
    state.plants = survivors;
    state.minions = state.minions.filter((minion) => minion.hp > 0);
    updateFx(state, step);
    if (state.boss.hp <= 0) {
      state.boss.hp = 0;
      state.state = "won";
      state.spray = null;
      state.shake = 14;
      state.fx.push({
        x1: state.boss.x,
        y1: state.boss.y,
        c: "#a9e67b",
        t: 0.8,
        duration: 0.8,
        ring: 180,
      });
    } else if (state.leftEdge >= OVERRUN_X) {
      state.state = "lost";
      state.defeatReason = "overrun";
      state.spray = null;
    }
  }
}
