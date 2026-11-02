import { MAP_COLS, MAP_ROWS } from "./levels.js";
import { LEVEL_PATHS } from "./path.js";
import { effects } from "./effects.js";
import { state } from "./state.js";
import { MAX_TOWER_DIST_TO_PATH, PLANT_BLOCK } from "./constants.js";
import { PLANTS } from "./plants.js";
import { maxSpores } from "./economy.js";
import { posOf } from "./geometry.js";

export { TILE } from "./constants.js";

// ====================
// GAME STATE
// ====================
export { state };

export { maxSpores };

// ===============
// PLANT TYPES
// ==============
export { PLANTS };

// ================
// BUILD LEVEL
// ================
export { build } from "./build.js";

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
  // Advance buff/debuff system (auto-fire + expire + poison drain — 4.1 / 4.5)
  effects.update(deltaTime);
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
      // Effective stats with active buffs/debuffs applied (4.5)
      const effDmg = k.dmg * effects.eff("damageMult", 1);
      const enemy = target;
      if (enemy) {
        p.cooldown = k.cooldown * effects.eff("cooldownMult", 1);
        enemy.hp -= effDmg;
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
              secEnemy.hp -= effDmg * 0.5;
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
        // Effective incoming damage for this plant (debuffs like Weakened — 4.5)
        p.hp -= enemy.dmg * effects.eff("damageTakenMult", 1);
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
