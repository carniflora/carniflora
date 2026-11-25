import { TILE } from "./constants.js";

// Both arenas use the same garden floor and dirt paths.
export function drawTerrain(ctx, width, height) {
  const fill = ctx.createLinearGradient(0, 0, 0, height);
  fill.addColorStop(0, "#16301f");
  fill.addColorStop(1, "#0f2217");
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, width, height);
}

export function strokeTrail(ctx) {
  ctx.strokeStyle = "#4a3a28";
  ctx.lineWidth = TILE * 0.65;
  ctx.stroke();
  ctx.strokeStyle = "#5d4a33";
  ctx.lineWidth = TILE * 0.5;
  ctx.stroke();
}
