import { state } from "./game.js";

// ── Event catalog (5 buffs, 5 debuffs) ─────────────────────────────────────
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

// ── Seeded RNG (mulberry32) — deterministic replays + testable ──────────────
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

// ── Effects engine (DOM-free, testable with vitest) ────────────────────────
export const effects = {
  active: [], // [{ event, remaining, mod }]
  history: [], // traceability log
  rng: null,
  timer: 0,
  interval: 18, // seconds between auto-spawns

  reset(seed = Date.now() | 0) {
    this.active = [];
    this.history = [];
    this.timer = 0;
    this.rng = new RNG(seed);
  },

  // call inside game.js update()
  update(dt) {
    // expire + tick
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
    // auto-fire
    this.timer += dt;
    if (this.timer >= this.interval) {
      this.timer = 0;
      this.fire();
    }
  },

  // Force a specific event (for tests / debug), or random from catalog
  fire(forceEvent = null) {
    let ev = forceEvent;
    if (typeof ev === "string") ev = EVENTS.find((e) => e.id === ev);
    const event = ev ?? EVENTS[Math.floor(this.rng.next() * EVENTS.length)];
    this.active.push({ event, remaining: event.dur, mod: event.mod });
    this.history.push({ ev: event, action: "applied" });
    return event;
  },

  // ── SINGLE CHOKE-POINT: effective stat multiplier ──────────────────────
  eff(stat, base = 1) {
    let m = base;
    for (const a of this.active) {
      if (a.mod && a.mod[stat]) m *= a.mod[stat];
    }
    return m;
  },

  // ── for HUD display ────────────────────────────────────────────────────
  displayList() {
    return this.active.map((a) => ({
      icon: a.event.icon,
      name: a.event.name,
      kind: a.event.kind,
      remaining: Math.ceil(a.remaining),
    }));
  },
};
