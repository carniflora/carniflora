import { LEVEL_PATHS } from "./path.js";
const CASTLE_KEY = "carniflora.harvesterConquered";

export function createState() {
  return {
    phase: "menu",
    level: 1,
    players: 1,
    spores: 0,
    map: null,
    enemies: [],
    keep: null,
    plants: [],
    myTowers: [],
    fx: [],
  };
}

export const state = createState();

// progress
const STORAGE_KEY = "carniflora.level";
const FIRST_LEVEL = 1;

function validLevel(level) {
  return (
    Number.isInteger(level) &&
    level >= FIRST_LEVEL &&
    level <= LEVEL_PATHS.length
  );
}

export function loadProgress() {
  // Validate saved data before it can select a map.
  try {
    const level = Number(localStorage.getItem(STORAGE_KEY));
    return validLevel(level) ? level : FIRST_LEVEL;
  } catch {
    return FIRST_LEVEL;
  }
}

export function saveProgress(level) {
  if (!validLevel(level)) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, String(level));
  } catch {
    // Storage restrictions must not interrupt play.
  }
}

// economy -- how spores are counted
export const maxSpores = (localState = state) =>
  localState.players === 2 ? 180 : 120; // set the number of spores available for the level (180 for 2 players or 120 for 1)

// Defeated Harvester
export function loadCastleConquered() {
  try {
    return localStorage.getItem(CASTLE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveCastleConquered() {
  try {
    localStorage.setItem(CASTLE_KEY, "1");
  } catch {
    // Storage restrictions must not interrupt play.
  }
}
