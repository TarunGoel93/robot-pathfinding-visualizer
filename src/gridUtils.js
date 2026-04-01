// ===================== GRID UTILITIES =====================
import { CELL_EMPTY, CELL_WALL } from "./constants.js";

export function createGrid(rows, cols) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({ type: CELL_EMPTY, row: r, col: c }))
  );
}

export function findFirstEmptyCell(grid, ROWS, COLS) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c].type === CELL_EMPTY) return { row: r, col: c };
  return { row: Math.floor(ROWS / 2), col: Math.floor(COLS / 2) };
}

// ===================== RECURSIVE BACKTRACKER MAZE =====================
export function generateRecursiveMaze(ROWS, COLS, startNode, endNode) {
  const next = createGrid(ROWS, COLS);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      next[r][c].type = CELL_WALL;

  const visited = new Set();
  function carve(r, c) {
    const key = `${r},${c}`;
    visited.add(key);
    next[r][c].type = CELL_EMPTY;
    const dirs = [[-2,0],[2,0],[0,-2],[0,2]].sort(() => Math.random() - 0.5);
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited.has(`${nr},${nc}`)) {
        next[r + dr/2][c + dc/2].type = CELL_EMPTY;
        carve(nr, nc);
      }
    }
  }

  carve(1, 1);

  // Ensure start and end are passable
  next[startNode.row][startNode.col].type = CELL_EMPTY;
  next[endNode.row][endNode.col].type = CELL_EMPTY;
  [[0,1],[1,0],[-1,0],[0,-1]].forEach(([dr,dc]) => {
    const r = startNode.row+dr, c = startNode.col+dc;
    if (r>=0&&r<ROWS&&c>=0&&c<COLS) next[r][c].type = CELL_EMPTY;
  });
  [[0,1],[1,0],[-1,0],[0,-1]].forEach(([dr,dc]) => {
    const r = endNode.row+dr, c = endNode.col+dc;
    if (r>=0&&r<ROWS&&c>=0&&c<COLS) next[r][c].type = CELL_EMPTY;
  });

  return next;
}