// ===================== PATHFINDING ALGORITHMS =====================
import { CELL_WALL } from "./constants.js";
import { ALGOS } from "./constants.js";

// ---- shared helpers ----
function heuristic(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function getNeighbors(g, node, ROWS, COLS) {
  return [[-1,0],[1,0],[0,-1],[0,1]]
    .map(([dr,dc]) => {
      const r = node.row + dr, c = node.col + dc;
      return (r >= 0 && r < ROWS && c >= 0 && c < COLS) ? g[r][c] : null;
    })
    .filter(n => n && n.type !== CELL_WALL);
}

function reconstructPath(cameFrom, endKey) {
  const path = [];
  let cur = endKey;
  while (cur) {
    const [r, c] = cur.split(",").map(Number);
    path.unshift([r, c]);
    cur = cameFrom.get(cur);
  }
  return path;
}

// Guard: returns true if a node is out-of-bounds or a wall
function isBlocked(grid, node, ROWS, COLS) {
  const { row: r, col: c } = node;
  return r < 0 || r >= ROWS || c < 0 || c >= COLS || grid[r][c].type === CELL_WALL;
}

// ---- A* (binary-search insertion into sorted open list for O(log n) insert) ----
export function runAStar(grid, start, end, ROWS, COLS) {
  if (isBlocked(grid, start, ROWS, COLS) || isBlocked(grid, end, ROWS, COLS)) return [];

  const steps = [];
  const g = grid.map(r => r.map(c => ({ ...c })));
  const gScore = new Map(), fScore = new Map(), cameFrom = new Map();
  const sk = `${start.row},${start.col}`, ek = `${end.row},${end.col}`;

  if (sk === ek) {
    steps.push({ visited: [[start.row, start.col]], path: [[start.row, start.col]] });
    return steps;
  }

  gScore.set(sk, 0);
  fScore.set(sk, heuristic(start, end));

  const open   = [sk];   // sorted ascending by fScore
  const inOpen = new Set([sk]);
  const closed = new Set();

  while (open.length > 0) {
    const curKey = open.shift();
    inOpen.delete(curKey);
    closed.add(curKey);

    if (curKey === ek) {
      steps.push({ visited: [...closed].map(k => k.split(",").map(Number)), path: reconstructPath(cameFrom, ek) });
      return steps;
    }

    steps.push({ visited: [...closed].map(k => k.split(",").map(Number)), frontier: [...open].map(k => k.split(",").map(Number)), path: [] });

    const [cr, cc] = curKey.split(",").map(Number);
    const curG = gScore.get(curKey) ?? Infinity;

    for (const nb of getNeighbors(g, g[cr][cc], ROWS, COLS)) {
      const nbKey = `${nb.row},${nb.col}`;
      if (closed.has(nbKey)) continue;
      const tentativeG = curG + 1;
      if (tentativeG < (gScore.get(nbKey) ?? Infinity)) {
        cameFrom.set(nbKey, curKey);
        gScore.set(nbKey, tentativeG);
        fScore.set(nbKey, tentativeG + heuristic(nb, end));
        if (!inOpen.has(nbKey)) {
          inOpen.add(nbKey);
          const f = fScore.get(nbKey);
          let lo = 0, hi = open.length;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if ((fScore.get(open[mid]) ?? Infinity) <= f) lo = mid + 1; else hi = mid;
          }
          open.splice(lo, 0, nbKey);
        }
      }
    }
  }
  return steps;
}

// ---- BFS ----
export function runBFS(grid, start, end, ROWS, COLS) {
  if (isBlocked(grid, start, ROWS, COLS) || isBlocked(grid, end, ROWS, COLS)) return [];

  const steps = [];
  const g = grid.map(r => r.map(c => ({ ...c })));
  const cameFrom = new Map();
  const sk = `${start.row},${start.col}`, ek = `${end.row},${end.col}`;

  if (sk === ek) {
    steps.push({ visited: [[start.row, start.col]], path: [[start.row, start.col]] });
    return steps;
  }

  const queue = [sk], visited = new Set([sk]);
  cameFrom.set(sk, null);

  while (queue.length > 0) {
    const curKey = queue.shift();
    if (curKey === ek) {
      steps.push({ visited: [...visited].map(k => k.split(",").map(Number)), path: reconstructPath(cameFrom, ek) });
      return steps;
    }
    steps.push({ visited: [...visited].map(k => k.split(",").map(Number)), frontier: [...queue].map(k => k.split(",").map(Number)), path: [] });

    const [cr, cc] = curKey.split(",").map(Number);
    for (const nb of getNeighbors(g, g[cr][cc], ROWS, COLS)) {
      const nbKey = `${nb.row},${nb.col}`;
      if (!visited.has(nbKey)) { visited.add(nbKey); cameFrom.set(nbKey, curKey); queue.push(nbKey); }
    }
  }
  return steps;
}

// ---- DFS (batched steps to keep steps array lean on large grids) ----
export function runDFS(grid, start, end, ROWS, COLS) {
  if (isBlocked(grid, start, ROWS, COLS) || isBlocked(grid, end, ROWS, COLS)) return [];

  const steps = [];
  const g = grid.map(r => r.map(c => ({ ...c })));
  const cameFrom = new Map();
  const sk = `${start.row},${start.col}`, ek = `${end.row},${end.col}`;

  if (sk === ek) {
    steps.push({ visited: [[start.row, start.col]], path: [[start.row, start.col]] });
    return steps;
  }

  const stack = [sk], visited = new Set();
  cameFrom.set(sk, null);
  const BATCH = 4;
  let iter = 0;

  while (stack.length > 0) {
    const curKey = stack.pop();
    if (visited.has(curKey)) continue;
    visited.add(curKey);

    if (curKey === ek) {
      steps.push({ visited: [...visited].map(k => k.split(",").map(Number)), path: reconstructPath(cameFrom, ek) });
      return steps;
    }

    if (iter % BATCH === 0) {
      steps.push({ visited: [...visited].map(k => k.split(",").map(Number)), frontier: [...stack].map(k => k.split(",").map(Number)), path: [] });
    }
    iter++;

    const [cr, cc] = curKey.split(",").map(Number);
    for (const nb of getNeighbors(g, g[cr][cc], ROWS, COLS)) {
      const nbKey = `${nb.row},${nb.col}`;
      if (!visited.has(nbKey)) {
        if (!cameFrom.has(nbKey)) cameFrom.set(nbKey, curKey);
        stack.push(nbKey);
      }
    }
  }
  return steps;
}

// ---- Dijkstra ----
export function runDijkstra(grid, start, end, ROWS, COLS) {
  if (isBlocked(grid, start, ROWS, COLS) || isBlocked(grid, end, ROWS, COLS)) return [];

  const steps = [];
  const g = grid.map(r => r.map(c => ({ ...c })));
  const dist = new Map(), cameFrom = new Map();
  const sk = `${start.row},${start.col}`, ek = `${end.row},${end.col}`;

  if (sk === ek) {
    steps.push({ visited: [[start.row, start.col]], path: [[start.row, start.col]] });
    return steps;
  }

  dist.set(sk, 0);
  cameFrom.set(sk, null);
  const queue = [sk], visited = new Set();

  while (queue.length > 0) {
    queue.sort((a, b) => (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity));
    const curKey = queue.shift();
    if (visited.has(curKey)) continue;
    visited.add(curKey);

    if (curKey === ek) {
      steps.push({ visited: [...visited].map(k => k.split(",").map(Number)), path: reconstructPath(cameFrom, ek) });
      return steps;
    }
    steps.push({ visited: [...visited].map(k => k.split(",").map(Number)), frontier: [...queue].map(k => k.split(",").map(Number)), path: [] });

    const [cr, cc] = curKey.split(",").map(Number);
    const curDist = dist.get(curKey) ?? Infinity;
    for (const nb of getNeighbors(g, g[cr][cc], ROWS, COLS)) {
      const nbKey = `${nb.row},${nb.col}`;
      if (!visited.has(nbKey)) {
        const nd = curDist + 1;
        if (nd < (dist.get(nbKey) ?? Infinity)) {
          dist.set(nbKey, nd); cameFrom.set(nbKey, curKey); queue.push(nbKey);
        }
      }
    }
  }
  return steps;
}

// ---- dispatcher ----
export function runAlgo(algo, grid, start, end, ROWS, COLS) {
  if (algo === "astar")    return runAStar(grid, start, end, ROWS, COLS);
  if (algo === "bfs")      return runBFS(grid, start, end, ROWS, COLS);
  if (algo === "dfs")      return runDFS(grid, start, end, ROWS, COLS);
  if (algo === "dijkstra") return runDijkstra(grid, start, end, ROWS, COLS);
  return [];
}

// ---- benchmark ----
export function benchmarkAll(grid, start, end, ROWS, COLS) {
  return ALGOS.map(a => {
    const RUNS = 20;
    let totalTime = 0, steps = null;
    for (let i = 0; i < RUNS; i++) {
      const t0 = performance.now();
      steps = runAlgo(a.id, grid, start, end, ROWS, COLS);
      totalTime += performance.now() - t0;
    }
    const last  = steps && steps.length ? steps[steps.length - 1] : null;
    const found = !!(last && last.path && last.path.length > 0);
    return {
      id:      a.id,
      label:   a.label,
      short:   a.short,
      color:   a.color,
      icon:    a.icon,
      time:    totalTime / RUNS,
      visited: last ? last.visited.length : 0,
      pathLen: found ? last.path.length - 1 : 0,
      found,
    };
  });
}