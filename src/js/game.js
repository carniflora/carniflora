import { state } from "./state.js";
import { PLANTS } from "./plants.js";
import { maxSpores } from "./economy.js";

export { TILE } from "./constants.js";

// ====================
// GAME STATE
// ====================
export { state };

export { maxSpores };

// ===============
// PLANT TYPES
// ==============
export { PLANTS };

// ================
// BUILD LEVEL
// ================
export { build } from "./build.js";

// ====================
// TOWERS
// ====================

export {
  maxTowers,
  towersOf,
  canPlaceTower,
  placeTower,
  sendOut,
  deploySelected,
} from "./towers.js";

export { update, end } from "./combat.js";
