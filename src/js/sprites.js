import { PLANTS } from "./plants.js";
const FRAME = 64,
  FRAMES = 16,
  FPS = 8;
const P2_COLOUR = "blue";
const ENEMY_SHEETS = {
  minion: ["rivet", "cog", "piston", "boiler"],
  keep: "works",
};
const TREE_FRAME = 96;
const images = {};
const enemyImages = {};
const treeImgs = {};

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
  console.log(img.src, p.owner, p.plant, p.k);

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
  ctx.drawImage(
    img,
    frameFor(e, now) * FRAME,
    0,
    FRAME,
    FRAME,
    e.x - size / 2,
    e.y - size / 2,
    size,
    size,
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
