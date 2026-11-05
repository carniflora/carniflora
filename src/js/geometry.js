import { TILE } from "./constants.js";

// get the current position, wrapper function of getPositionAtDistance in levels.js
export const posOf = (path, d) => {
  const [x, y] = path.positionAtDistance(Math.min(d, path.pathLength));
  return [x * TILE, y * TILE];
};
