import { state as localState, maxSpores } from "./state.js";
import { ENEMY_KINDS, PLANTS } from "./plants.js";
import { effects as localEffects } from "./effects.js";
import { pxPosOf } from "./levels.js";
import { PLANT_BLOCK, LEVEL_TIME_LIMIT, SPORES_PER_KILL } from "./constants.js";
import { updateTowers } from "./towers.js";
// US 6.4 — per-plant damage cue (Part 1) and plant health display (Part 2).
import { noteDamage, advanceCue } from "./damageCue.js";
import { advancePlantFx, hitShake } from "./plantHealth.js";

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

export function moveEnemy(enemy, state, dt) {
  const def = ENEMY_KINDS[enemy.kind];
  if (!def?.spd || enemy.pathIndex === undefined) return;
  const path = state.map.paths[enemy.pathIndex];
  if (!path) return;

  if (nearest(state.plants, enemy.x, enemy.y, enemy.rng)) return; // fighting

  const lo = Math.max(0, enemy.home - def.patrol);
  const hi = Math.min(path.pathLength, enemy.home + def.patrol);
  let next =
    enemy.position + enemy.dir * def.spd * (enemy.slow > 0 ? 0.5 : 1) * dt;

  if (next >= hi) {
    next = hi;
    enemy.dir = -1;
  } else if (next <= lo) {
    next = lo;
    enemy.dir = 1;
  }
  enemy.position = next;
  [enemy.x, enemy.y] = pxPosOf(path, next);
}

// update over time
export function update(deltaTime, state = localState, effects = localEffects) {
  state.elapsed += deltaTime;
  state.spores = Math.min(maxSpores(state), state.spores + 6 * deltaTime); // spores regenerate 6 per time up to max
  updateTowers(deltaTime, state);
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
      // Effective stats with active buffs/debuffs applied (4.5).
      // Multipliers are scoped to this plant's type (US 4.2/4.3).
      const effDmg = k.dmg * effects.eff("damageMult", 1, p.plant);
      const enemy = target;
      if (enemy) {
        p.cooldown = k.cooldown * effects.eff("cooldownMult", 1, p.plant);
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

  // Reward each minion killed this tick. `alive` was filtered at the start
  // of the tick, so every kill is counted once. The keep ends the level.
  const kills = alive.filter((e) => !e.keep && e.hp <= 0).length;
  state.spores = Math.min(
    maxSpores(state),
    state.spores + kills * SPORES_PER_KILL,
  );

  // =========================
  // TOWER ATTACKS
  // ==========================
  for (const enemy of alive) {
    enemy.slow = Math.max(0, enemy.slow - deltaTime);
    enemy.cooldown -= deltaTime * (enemy.slow > 0 ? 0.55 : 1);
    moveEnemy(enemy, state, deltaTime);
    if (enemy.cooldown <= 0) {
      const p = nearest(state.plants, enemy.x, enemy.y, enemy.rng);
      if (p) {
        enemy.cooldown = enemy.base;
        // Effective incoming damage multipliers (debuffs + health buffs — 4.5).
        // hpMult (Fortified, Root Shield) divides incoming damage so plants
        // survive longer without their max HP changing when a buff expires.
        // Both are scoped to the targeted plant's type (US 4.2/4.3).
        const taken = effects.eff("damageTakenMult", 1, p.plant);
        const tough = effects.eff("hpMult", 1, p.plant);
        const before = p.hp;
        p.hp -= (enemy.dmg * taken) / tough;
        // US 6.4 — mark the plant that took the direct hit.
        if (noteDamage(p, before - p.hp)) hitShake(p);

        if (ENEMY_KINDS[enemy.kind]?.style === "splash") {
          for (const other of state.plants) {
            if (other !== p && Math.hypot(other.x - p.x, other.y - p.y) < 60) {
              const before = other.hp;
              other.hp -= (enemy.dmg * 0.5 * taken) / tough;
              // US 6.4 — mark only the plants the splash actually damages.
              if (noteDamage(other, before - other.hp)) hitShake(other);
            }
          }
          state.fx.push({
            x1: p.x,
            y1: p.y,
            x2: p.x,
            y2: p.y,
            timer: 0.3,
            colour: "#ffd9a0",
            ring: 60,
          });
        }

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

  // US 6.4 — advance the per-plant damage cue and its visual timers.
  for (const plant of state.plants) {
    advanceCue(plant, deltaTime); // Part 1
    advancePlantFx(plant, deltaTime); // Part 2 (droppable)
  }

  // Win.
  if (state.keep.hp <= 0) {
    end("won", state);
  }

  // Lose: out of time, or no plants and no way to send more.
  else if (
    state.elapsed >= LEVEL_TIME_LIMIT ||
    (!state.plants.length &&
      state.spores < Math.min(...PLANTS.map((k) => k.cost)))
  ) {
    end("lost", state);
  }
}

// =======================
// END LEVEL
// ======================
export function end(phase, state = localState) {
  state.phase = phase;
}
