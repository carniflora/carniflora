import { PLANTS } from "./plants.js";
const FRAME = 64,
  FRAMES = 16,
  FPS = 8;
const P2_COLOUR = "blue";
const ENEMY_SHEETS = {
  minion: ["rivet", "cog", "piston", "boiler", "tower", "cannon", "harvester"],
  keep: "works",
};
const TREE_FRAME = 96;
const CLOSED_EYE_FRAME = 7;
const images = {};
const enemyImages = {};
const treeImgs = {};

const TANK_W = 145;
const TANK_H = 52;
const TANK_SHEETS = ["upper", "upper-destroyed", "lower", "lower-destroyed"];
const tankImages = {};

function load(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Could not load " + src));
    img.src = src;
  });
}

export async function loadSprites() {
  const names = [...new Set(PLANTS.map((k) => k.sheet))];
  await Promise.all([
    ...names.map(async (n) => {
      const base = `assets/carniflora-${n}-sheet16-1x`;
      images[n] = {
        1: await load(`${base}.png`),
        2: await load(`${base}-p2-${P2_COLOUR}.png`),
      };
    }),
    (async () => {
      enemyImages.minion = await Promise.all(
        ENEMY_SHEETS.minion.map((n) =>
          load(`assets/carniflora-${n}-sheet16-1x.png`),
        ),
      );
      enemyImages.keep = await load(
        `assets/carniflora-${ENEMY_SHEETS.keep}-sheet16-1x.png`,
      );
    })(),
    (async () => {
      treeImgs[1] = await load("assets/carniflora-tree-plants-sheet4-1x.png");
      treeImgs[2] = await load(
        `assets/carniflora-tree-plants-sheet4-1x-p2-${P2_COLOUR}.png`,
      );
    })(),
    (async () => {
      await Promise.all(
        TANK_SHEETS.map(async (n) => {
          tankImages[n] = await load(
            `assets/carniflora-tank-${n}-sheet16-1x.png`,
          );
        }),
      );
    })(),
  ]);
}

function frameFor(obj, now) {
  obj.animOffset ??= Math.floor(Math.random() * FRAMES);
  return (Math.floor((now / 1000) * FPS) + obj.animOffset) % FRAMES;
}

export function drawPlant(ctx, p, now, size = 48) {
  const index = p.plant ?? p.k;
  const name = PLANTS[index].sheet;
  const img = images[name]?.[(p.owner ?? 0) === 0 ? 1 : 2];
  if (!img) return false;

  p.animOffset ??= Math.floor(Math.random() * FRAMES);
  const frame = (Math.floor((now / 1000) * FPS) + p.animOffset) % FRAMES;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    frame * FRAME,
    0,
    FRAME,
    FRAME,
    p.x - size / 2,
    p.y - size / 2,
    size,
    size,
  );
  return true;
}

export function drawEnemy(ctx, e, now, size = 48) {
  let img;

  if (e.keep) img = enemyImages.keep;
  else if (enemyImages.minion) {
    const index = ENEMY_SHEETS.minion.indexOf(e.kind ?? "cog");
    img = enemyImages.minion[index >= 0 ? index : 1];
  }

  if (!img) return false;

  ctx.imageSmoothingEnabled = false;

  let drawX = e.x - size / 2;
  let drawY = e.y - size / 2;

  if (e.keep && ctx.canvas) {
    drawX = ctx.canvas.width - size + 18;
    drawY = ctx.canvas.height - size - 12;
  }

  // Default for normal enemies
  ctx.drawImage(
    img,
    frameFor(e, now) * FRAME,
    0,
    FRAME,
    FRAME,
    drawX,
    drawY,
    size,
    size,
  );

  return true;
}

// Armoured tank: 145x52 frames, drawn 1:1 so it fills the yellow box exactly.
export function drawTank(ctx, tank, now, destroyed = tank.hp <= 0) {
  const side = tank.lane === 0 ? "upper" : "lower";
  const img = tankImages[destroyed ? `${side}-destroyed` : side];
  if (!img) return false;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    frameFor(tank, now) * TANK_W,
    0,
    TANK_W,
    TANK_H,
    tank.x - 37,
    tank.y - 26,
    TANK_W,
    TANK_H,
  );
  return true;
}

export function drawTree(ctx, tower, x, baseY, size) {
  const img = treeImgs[tower.owner === 0 ? 1 : 2];
  const frame = tower.plant;
  if (!img || frame < 0 || frame >= img.width / TREE_FRAME) return false;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    frame * TREE_FRAME,
    0,
    TREE_FRAME,
    TREE_FRAME,
    x - size / 2,
    baseY - size,
    size,
    size,
  );
  return true;
}
