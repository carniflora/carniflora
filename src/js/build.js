import { state as localState, maxSpores } from "./state.js";
import { TILE, FINAL_MINION, DIST_BETWEEN_MINIONS } from "./constants.js";
import { pxPosOf, loadLevel } from "./levels.js";
import { effects as localEffects } from "./effects.js";
import { ENEMY_KINDS, availableEnemyKinds } from "./plants.js";

export function build(
  state = localState,
  effects = localEffects,
  random = Math.random,
) {
  // load the map
  state.map = loadLevel(state.level - 1, state.players);
  state.myTowers = [];
  state.plants = [];
  state.enemies = [];
  state.fx = [];
  state.spores = maxSpores(state);

  // create the enemy tower at the end of all paths
  const firstPath = state.map.paths[0];

  // grab coordinates of the last cell
  const [ex, ey] = pxPosOf(firstPath, firstPath.pathLength);

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

  const pool = availableEnemyKinds(state.level);

  // randomly spawn enemy minions along the path (starting at halfway along the path)
  const count = Math.min(4 + state.level, 7); // number of minions per path
  const placedPoints = [];

  for (const path of state.map.paths) {
    const firstMinion = path.pathLength * 0.33; // ensure that first minion is half way on the path
    const lastMinion = Math.max(firstMinion, path.pathLength - FINAL_MINION); // ensure that last minion is the specified distance from the tower
    let placed = 0;

    for (let attempts = 0; placed < count && attempts < 500; attempts++) {
      const position = firstMinion + random() * (lastMinion - firstMinion);
      const [x, y] = pxPosOf(path, position);

      // compare real positions along different paths
      const tooClose = placedPoints.some(
        ([px, py]) => Math.hypot(px - x, py - y) < DIST_BETWEEN_MINIONS * TILE,
      );
      if (tooClose) continue;

      placedPoints.push([x, y]);
      placed++;

      // Only consume a random number when there is a real choice, so a
      // cog-only level places enemies exactly as before

      const kind =
        pool.length > 1 ? pool[Math.floor(random() * pool.length)] : pool[0];
      const def = ENEMY_KINDS[kind];
      const hp = 90 * (1 + 0.35 * state.level) * def.hpMult;

      state.enemies.push({
        x,
        y,
        position,
        hp,
        max: hp,
        rng: def.rng,
        dmg: 8 * (1 + 0.2 * state.level),
        cooldown: 0,
        base: def.base,
        slow: 0,
        radius: def.radius,
      });
    }
  }
  // Reset effects for this level (seeded random per level start — 4.1 / 4.6)
  effects.reset();
}
