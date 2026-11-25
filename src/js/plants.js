export const PLANTS = [
  {
    n: "Flytrap",
    sheet: "snap",
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
    sheet: "thorn",
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
    sheet: "pip",
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
    sheet: "sunny",
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

/**
 * BOSS LEVEL
 * Carniflora - Shared Unit Definitions
 */

export const BOSS_KINDS = [
  {
    n: "Flytrap",
    sheet: "snap",
    cost: 40,
    hp: 150,
    spd: 65,
    rng: 75,
    dmg: 18,
    cd: 0.75,
    col: "#8fd45a",
    r: 10,
    d: "Tough biter, short reach",
  },
  {
    n: "Sundew",
    sheet: "thorn",
    cost: 30,
    hp: 60,
    spd: 75,
    rng: 120,
    dmg: 8,
    cd: 0.65,
    col: "#e0457b",
    r: 7,
    d: "Ranged, slows tower fire",
  },
  {
    n: "Pitcher",
    sheet: "pip",
    cost: 60,
    hp: 240,
    spd: 52,
    rng: 75,
    dmg: 6,
    cd: 1.0,
    col: "#e8b04a",
    r: 12,
    d: "Soaks hits; heals nearby allies. Healing auras do not stack.",
  },
  {
    n: "Rafflesia",
    sheet: "sunny",
    cost: 90,
    hp: 100,
    spd: 48,
    rng: 130,
    dmg: 38,
    cd: 2.0,
    col: "#b05cf0",
    r: 9,
    d: "Armour-piercing splash blasts",
  },
];

/**
 * Different enemies for normal levels
 */

export const ENEMY_KINDS = {
  cog: {
    hpMult: 1,
    dmgMult: 1,
    rng: 115,
    base: 1.1,
    radius: 16,
    style: "shot",
    unlock: 1,
  },
  piston: {
    hpMult: 0.6,
    dmgMult: 0.7,
    rng: 90,
    base: 0.55,
    radius: 13,
    style: "shot",
    unlock: 2,
  },
  rivet: {
    hpMult: 0.8,
    dmgMult: 0.9,
    rng: 190,
    base: 1.6,
    radius: 14,
    style: "shot",
    unlock: 2,
  },
  boiler: {
    hpMult: 2,
    dmgMult: 1.3,
    rng: 100,
    base: 2.4,
    radius: 20,
    style: "splash",
    unlock: 3,
  },
};

export function availableEnemyKinds(level) {
  return Object.entries(ENEMY_KINDS)
    .filter(([, k]) => k.unlock <= level)
    .map(([name]) => name);
}
