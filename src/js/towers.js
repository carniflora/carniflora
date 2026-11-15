import { state } from "./state.js";
import { PLANTS } from "./plants.js";
import { LEVEL_PATHS } from "./path.js";
import { pxPosOf } from "./levels.js";
import {
  MAP_COLS,
  MAP_ROWS,
  MAX_TOWER_DIST_TO_PATH,
  TOWER_LIFETIME,
} from "./constants.js";

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
    timeLeft: TOWER_LIFETIME,
  });
  return true;
}

// send a plant out of a tower, onto the tower path.
export function sendOut(tower) {
  const plant = PLANTS[tower.plant];
  if (state.spores < plant.cost) return false;

  const path = state.map.paths[tower.pathIndex];
  const [x, y] = pxPosOf(path, tower.startDist);

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

// count down tower timers and remove expired towers
export function updateTowers(deltaTime) {
  for (const tower of state.myTowers) tower.timeLeft -= deltaTime;
  state.myTowers = state.myTowers.filter((t) => t.timeLeft > 0);
}
