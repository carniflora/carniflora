import { state } from "./state.js";
import { maxSpores } from "./economy.js";
import { posOf } from "./geometry.js";
import { TILE, FINAL_MINION, DIST_BETWEEN_MINIONS } from "./constants.js";
import { loadLevel } from "./levels.js";
import { effects } from "./effects.js";

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
  // Reset effects for this level (seeded random per level start — 4.1 / 4.6)
  effects.reset();
}
