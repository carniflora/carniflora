export const MAP_COLS = 14;
export const MAP_ROWS = 10;

/* Add arrays for the paths for multiple levels here. All paths need 
to have the same end coordinates (where the tower will be) */
export const LEVEL_PATHS = [
  {
    name: "Level 1",
    goal: [13, 9],
    paths: [
      [
        [0, 0],
        [0, 2],
        [4, 2],
        [6, 2],
        [6, 4],
        [8, 4],
        [8, 8],
        [10, 8],
        [10, 9],
        [13, 9],
      ],
      [
        [0, 9],
        [0, 7],
        [2, 7],
        [2, 5],
        [4, 5],
        [7, 5],
        [7, 9],
        [13, 9],
      ],
    ],
  },
];

/* make array of cells from the designated corner points in LEVEL_PATHS */
export function makeCells(pathPoints) {
  const cells = []; // empty cell list

  // loop to go over each pair of corners given in LEVEL_PATHS
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const [c1, r1] = pathPoints[i];
    const [c2, r2] = pathPoints[i + 1];

    // if both the row and the column are different, we have a diagonal path (not allowed)
    if (c1 !== c2 && r1 !== r2) throw new Error("Diagonal segment " + i);

    // find whether to go left (-) or right (+)
    const col_direct = Math.sign(c2 - c1);
    // find whether to create path up (-) or down (+)
    const row_direct = Math.sign(r2 - r1);

    let c = c1,
      r = r1; // start of segment

    // push starting cell
    if (i == 0) cells.push({ c, r });

    // next segments start where the previous segment ended
    while (c !== c2 || r !== r2) {
      c += col_direct;
      r += row_direct;
      cells.push({ c, r }); // Add each cell that has been "stepped on to"
    }
  }
  return cells;
}

/* Get [x,y] position at given distance along path, blend position so minion doesn't teleport */
export function getPositionAtDistance(distanceAlongPath, cells, pathLength) {
  // ensure result lies on the path and doesn't go over
  const moreThanStart = Math.max(distanceAlongPath, 0);
  const boundedDistance = Math.min(moreThanStart, pathLength);

  // cell that the minion has most recently reached
  const currentCellIndex = Math.floor(boundedDistance);

  // if result is 0, on the current cell. Close to 1 is almost at next cell
  const fractionToNextCell = boundedDistance - currentCellIndex;

  const currentCell = cells[currentCellIndex];
  const nextCell = cells[currentCellIndex + 1] ?? currentCell; // if there is no next cell use currentCell

  // calculate the current coordinates, add 0.5 to reposition to center of the cell
  const x =
    currentCell.c + (nextCell.c - currentCell.c) * fractionToNextCell + 0.5;
  const y =
    currentCell.r + (nextCell.r - currentCell.r) * fractionToNextCell + 0.5;
  return [x, y];
}

/* build the path that was walked in makeCells */
export function buildPath(pathPoints) {
  const cells = makeCells(pathPoints);
  const pathLength = cells.length - 1;

  // blend path so a distance is all that is needed instead of coordinates
  const positionAtDistance = (distanceAlongPath) =>
    getPositionAtDistance(distanceAlongPath, cells, pathLength);

  return { cells, pathLength, positionAtDistance };
}

/* load the paths that were specified for each level */
export function loadLevel(index) {
  const def = LEVEL_PATHS[index];
  const paths = def.paths.map(buildPath);

  // create set with the path cells -- no duplicates
  const blockPath = new Set();
  for (const p of paths) {
    for (const { c, r } of p.cells) blockPath.add(c + "," + r);
  }

  return { index, name: def.name, goal: def.goal, paths, blockPath };
}
