import { loadLevel } from "./levels.js";

const FINAL_MINION = 2; // final minion is this far from the enemy tower
const DIST_BETWEEN_MINIONS = 0.75; // distance between the minions
const MAX_TOWER_DIST_TO_PATH = 1.25; // maximum distance tower can be from a path
export const TILE = 64;

// get the current position, wrapper function of getPositionAtDistance in levels.js
const posOf = (path, d) => {
  const [x, y] = path.positionAtDistance(Math.min(d, path.pathLength));
  return [x * TILE, y * TILE];
};

// check whether enemy minions are too close together
function tooCloseToOthers(distance, placedDistances) {
  for (const other of placedDistances) {
    if (Math.abs(other - distance) < DIST_BETWEEN_MINIONS) return true;
  }
  return false;
}

/* game state */
export const state = {
  phase: "menu",
  level: 1,
  spores: 0,
  map: null,
  enemies: [],
  keep: null,
  plants: [],
  myTowers: [],
  fx: [],
};

/* current available minions */
export const PLANTS = [
  {
    n: "Flytrap",
    cost: 40,
    hp: 140,
    spd: 0.7,
    rng: 70,
    dmg: 16,
    cooldown: 0.8,
    col: "#8fd45a",
    radius: 10,
    desc: "Tough biter, short reach",
  },
  {
    n: "Sundew",
    cost: 30,
    hp: 55,
    spd: 1,
    rng: 115,
    dmg: 6,
    cooldown: 0.7,
    col: "#e0457b",
    radius: 7,
    desc: "Ranged, slows tower fire",
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
    desc: "Soaks hits, heals allies",
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
    desc: "Splash blast on towers",
  },
];

/* Build the level from the loadLevel function */
export function build() {
  // load the map
  state.map = loadLevel(state.level - 1);
  state.myTowers = [];
  state.plants = [];
  state.enemies = [];
  state.fx = [];
  state.spores = 120; // set the number of spores available for the level

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
  for (const path of state.map.paths) {
    // in case there is more than one path
    const enemyPlaced = [];
    for (let i = 0; enemyPlaced.length < count; i++) {
      const firstMinion = path.pathLength * 0.5; // ensure that first minion is half way on the path
      const lastMinion = Math.max(firstMinion, path.pathLength - FINAL_MINION); // ensure that last minion is the specified distance from the tower
      const position = firstMinion + Math.random() * (lastMinion - firstMinion); // random position in between the first and last
      if (tooCloseToOthers(position, enemyPlaced)) continue; // check that the positions aren't too close together
      enemyPlaced.push(position);

      const [x, y] = posOf(path, position);
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

// check if tower can be built on cell
function canBuildAt(c, r) {
  return !state.map.blockPath.has(c + "," + r);
}

// check how far to nearest path cell
function distanceToPath(c1, r1, cell) {
  return Math.hypot(cell.c - c1, cell.r - r1);
}

// find closet path spot from designated cell
function findClosestPathSpot(c, r) {
  let closest = null; // empty until filled with closest
  let closestDist = Infinity; // if closer than infinity to start

  state.map.paths.forEach((path, pathIndex) => {
    // for each path in the map
    path.cells.forEach((cell, cellIndex) => {
      // for each cell on the path
      const d = distanceToPath(c, r, cell); // find the closest path cell to the selected cell
      if (d < closestDist) {
        closestDist = d;
        closest = { pathIndex, cellIndex, distance: d };
      }
    });
  });

  return closest;
}

// limit the number of towers that can be placed
export function maxTowers() {
  return state.map.paths.length * 2;
}

// place your tower beside a path
export function canPlaceTower(c, r, plantIndex) {
  if (plantIndex == null) return false;
  if (state.myTowers.length >= maxTowers()) return false; // maximum towers allowed
  if (!canBuildAt(c, r)) return false;
  // only allow one tower per plant type
  if (state.myTowers.some((tower) => tower.c === c && tower.r === r))
    return false;
  if (state.myTowers.some((tower) => tower.plant === plantIndex)) return false;

  const spot = findClosestPathSpot(c, r);
  return !!spot && spot.distance <= MAX_TOWER_DIST_TO_PATH;
}

export function placeTower(c, r, plantIndex) {
  if (!canPlaceTower(c, r, plantIndex)) return false;
  const spot = findClosestPathSpot(c, r);

  state.myTowers.push({
    c,
    r,
    pathIndex: spot.pathIndex,
    startDist: spot.cellIndex,
    plant: plantIndex,
  });
  return true;
}

// update the plants when they are sent out (deployed from trees/towers)
export function sendOut(tower) {
  const plant = PLANTS[tower.plant];
  if (state.phase !== "play" || state.spores < plant.cost) return;
  state.spores -= plant.cost;
  state.plants.push({
    plant: tower.plant,
    dist: tower.startDist,
    pathIndex: tower.pathIndex,
    x: 0,
    y: 0,
    hp: plant.hp,
    cooldown: 0,
  });
}

// find the nearest target that has full health
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
  state.spores += 6 * deltaTime; // spores regenerate 6 per time
  // check which enemies are still alive
  const alive = state.enemies.filter((enemy) => enemy.hp > 0);
  for (const p of state.plants) {
    // for each active plant
    // get the plant path index
    const path = state.map.paths[p.pathIndex];

    //get info about plant
    const k = PLANTS[p.plant];
    if (p.dist < path.pathLength) p.dist += k.spd * deltaTime; // the plant moves this speed over time
    [p.x, p.y] = posOf(path, p.dist); // get plant position
    p.cooldown -= deltaTime; // plant cooldown reduces over time
    if (k.n === "Pitcher")
      // if there are any pitcher plants
      for (const q of state.plants)
        // look at surrounding plants
        if (q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 80)
          // heal nearby plant q by 4 per second to max health less than certain range
          q.hp = Math.min(PLANTS[q.plant].hp, q.hp + 4 * deltaTime);
    if (p.cooldown <= 0) {
      // check if enemies in range and cooldown complete
      const enemy = nearest(alive, p.x, p.y, k.rng);
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
        if (k.n === "Sundew") enemy.slow = 2;
        if (k.n === "Rafflesia") {
          for (const secEnemy of alive)
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
  state.plants = state.plants.filter((p) => p.hp > 0);
  state.fx.forEach((f) => (f.timer -= deltaTime));
  state.fx = state.fx.filter((f) => f.timer > 0);
  if (state.keep.hp <= 0) end(true);
  else if (
    !state.plants.length &&
    state.spores < Math.min(...PLANTS.map((k) => k.cost))
  )
    end(false);
}

export function end(win) {
  state.phase = win ? "won" : "lost";
}
