let cached = null;

const $ = (id) => document.getElementById(id);

export function dom() {
  if (!cached) {
    const canvas = document.getElementById("c");
    cached = { $, canvas, ctx: canvas.getContext("2d") };
  }

  return cached;
}

export function resizeCanvas(width, height) {
  const { canvas } = dom();
  canvas.width = width;
  canvas.height = height;
}
