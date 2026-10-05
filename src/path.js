export const PATH = [
  [-20, 110],
  [220, 110],
  [220, 400],
  [480, 400],
  [480, 140],
  [740, 140],
  [740, 420],
  [870, 420],
];

const SEG = [];
let total = 0;
for (let i = 1; i < PATH.length; i++) {
  const len = Math.hypot(
    PATH[i][0] - PATH[i - 1][0],
    PATH[i][1] - PATH[i - 1][1],
  );
  SEG.push(len);
  total += len;
}
export const TOTAL = total;

/** Position [x, y] at distance s along the path (clamped to the path end). */
export function at(s) {
  let d = Math.min(Math.max(s, 0), TOTAL);
  for (let i = 0; i < SEG.length; i++) {
    if (d <= SEG[i]) {
      const t = d / SEG[i];
      return [
        PATH[i][0] + (PATH[i + 1][0] - PATH[i][0]) * t,
        PATH[i][1] + (PATH[i + 1][1] - PATH[i][1]) * t,
      ];
    }
    d -= SEG[i];
  }
  return PATH[PATH.length - 1];
}
