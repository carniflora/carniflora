import { state as localState } from "./state.js";
import { PLANTS } from "./plants.js";
import { pxPosOf } from "./levels.js";

// Event catalog (5 buffs, 5 debuffs)
export const EVENTS = [
  {
    id: "empowered",
    name: "Empowered",
    icon: "🌟",
    kind: "buff",
    mod: { damageMult: 1.5 },
    dur: 15,
  },
  {
    id: "hasted",
    name: "Hasted",
    icon: "⚡",
    kind: "buff",
    mod: { cooldownMult: 0.5 },
    dur: 12,
  },
  {
    id: "fortified",
    name: "Fortified",
    icon: "🛡",
    kind: "buff",
    mod: { hpMult: 2.0 },
    dur: 20,
  },
  {
    id: "sun_fury",
    name: "Sun Fury",
    icon: "☀",
    kind: "buff",
    mod: { damageMult: 2.0 },
    dur: 10,
  },
  {
    id: "root_shield",
    name: "Root Shield",
    icon: "🌿",
    kind: "buff",
    mod: { damageMult: 1.5, hpMult: 1.5 },
    dur: 18,
  },
  {
    id: "withering",
    name: "Withering",
    icon: "🥀",
    kind: "debuff",
    mod: { damageMult: 0.6 },
    dur: 15,
  },
  {
    id: "slowed",
    name: "Slowed",
    icon: "🐌",
    kind: "debuff",
    mod: { cooldownMult: 2.0 },
    dur: 12,
  },
  {
    id: "weakened",
    name: "Weakened",
    icon: "💀",
    kind: "debuff",
    mod: { damageTakenMult: 1.3 },
    dur: 18,
  },
  {
    id: "poisoned",
    name: "Poisoned",
    icon: "☠",
    kind: "debuff",
    mod: { hpDrainPerSec: 5 },
    dur: 10,
  },
  {
    id: "frozen",
    name: "Frozen",
    icon: "❄",
    kind: "debuff",
    mod: { damageMult: 0.5, cooldownMult: 2.0 },
    dur: 8,
  },
];

// Seeded RNG (mulberry32) — deterministic replays + testable
export class RNG {
  constructor(seed = Date.now() | 0) {
    this.s = seed >>> 0;
  }

  // mulberry32 PRNG — returns a float in [0, 1)
  mulberry32() {
    const self = this;
    let a = this.s;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      self.s = a;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  next() {
    return this.mulberry32()();
  }
}

// Effects engine (DOM-free, testable with vitest)
export const SEED_TTL = 15; // seconds before an unclaimed seed wilts
const SEED_RADIUS = 32; // px — a plant within this distance claims a seed

export function createEffects(state) {
  return {
    active: [], // [{ event, remaining, mod, plantType }]
    history: [], // traceability log
    rng: null,
    timer: 0,
    interval: 18, // seconds between seed spawns

    reset(seed = Date.now() | 0) {
      this.active = [];
      this.history = [];
      this.timer = 0;
      this.rng = new RNG(seed);
      if (state) state.seeds = [];
    },

    // call inside game.js update()
    update(dt) {
      // expire + tick active effects
      for (let i = this.active.length - 1; i >= 0; i--) {
        const a = this.active[i];
        a.remaining -= dt;
        if (a.mod && a.mod.hpDrainPerSec) {
          // poison: drain HP from all plants
          for (const p of state.plants) p.hp -= a.mod.hpDrainPerSec * dt;
        }
        if (a.remaining <= 0) {
          this.history.push({ ev: a.event, action: "expired" });
          this.active.splice(i, 1);
        }
      }

      // seeds (US 4.1): a plant touching a seed destroys it and gains an
      // effect. Wilted seeds are removed. New seeds spawn on the interval.
      if (state.seeds) {
        for (let i = state.seeds.length - 1; i >= 0; i--) {
          const s = state.seeds[i];
          s.ttl -= dt;
          if (s.ttl <= 0) {
            state.seeds.splice(i, 1);
            continue;
          }
          const claimer = state.plants.find(
            (p) => Math.hypot(p.x - s.x, p.y - s.y) <= SEED_RADIUS,
          );
          if (claimer) {
            state.seeds.splice(i, 1);
            this.fire();
          }
        }
      }

      // spawn a new seed on the interval
      this.timer += dt;
      if (this.timer >= this.interval) {
        this.timer = 0;
        this.spawnSeed();
      }
    },

    // Place a seed at (x, y). When omitted, a random spot on the map is used.
    spawnSeed(x, y) {
      if (x === undefined || y === undefined) {
        const map = state.map;
        if (map && map.paths && map.paths.length) {
          const path =
            map.paths[Math.floor(this.rng.next() * map.paths.length)];
          const t = this.rng.next() * path.pathLength;
          [x, y] = pxPosOf(path, t);
        } else {
          x = 0;
          y = 0;
        }
      }
      if (!state.seeds) state.seeds = [];
      state.seeds.push({ x, y, ttl: SEED_TTL });
    },

    // Force a specific event (for tests / debug), or random from catalog.
    // Buffs/debuffs that change plant stats target one plant type (US 4.2/4.3);
    // global effects (poison drain) carry plantType = null.
    fire(forceEvent = null, forceType = null) {
      let ev = forceEvent;
      if (typeof ev === "string") ev = EVENTS.find((e) => e.id === ev);
      const event = ev ?? EVENTS[Math.floor(this.rng.next() * EVENTS.length)];
      const targetsPlants = !event.mod?.hpDrainPerSec;
      const plantType = targetsPlants
        ? (forceType ?? Math.floor(this.rng.next() * PLANTS.length))
        : null;
      this.active.push({
        event,
        remaining: event.dur,
        mod: event.mod,
        plantType,
      });
      this.history.push({ ev: event, action: "applied" });
      return event;
    },

    // SINGLE CHOKE-POINT: effective stat multiplier.
    // plantIndex scopes the lookup to one plant type (US 4.2/4.3); omit it
    // for the legacy global behaviour used by tests and non-plant callers.
    eff(stat, base = 1, plantIndex) {
      let m = base;
      for (const a of this.active) {
        if (!a.mod || !a.mod[stat]) continue;
        if (
          plantIndex !== undefined &&
          a.plantType !== null &&
          a.plantType !== plantIndex
        )
          continue;
        m *= a.mod[stat];
      }
      return m;
    },

    // for HUD display
    displayList() {
      return this.active.map((a) => ({
        icon: a.event.icon,
        name: a.event.name,
        kind: a.event.kind,
        remaining: Math.ceil(a.remaining),
        plantType: a.plantType,
      }));
    },

    // Icons to float above a plant/tower of the given type (US 6.5).
    // Global effects (plantType null, e.g. poison) follow every plant.
    iconsFor(plantIndex) {
      return this.active
        .filter((a) => a.plantType === null || a.plantType === plantIndex)
        .map((a) => ({ icon: a.event.icon, kind: a.event.kind }));
    },
  };
}

export const effects = createEffects(localState);
