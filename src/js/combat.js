import { state } from "./state.js";
import { PLANTS } from "./plants.js";
import { effects } from "./effects.js";
import { maxSpores } from "./economy.js";
import { pxPosOf } from "./levels.js";
import { PLANT_BLOCK } from "./constants.js";
import { updateTowers } from "./towers.js";

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
  updateTowers(deltaTime);
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
    [p.x, p.y] = pxPosOf(path, p.dist);
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
