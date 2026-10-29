import { loadLevel, MAP_COLS, MAP_ROWS } from "./levels.js";
import { LEVEL_PATHS } from "./path.js";

const FINAL_MINION = 2; // final minion is this far from the enemy tower
const DIST_BETWEEN_MINIONS = 0.75; // distance between the minions
const MAX_TOWER_DIST_TO_PATH = 1.25; // maximum distance tower can be from a path
const PLANT_BLOCK = 0.5;
export const TILE = 64;

// get the current position, wrapper function of getPositionAtDistance in levels.js
const posOf = (path, d) => {
  const [x, y] = path.positionAtDistance(Math.min(d, path.pathLength));
  return [x * TILE, y * TILE];
};

// ====================
// GAME STATE
// ====================
export const state = {
  phase: "menu",
  level: 1,
  players: 1,
  spores: 0,
  map: null,
  enemies: [],
  keep: null,
  plants: [],
  myTowers: [],
  fx: [],
};

export const maxSpores = () => (state.players === 2 ? 180 : 120); // set the number of spores available for the level (180 for 2 players or 120 for 1)

// ===============
// PLANT TYPES
// ==============
export const PLANTS = [
  {
    n: "Flytrap",
    cost: 30,
    hp: 140,
    spd: 0.7,
    rng: 70,
    dmg: 16,
    cooldown: 0.8,
    col: "#8fd45a",
    radius: 10,
    desc: "A tough plant that attacks enemies up close with powerful bites. Its high health helps it survive attacks and stay in battle longer.",
  },
  {
    n: "Sundew",
    cost: 40,
    hp: 55,
    spd: 1,
    rng: 115,
    dmg: 6,
    cooldown: 0.7,
    col: "#e0457b",
    radius: 7,
    desc: "A ranged plant that attacks from a distance and slows down enemy towers. It helps other plants survive by giving them more time to move forward.",
  },
  {
    n: "Pitcher",
    cost: 60,
    hp: 220,
    spd: 0.5,
    rng: 70,
    dmg: 5,
    cooldown: 1,
    col: "#e8b04a",
    radius: 12,
    desc: "A strong plant that can take a lot of damage while healing nearby friendly plants. It helps keep the group alive as they move toward the enemy keep.",
  },
  {
    n: "Rafflesia",
    cost: 90,
    hp: 90,
    spd: 0.25,
    rng: 125,
    dmg: 34,
    cooldown: 2.4,
    col: "#b05cf0",
    radius: 9,
    desc: "A powerful plant that releases splash attacks to damage multiple enemies in one area. It is useful when several targets are close together.",
  },
];

// ================
// BUILD LEVEL
// ================
export function build() {
  // load the map
  state.map = loadLevel(state.level - 1, state.players);
  state.myTowers = [];
  state.plants = [];
  state.enemies = [];
  state.fx = [];
  state.spores = maxSpores();

  // create the enemy tower at the end of all paths
  const firstPath = state.map.paths[0];

  // grab coordinates of the last cell
  const [ex, ey] = posOf(firstPath, firstPath.pathLength);

  // create the enemy tower
  state.keep = {
    x: ex,
    y: ey, // the location is the end coordinates of the paths
    hp: 420 * (1 + 0.35 * state.level),
    max: 420 * (1 + 0.35 * state.level),
    rng: 105,
    dmg: 10 * (1 + 0.2 * state.level),
    cooldown: 0,
    base: 1.2,
    slow: 0,
    radius: 30,
    keep: true,
  };
  state.enemies.push(state.keep); // add to the list of enemies

  // randomly spawn enemy minions along the path (starting at halfway along the path)
  const count = Math.min(4 + state.level, 7); // number of minions per path
  const placedPoints = [];

  for (const path of state.map.paths) {
    const firstMinion = path.pathLength * 0.33; // ensure that first minion is half way on the path
    const lastMinion = Math.max(firstMinion, path.pathLength - FINAL_MINION); // ensure that last minion is the specified distance from the tower
    let placed = 0;

    for (let attempts = 0; placed < count && attempts < 500; attempts++) {
      const position = firstMinion + Math.random() * (lastMinion - firstMinion);
      const [x, y] = posOf(path, position);

      // compare real positions along different paths
      const tooClose = placedPoints.some(
        ([px, py]) => Math.hypot(px - x, py - y) < DIST_BETWEEN_MINIONS * TILE,
      );
      if (tooClose) continue;

      placedPoints.push([x, y]);
      placed++;

      state.enemies.push({
        x,
        y,
        position,
        hp: 90 * (1 + 0.35 * state.level),
        max: 90 * (1 + 0.35 * state.level),
        rng: 115,
        dmg: 8 * (1 + 0.2 * state.level),
        cooldown: 0,
        base: 1.1,
        slow: 0,
        radius: 16,
      });
    }
  }
}

// ====================
// TOWERS
// ====================

// check if a tower can be built on this cell
function canBuildAt(c, r) {
  if (c < 0 || r < 0 || c >= MAP_COLS || r >= MAP_ROWS) return false;
  return !state.map.blockPath.has(c + "," + r);
}

// find the closest path cell to the given cell
function findClosestPathSpot(c, r) {
  let closest = null;
  let closestDist = Infinity;

  state.map.paths.forEach((path, pathIndex) => {
    path.cells.forEach((cell, cellIndex) => {
      const distance = Math.hypot(cell.c - c, cell.r - r);
      if (distance < closestDist) {
        closestDist = distance;
        closest = { pathIndex, cellIndex, distance: distance };
      }
    });
  });
  return closest;
}

// limit the number of towers that can be placed
export function maxTowers() {
  const def = LEVEL_PATHS[state.level - 1];
  return state.players === 2
    ? (def.maxTowers2p ?? def.maxTowers)
    : def.maxTowers;
}

export const towersOf = (player) =>
  state.myTowers.filter((t) => t.owner === player);

// can a tower of this plant type go on this cell?
export function canPlaceTower(c, r, plantIndex, player = 0) {
  if (plantIndex == null) return false;
  const pl = towersOf(player);
  if (pl.length >= maxTowers()) return false; // limit max towers per player
  if (!canBuildAt(c, r)) return false;

  // one tower per cell
  if (state.myTowers.some((t) => t.c === c && t.r === r)) return false;

  // one tower per plant type
  if (pl.some((t) => t.plant === plantIndex)) return false;

  const spot = findClosestPathSpot(c, r);
  return !!spot && spot.distance <= MAX_TOWER_DIST_TO_PATH;
}

// place a tower beside a path. Returns true if it was placed.
export function placeTower(c, r, plantIndex, player = 0) {
  if (!canPlaceTower(c, r, plantIndex, player)) return false;
  const spot = findClosestPathSpot(c, r);

  state.myTowers.push({
    c,
    r,
    owner: player,
    pathIndex: spot.pathIndex,
    startDist: spot.cellIndex,
    plant: plantIndex,
  });
  return true;
}

// send a plant out of a tower, onto the tower path.
export function sendOut(tower) {
  const plant = PLANTS[tower.plant];
  if (state.spores < plant.cost) return false;

  const path = state.map.paths[tower.pathIndex];
  const [x, y] = posOf(path, tower.startDist);

  state.spores -= plant.cost;
  state.plants.push({
    plant: tower.plant,
    owner: tower.owner,
    dist: tower.startDist,
    pathIndex: tower.pathIndex,
    x,
    y,
    hp: plant.hp,
    cooldown: 0,
  });
  return true; // return true if the plant was sent.
}

// send out the selected plant from its tower when the deploy button is pressed
export function deploySelected(plantIndex, player = 0) {
  if (plantIndex == null) return false;

  const towers = state.myTowers.filter(
    (t) => t.plant === plantIndex && t.owner === player,
  );
  let sent = false;
  for (const tower of towers) {
    if (sendOut(tower)) sent = true;
  }
  return sent;
}

// ============================
// FIND NEAREST TARGET
// =============================
function nearest(list, x, y, rng) {
  let closestTarget = null,
    howFarTarget = rng;
  for (const o of list) {
    const dist = Math.hypot(o.x - x, o.y - y);
    if (dist <= howFarTarget + (o.radius || 0) && o.hp > 0) {
      closestTarget = o;
      howFarTarget = dist;
    }
  }
  return closestTarget;
}

// update over time
export function update(deltaTime) {
  state.spores = Math.min(maxSpores(), state.spores + 6 * deltaTime); // spores regenerate 6 per time up to max
  // check which enemies are still alive
  const alive = state.enemies.filter((enemy) => enemy.hp > 0);

  // minions still alive (everything except the keep)
  const minionsLeft = alive.some((e) => !e.keep);

  // plants can only target the the keep once every minion is dead
  const targets = minionsLeft ? alive.filter((e) => !e.keep) : alive;

  for (const p of state.plants) {
    // for each active plant
    // get the plant path index
    const path = state.map.paths[p.pathIndex];

    // ===================
    // UPDATE PLANTS
    // ====================
    const k = PLANTS[p.plant];

    // stop and fight if there is an enemy
    const target = nearest(targets, p.x, p.y, k.rng);

    // check if a player's plant blocks the other player's plant
    const blocked = state.plants.some(
      (q) =>
        q !== p && // if a plant is not the same
        q.owner !== p.owner && // and the owner of both plants is not the same
        q.pathIndex === p.pathIndex &&
        q.dist > p.dist &&
        q.dist - p.dist < PLANT_BLOCK,
    );

    if (!target && !blocked && p.dist < path.pathLength)
      p.dist += k.spd * deltaTime;
    [p.x, p.y] = posOf(path, p.dist);
    p.cooldown -= deltaTime;

    // =========================
    // PITCHER HEALING
    // ==========================
    if (k.n === "Pitcher")
      // if there are any pitcher plants
      for (const q of state.plants)
        // look at surrounding plants
        if (q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 80)
          // heal nearby plant q by 4 per second to max health less than certain range
          q.hp = Math.min(PLANTS[q.plant].hp, q.hp + 4 * deltaTime);

    // ========================
    // PLANT ATTACK
    // =========================
    if (p.cooldown <= 0) {
      // check if enemies in range and cooldown complete
      const enemy = target;
      if (enemy) {
        p.cooldown = k.cooldown;
        enemy.hp -= k.dmg;
        state.fx.push({
          x1: p.x,
          y1: p.y,
          x2: enemy.x,
          y2: enemy.y,
          timer: 0.12,
          colour: k.col,
        });

        // Sundew slows towers.
        if (k.n === "Sundew") enemy.slow = 2;

        // Rafflesia splash attack.
        if (k.n === "Rafflesia") {
          for (const secEnemy of targets)
            if (
              secEnemy !== enemy &&
              Math.hypot(secEnemy.x - enemy.x, secEnemy.y - enemy.y) < 60
            )
              secEnemy.hp -= k.dmg * 0.5;
          state.fx.push({
            x1: enemy.x,
            y1: enemy.y,
            x2: enemy.x,
            y2: enemy.y,
            timer: 0.3,
            colour: k.col,
            ring: 60,
          });
        }
      }
    }
  }

  // =========================
  // TOWER ATTACKS
  // ==========================
  for (const enemy of alive) {
    enemy.slow = Math.max(0, enemy.slow - deltaTime);
    enemy.cooldown -= deltaTime * (enemy.slow > 0 ? 0.55 : 1);
    if (enemy.cooldown <= 0) {
      const p = nearest(state.plants, enemy.x, enemy.y, enemy.rng);
      if (p) {
        enemy.cooldown = enemy.base;
        p.hp -= enemy.dmg;
        state.fx.push({
          x1: enemy.x,
          y1: enemy.y,
          x2: p.x,
          y2: p.y,
          timer: 0.1,
          colour: "#ffd9a0",
        });
      }
    }
  }

  // Remove dead plants.
  state.plants = state.plants.filter((p) => p.hp > 0);

  // Update attack effects.
  state.fx.forEach((f) => (f.timer -= deltaTime));
  state.fx = state.fx.filter((f) => f.timer > 0);

  // Win.
  if (state.keep.hp <= 0) end(true);

  // Lose.
  else if (
    !state.plants.length &&
    state.spores < Math.min(...PLANTS.map((k) => k.cost))
  )
    end(false);
}

// =======================
// END LEVEL
// ======================
export function end(win) {
  state.phase = win ? "won" : "lost";
}
