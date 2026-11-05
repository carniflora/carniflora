import { LEVEL_PATHS } from "./path.js";

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
