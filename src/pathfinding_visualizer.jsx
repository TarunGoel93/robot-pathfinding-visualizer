import { useState, useRef, useCallback } from "react";

const ALGOS = [
  { id: "astar",    label: "A* Search", short: "A*",       icon: "✦", color: "#2563eb" },
  { id: "dijkstra", label: "Dijkstra",  short: "Dijkstra", icon: "◈", color: "#7c3aed" },
  { id: "bfs",      label: "BFS",       short: "BFS",      icon: "◎", color: "#059669" },
  { id: "dfs",      label: "DFS",       short: "DFS",      icon: "◇", color: "#d97706" },
];

const CELL_EMPTY = 0;
const CELL_WALL  = 1;

function createGrid(rows, cols) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({ type: CELL_EMPTY, row: r, col: c }))
  );
}

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

// ===================== FIXED ALGORITHMS =====================

// A* — uses a proper cameFrom map to avoid duplicate-node parent bugs
function runAStar(grid, start, end, ROWS, COLS) {
  const steps = [];
  const g = grid.map(r => r.map(c => ({ ...c })));

  const gScore  = new Map();
  const fScore  = new Map();
  const cameFrom = new Map();

  const sk = `${start.row},${start.col}`;
  const ek = `${end.row},${end.col}`;

  gScore.set(sk, 0);
  fScore.set(sk, heuristic(start, end));

  const open = new Set([sk]);
  const closed = new Set();

  while (open.size > 0) {
    // pick lowest f
    let curKey = null;
    let bestF  = Infinity;
    for (const k of open) {
      const f = fScore.get(k) ?? Infinity;
      if (f < bestF) { bestF = f; curKey = k; }
    }

    open.delete(curKey);
    closed.add(curKey);

    if (curKey === ek) {
      const path = reconstructPath(cameFrom, ek);
      steps.push({ visited: [...closed].map(k => k.split(",").map(Number)), path });
      return steps;
    }

    steps.push({
      visited:  [...closed].map(k => k.split(",").map(Number)),
      frontier: [...open].map(k => k.split(",").map(Number)),
      path: []
    });

    const [cr, cc] = curKey.split(",").map(Number);
    const curNode  = g[cr][cc];
    const curG     = gScore.get(curKey) ?? Infinity;

    for (const nb of getNeighbors(g, curNode, ROWS, COLS)) {
      const nbKey = `${nb.row},${nb.col}`;
      if (closed.has(nbKey)) continue;
      const tentativeG = curG + 1;
      if (tentativeG < (gScore.get(nbKey) ?? Infinity)) {
        cameFrom.set(nbKey, curKey);
        gScore.set(nbKey, tentativeG);
        fScore.set(nbKey, tentativeG + heuristic(nb, end));
        open.add(nbKey);
      }
    }
  }
  return steps; // no path
}

// BFS — correct, unchanged
function runBFS(grid, start, end, ROWS, COLS) {
  const steps = [];
  const g = grid.map(r => r.map(c => ({ ...c })));
  const cameFrom = new Map();
  const sk = `${start.row},${start.col}`;
  const ek = `${end.row},${end.col}`;
  const queue   = [sk];
  const visited = new Set([sk]);
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
      if (!visited.has(nbKey)) {
        visited.add(nbKey);
        cameFrom.set(nbKey, curKey);
        queue.push(nbKey);
      }
    }
  }
  return steps;
}

// DFS — FIX: use explicit cameFrom map so that when the stack re-visits
// a node via a shorter stack path, parent isn't wrongly overwritten.
function runDFS(grid, start, end, ROWS, COLS) {
  const steps = [];
  const g = grid.map(r => r.map(c => ({ ...c })));
  const cameFrom = new Map();
  const sk = `${start.row},${start.col}`;
  const ek = `${end.row},${end.col}`;
  const stack   = [sk];
  const visited = new Set();
  cameFrom.set(sk, null);

  while (stack.length > 0) {
    const curKey = stack.pop();
    if (visited.has(curKey)) continue;
    visited.add(curKey);

    if (curKey === ek) {
      steps.push({ visited: [...visited].map(k => k.split(",").map(Number)), path: reconstructPath(cameFrom, ek) });
      return steps;
    }
    steps.push({ visited: [...visited].map(k => k.split(",").map(Number)), frontier: [...stack].map(k => k.split(",").map(Number)), path: [] });

    const [cr, cc] = curKey.split(",").map(Number);
    for (const nb of getNeighbors(g, g[cr][cc], ROWS, COLS)) {
      const nbKey = `${nb.row},${nb.col}`;
      if (!visited.has(nbKey)) {
        // Only set cameFrom if not yet set (preserve first discovery path)
        if (!cameFrom.has(nbKey)) cameFrom.set(nbKey, curKey);
        stack.push(nbKey);
      }
    }
  }
  return steps;
}

// Dijkstra — correct, uses cameFrom map for consistency
function runDijkstra(grid, start, end, ROWS, COLS) {
  const steps = [];
  const g = grid.map(r => r.map(c => ({ ...c })));
  const dist     = new Map();
  const cameFrom = new Map();
  const sk = `${start.row},${start.col}`;
  const ek = `${end.row},${end.col}`;
  dist.set(sk, 0);
  cameFrom.set(sk, null);

  const queue   = [sk];
  const visited = new Set();

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
    const curDist  = dist.get(curKey) ?? Infinity;
    for (const nb of getNeighbors(g, g[cr][cc], ROWS, COLS)) {
      const nbKey = `${nb.row},${nb.col}`;
      if (!visited.has(nbKey)) {
        const nd = curDist + 1;
        if (nd < (dist.get(nbKey) ?? Infinity)) {
          dist.set(nbKey, nd);
          cameFrom.set(nbKey, curKey);
          queue.push(nbKey);
        }
      }
    }
  }
  return steps;
}

function runAlgo(algo, grid, start, end, ROWS, COLS) {
  if (algo === "astar")    return runAStar(grid, start, end, ROWS, COLS);
  if (algo === "bfs")      return runBFS(grid, start, end, ROWS, COLS);
  if (algo === "dfs")      return runDFS(grid, start, end, ROWS, COLS);
  if (algo === "dijkstra") return runDijkstra(grid, start, end, ROWS, COLS);
  return [];
}

// FIX: Benchmark returns time in ms and correctly marks found/not-found
function benchmarkAll(grid, start, end, ROWS, COLS) {
  return ALGOS.map(a => {
    const RUNS = 20;
    let totalTime = 0;
    let steps = null;
    for (let i = 0; i < RUNS; i++) {
      const t0 = performance.now();
      steps = runAlgo(a.id, grid, start, end, ROWS, COLS);
      totalTime += performance.now() - t0;
    }
    const last   = steps && steps.length ? steps[steps.length - 1] : null;
    const found  = !!(last && last.path && last.path.length > 0);
    return {
      id:      a.id,
      label:   a.label,
      short:   a.short,
      color:   a.color,
      icon:    a.icon,
      time:    totalTime / RUNS,         // avg ms
      visited: last ? last.visited.length : 0,
      pathLen: found ? last.path.length - 1 : 0,
      found,
    };
  });
}

function findFirstEmptyCell(grid, ROWS, COLS) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c].type === CELL_EMPTY) return { row: r, col: c };
  return { row: Math.floor(ROWS / 2), col: Math.floor(COLS / 2) };
}

// ===================== RECURSIVE BACKTRACKER MAZE =====================
function generateRecursiveMaze(ROWS, COLS, startNode, endNode) {
  // Start with all walls, carve passages via recursive backtracker
  const next = createGrid(ROWS, COLS);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      next[r][c].type = CELL_WALL;

  // Work on odd cells only (so walls separate cells properly)
  const visited = new Set();
  function carve(r, c) {
    const key = `${r},${c}`;
    visited.add(key);
    next[r][c].type = CELL_EMPTY;
    const dirs = [[-2,0],[2,0],[0,-2],[0,2]].sort(() => Math.random() - 0.5);
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited.has(`${nr},${nc}`)) {
        next[r + dr/2][c + dc/2].type = CELL_EMPTY; // remove wall between
        carve(nr, nc);
      }
    }
  }

  // Start from odd cell closest to (1,1)
  const sr = ROWS % 2 === 0 ? 1 : 1;
  const sc = COLS % 2 === 0 ? 1 : 1;
  carve(sr, sc);

  // Ensure start and end are passable
  next[startNode.row][startNode.col].type = CELL_EMPTY;
  next[endNode.row][endNode.col].type = CELL_EMPTY;
  // Also clear immediate neighbors so they're reachable
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

// ===================== MAIN COMPONENT =====================
export default function PathfindingVisualizer() {
  const [ROWS, setROWS] = useState(55);
  const [COLS, setCOLS] = useState(95);
  const [grid, setGrid] = useState(() => createGrid(55, 95));
  const [startNode, setStartNode] = useState({ row: 10, col: 10 });
  const [endNode,   setEndNode]   = useState({ row: 44, col: 84 });
  const [algo, setAlgo] = useState("astar");
  const [mode, setMode] = useState("wall");
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(18);
  const [visitedCells, setVisitedCells] = useState(new Set());
  const [frontierCells, setFrontierCells] = useState(new Set());
  const [pathCells, setPathCells] = useState(new Set());
  const [stats, setStats] = useState(null);           // { visited, pathLen, time, found }
  const [benchmarks, setBenchmarks] = useState(null);
  const [showBenchPanel, setShowBenchPanel] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [threshold, setThreshold] = useState(118);

  const animRef  = useRef(null);
  const fileInputRef = useRef(null);

  const cellTypeAt = useCallback((r, c) => {
    if (r === startNode.row && c === startNode.col) return "start";
    if (r === endNode.row   && c === endNode.col)   return "end";
    if (grid[r][c].type === CELL_WALL)              return "wall";
    if (pathCells.has(`${r},${c}`))                 return "path";
    if (visitedCells.has(`${r},${c}`))              return "visited";
    if (frontierCells.has(`${r},${c}`))             return "frontier";
    return "empty";
  }, [grid, startNode, endNode, visitedCells, frontierCells, pathCells]);

  function clearVisualization() {
    if (animRef.current) clearTimeout(animRef.current);
    setVisitedCells(new Set());
    setFrontierCells(new Set());
    setPathCells(new Set());
    setIsRunning(false);
    setStats(null);
  }

  function clearAll() {
    clearVisualization();
    setGrid(createGrid(ROWS, COLS));
    setBenchmarks(null);
    setShowBenchPanel(false);
  }

  function handleCellInteraction(r, c) {
    if (isRunning) return;
    clearVisualization();
    if (mode === "start") setStartNode({ row: r, col: c });
    else if (mode === "end") setEndNode({ row: r, col: c });
    else {
      setGrid(prev => {
        const n = prev.map(row => row.map(cell => ({ ...cell })));
        n[r][c].type = n[r][c].type === CELL_WALL ? CELL_EMPTY : CELL_WALL;
        return n;
      });
    }
  }

  // FIX: Speed mapping — speed 1→slow (120ms), 25→instant (0ms batch)
  // At speed >= 24 we batch-render (no animation, just final state)
  function getDelay(spd) {
    if (spd >= 24) return -1;  // -1 = instant / no animation
    return Math.max(0, 120 - spd * 5);
  }

  function visualize() {
    if (isRunning) return;
    clearVisualization();
    setIsRunning(true);

    const t0 = performance.now();
    const steps = runAlgo(algo, grid, startNode, endNode, ROWS, COLS);
    const algoTime = performance.now() - t0;

    if (!steps.length) {
      setIsRunning(false);
      setStats({ visited: 0, pathLen: 0, time: algoTime.toFixed(3), found: false });
      return;
    }

    const last  = steps[steps.length - 1];
    const found = !!(last.path && last.path.length > 0);

    const delay = getDelay(speed);

    // Instant mode — skip animation
    if (delay < 0) {
      setVisitedCells(new Set(last.visited.map(([r,c]) => `${r},${c}`)));
      setFrontierCells(new Set());
      setPathCells(new Set((last.path || []).map(([r,c]) => `${r},${c}`)));
      setIsRunning(false);
      setStats({ visited: last.visited.length, pathLen: found ? last.path.length - 1 : 0, time: algoTime.toFixed(3), found });
      return;
    }

    let i = 0;
    function animate() {
      if (i >= steps.length) {
        setVisitedCells(new Set(last.visited.map(([r,c]) => `${r},${c}`)));
        setFrontierCells(new Set());
        setPathCells(new Set((last.path || []).map(([r,c]) => `${r},${c}`)));
        setIsRunning(false);
        setStats({ visited: last.visited.length, pathLen: found ? last.path.length - 1 : 0, time: algoTime.toFixed(3), found });
        return;
      }
      const s = steps[i];
      setVisitedCells(new Set(s.visited.map(([r,c]) => `${r},${c}`)));
      setFrontierCells(new Set((s.frontier || []).map(([r,c]) => `${r},${c}`)));
      if (s.path && s.path.length) setPathCells(new Set(s.path.map(([r,c]) => `${r},${c}`)));
      i++;
      animRef.current = setTimeout(animate, delay);
    }
    animate();
  }

  // FIX: Benchmark — runs synchronously inside setTimeout so UI can re-render,
  // then shows results panel which is now actually rendered below.
  function runBenchmark() {
    if (isRunning || isBenchmarking) return;
    setIsBenchmarking(true);
    setBenchmarks(null);
    setShowBenchPanel(false);
    setTimeout(() => {
      const results = benchmarkAll(grid, startNode, endNode, ROWS, COLS);
      results.sort((a, b) => a.time - b.time);
      setBenchmarks(results);
      setShowBenchPanel(true);
      setIsBenchmarking(false);
    }, 60);
  }

  // FIX: Random maze uses recursive backtracker
  function handleGenerateMaze() {
    if (isRunning) return;
    clearVisualization();
    setBenchmarks(null);
    setShowBenchPanel(false);
    const maze = generateRecursiveMaze(ROWS, COLS, startNode, endNode);
    setGrid(maze);
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    clearVisualization();
    setBenchmarks(null);
    setShowBenchPanel(false);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const aspect = img.height / img.width;
      const newCols = 100;
      const newRows = Math.max(50, Math.round(newCols * aspect));
      setCOLS(newCols);
      setROWS(newRows);
      const canvas = document.createElement("canvas");
      canvas.width  = newCols;
      canvas.height = newRows;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, newCols, newRows);
      const imageData = ctx.getImageData(0, 0, newCols, newRows);
      const data = imageData.data;
      setGrid(() => {
        const newGrid = createGrid(newRows, newCols);
        for (let r = 0; r < newRows; r++)
          for (let c = 0; c < newCols; c++) {
            const idx = (r * newCols + c) * 4;
            const brightness = data[idx]*0.299 + data[idx+1]*0.587 + data[idx+2]*0.114;
            newGrid[r][c].type = brightness < threshold ? CELL_WALL : CELL_EMPTY;
          }
        const newStart = findFirstEmptyCell(newGrid, newRows, newCols);
        setStartNode(newStart);
        setEndNode(findFirstEmptyCell(newGrid, newRows, newCols));
        return newGrid;
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const currentAlgo = ALGOS.find(a => a.id === algo);
  const maxBenchTime = benchmarks ? Math.max(...benchmarks.map(b => b.time), 0.001) : 1;

  // Speed label
  const speedLabel = speed >= 24 ? "⚡ Instant" : speed >= 20 ? "Very Fast" : speed >= 14 ? "Fast" : speed >= 8 ? "Normal" : "Slow";

  return (
    <div style={{ minHeight:"100vh", background:"#f8f9fc", fontFamily:"'Georgia',serif", color:"#1a1a2e", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700&display=swap');
        * { box-sizing: border-box; }
        .cell { transition: background 0.05s ease; }
        .btn-primary { transition: all 0.15s ease; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.25); }
        .btn-act { cursor:pointer; transition: all 0.12s; }
        .btn-act:hover:not(:disabled) { opacity:0.88; transform:translateY(-1px); }
        @keyframes slideIn { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
        .slide-in { animation: slideIn 0.3s ease forwards; }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        .pulsing { animation: pulse 1s ease infinite; display:inline-block; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.35s ease forwards; }
      `}</style>

      {/* Header */}
      <div style={{ background:"#fff", borderBottom:"2px solid #e8ecf5", padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"12px", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <div style={{ width:"40px", height:"40px", background:"linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:"20px" }}>◈</div>
          <div>
            <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#94a3b8", fontFamily:"'DM Mono',monospace", textTransform:"uppercase" }}>UNIVERSITY PROJECT · ROBOTICS</div>
            <div style={{ fontSize:"20px", fontWeight:"700", fontFamily:"'Playfair Display',serif", color:"#1e3a8a" }}>Pathfinding Visualizer</div>
          </div>
        </div>
        {/* Stats badge — FIX: shows time prominently */}
        {stats && (
          <div className="fade-up" style={{ display:"flex", gap:"12px", flexWrap:"wrap" }}>
            <StatBadge label="Status"   value={stats.found ? "✓ Found" : "✗ No Path"} color={stats.found ? "#059669" : "#dc2626"} />
            <StatBadge label="Time"     value={`${stats.time} ms`}          color={currentAlgo?.color ?? "#2563eb"} />
            <StatBadge label="Visited"  value={stats.visited.toLocaleString()} color="#7c3aed" />
            <StatBadge label="Path Len" value={stats.found ? stats.pathLen : "—"} color="#d97706" />
          </div>
        )}
      </div>

      <div style={{ display:"flex", flex:"1", overflow:"hidden" }}>
        {/* Sidebar */}
        <div style={{ width:"260px", background:"#fff", borderRight:"1px solid #e8ecf5", padding:"20px 14px", display:"flex", flexDirection:"column", gap:"20px", overflowY:"auto" }}>
          
          {/* Algorithm selector */}
          <SectionLabel>Algorithm</SectionLabel>
          {ALGOS.map(a => (
            <button key={a.id} className="btn-act" onClick={() => { setAlgo(a.id); clearVisualization(); }}
              style={{ background: algo===a.id ? `${a.color}12` : "transparent", border: algo===a.id ? `1.5px solid ${a.color}55` : "1.5px solid #e8ecf5", color: algo===a.id ? a.color : "#64748b", padding:"9px 12px", borderRadius:"8px", width:"100%", textAlign:"left", marginBottom:"4px", fontFamily:"inherit", fontSize:"13px" }}>
              <span style={{marginRight:"8px"}}>{a.icon}</span>{a.label}
            </button>
          ))}

          {/* Draw mode */}
          <div>
            <SectionLabel>Draw Mode</SectionLabel>
            {[
              { id:"wall",  label:"Wall",        icon:"▪", color:"#dc2626" },
              { id:"start", label:"Source Node", icon:"▶", color:"#16a34a" },
              { id:"end",   label:"Target Node", icon:"◼", color:"#d97706" },
            ].map(m => (
              <button key={m.id} className="btn-act" onClick={() => setMode(m.id)}
                style={{ background: mode===m.id ? `${m.color}12` : "transparent", border: mode===m.id ? `1.5px solid ${m.color}55` : "1.5px solid #e8ecf5", color: mode===m.id ? m.color : "#64748b", padding:"9px 12px", borderRadius:"8px", width:"100%", textAlign:"left", marginBottom:"4px", fontFamily:"inherit", fontSize:"13px" }}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {/* Wall Threshold */}
          <div>
            <SectionLabel>Wall Threshold (image)</SectionLabel>
            <input type="range" min="80" max="200" value={threshold} onChange={e => setThreshold(+e.target.value)} style={{width:"100%"}} />
            <div style={{textAlign:"center", fontSize:"11px", color:"#64748b"}}>Value: {threshold}</div>
          </div>

          {/* Animation Speed — FIX: extended range with Instant mode */}
          <div>
            <SectionLabel>Animation Speed</SectionLabel>
            <input type="range" min="1" max="25" value={speed} onChange={e => setSpeed(+e.target.value)} style={{width:"100%", accentColor:"#2563eb"}} />
            <div style={{textAlign:"center", fontSize:"11px", color: speed >= 24 ? "#2563eb" : "#64748b", fontWeight: speed>=24?"600":"400"}}>
              {speedLabel}
            </div>
          </div>

          {/* Legend */}
          <div>
            <SectionLabel>Legend</SectionLabel>
            {[
              ["#16a34a","Source"],
              ["#d97706","Target"],
              ["#1f2937","Wall"],
              ["#c4b5fd","Visited"],
              ["#93c5fd","Frontier"],
              ["#2563eb","Path"],
            ].map(([color, label]) => (
              <div key={label} style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px",fontSize:"12px",color:"#64748b"}}>
                <div style={{width:"14px",height:"14px",borderRadius:"3px",background:color,flexShrink:0}} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Main area */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          
          {/* Toolbar */}
          <div style={{ background:"#fff", borderBottom:"1px solid #e8ecf5", padding:"12px 20px", display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center" }}>
            <button className="btn-act" onClick={visualize} disabled={isRunning}
              style={{ padding:"10px 22px", background:isRunning?"#e2e8f0":"linear-gradient(135deg,#2563eb,#3b82f6)", color: isRunning?"#94a3b8":"#fff", border:"none", borderRadius:"8px", cursor:isRunning?"not-allowed":"pointer", fontFamily:"inherit", fontSize:"13px", fontWeight:"600" }}>
              {isRunning ? <span className="pulsing">Running…</span> : "▶ Visualize"}
            </button>

            <button className="btn-act" onClick={runBenchmark} disabled={isRunning || isBenchmarking}
              style={{ padding:"10px 20px", background: (isRunning||isBenchmarking) ? "#e2e8f0" : "#7c3aed", color:(isRunning||isBenchmarking)?"#94a3b8":"#fff", border:"none", borderRadius:"8px", cursor:(isRunning||isBenchmarking)?"not-allowed":"pointer", fontFamily:"inherit", fontSize:"13px", fontWeight:"600" }}>
              {isBenchmarking ? <span className="pulsing">Benchmarking…</span> : "⏱ Benchmark All"}
            </button>

            {/* FIX: Random Maze button wired to generateMaze */}
            <button className="btn-act" onClick={handleGenerateMaze} disabled={isRunning}
              style={{ padding:"10px 16px", background: isRunning?"#f1f5f9":"linear-gradient(135deg,#0f766e,#059669)", color:isRunning?"#94a3b8":"#fff", border:"none", borderRadius:"8px", cursor:isRunning?"not-allowed":"pointer", fontFamily:"inherit", fontSize:"13px", fontWeight:"600" }}>
              🌀 Random Maze
            </button>

            <button className="btn-act" onClick={clearVisualization}
              style={{ padding:"10px 16px", background:"transparent", border:"1.5px solid #e2e8f0", borderRadius:"8px", color:"#475569", fontFamily:"inherit", fontSize:"13px", cursor:"pointer" }}>
              Clear Path
            </button>

            <button className="btn-act" onClick={clearAll}
              style={{ padding:"10px 16px", background:"transparent", border:"1.5px solid #e2e8f0", borderRadius:"8px", color:"#475569", fontFamily:"inherit", fontSize:"13px", cursor:"pointer" }}>
              Clear All
            </button>

            <button className="btn-act" onClick={() => fileInputRef.current.click()}
              style={{ padding:"10px 16px", background:"transparent", border:"1.5px solid #e2e8f0", borderRadius:"8px", color:"#475569", fontFamily:"inherit", fontSize:"13px", cursor:"pointer" }}>
              📤 Upload Floor Plan
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{display:"none"}} />
          </div>

          {/* FIX: Benchmark panel — now actually rendered when showBenchPanel is true */}
          {showBenchPanel && benchmarks && (
            <div className="fade-up" style={{ background:"#fff", borderBottom:"1px solid #e8ecf5", padding:"16px 20px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
                <div style={{ fontSize:"11px", letterSpacing:"2px", color:"#94a3b8", fontFamily:"'DM Mono',monospace", textTransform:"uppercase" }}>
                  Benchmark Results — {ROWS}×{COLS} grid · 20 runs avg
                </div>
                <button onClick={() => setShowBenchPanel(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:"16px" }}>✕</button>
              </div>
              <div style={{ display:"flex", gap:"12px", flexWrap:"wrap" }}>
                {benchmarks.map((b, i) => (
                  <div key={b.id} className="slide-in" style={{ flex:"1", minWidth:"140px", background: i===0?"#f0fdf4":"#f8f9fc", border: i===0?"1.5px solid #86efac":"1.5px solid #e8ecf5", borderRadius:"10px", padding:"12px 14px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"8px" }}>
                      <span style={{ fontSize:"16px" }}>{b.icon}</span>
                      <span style={{ fontWeight:"700", color:b.color, fontSize:"13px" }}>{b.label}</span>
                      {i===0 && <span style={{ marginLeft:"auto", fontSize:"10px", background:"#22c55e", color:"#fff", borderRadius:"4px", padding:"1px 6px" }}>FASTEST</span>}
                    </div>
                    {/* FIX: Time displayed clearly */}
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"20px", fontWeight:"700", color:b.color, marginBottom:"4px" }}>
                      {b.time < 1 ? `${(b.time*1000).toFixed(1)}µs` : `${b.time.toFixed(3)}ms`}
                    </div>
                    {/* Progress bar */}
                    <div style={{ background:"#e2e8f0", borderRadius:"4px", height:"4px", marginBottom:"8px" }}>
                      <div style={{ width:`${(b.time/maxBenchTime)*100}%`, height:"100%", background:b.color, borderRadius:"4px", transition:"width 0.6s ease" }} />
                    </div>
                    <div style={{ fontSize:"11px", color:"#64748b", display:"flex", flexDirection:"column", gap:"2px" }}>
                      <span>Visited: <b style={{color:"#374151"}}>{b.visited.toLocaleString()}</b></span>
                      <span>Path: <b style={{color:"#374151"}}>{b.found ? `${b.pathLen} steps` : "no path"}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid */}
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px", background:"#f8f9fc", overflow:"auto" }}>
            <div
              onMouseLeave={() => setIsDrawing(false)}
              style={{
                display:"grid",
                gridTemplateColumns:`repeat(${COLS}, 1fr)`,
                gap:"1px",
                background:"#d1d5db",
                border:"3px solid #d1d5db",
                borderRadius:"10px",
                padding:"3px",
                userSelect:"none",
              }}>
              {grid.map((row, r) => row.map((_, c) => {
                const ct = cellTypeAt(r, c);
                const bg = ct==="start"    ? "#16a34a"
                         : ct==="end"      ? "#d97706"
                         : ct==="wall"     ? "#1f2937"
                         : ct==="path"     ? "#2563eb"
                         : ct==="visited"  ? "#c4b5fd"
                         : ct==="frontier" ? "#93c5fd"
                         : "#ffffff";
                return (
                  <div
                    key={`${r}-${c}`}
                    className="cell"
                    onMouseDown={() => { setIsDrawing(true); handleCellInteraction(r, c); }}
                    onMouseEnter={() => { if (isDrawing && mode==="wall") handleCellInteraction(r, c); }}
                    onMouseUp={() => setIsDrawing(false)}
                    style={{ width:"100%", aspectRatio:"1", background:bg, minWidth:"5px", minHeight:"5px" }}
                  />
                );
              }))}
            </div>
          </div>

          <div style={{ padding:"8px 20px", background:"#fff", borderTop:"1px solid #e8ecf5", fontSize:"11px", color:"#94a3b8", display:"flex", gap:"16px", flexWrap:"wrap" }}>
            <span>Draw walls by clicking/dragging · Place source/target via Draw Mode</span>
            <span>Upload image → adjust threshold → run</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- tiny helpers ----
function SectionLabel({ children }) {
  return (
    <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#94a3b8", marginBottom:"8px", marginTop:"2px", textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>
      {children}
    </div>
  );
}

function StatBadge({ label, value, color }) {
  return (
    <div style={{ background:`${color}0e`, border:`1px solid ${color}33`, borderRadius:"8px", padding:"6px 12px", textAlign:"center", minWidth:"80px" }}>
      <div style={{ fontSize:"9px", color:"#94a3b8", letterSpacing:"1px", textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>{label}</div>
      <div style={{ fontSize:"14px", fontWeight:"700", color, fontFamily:"'DM Mono',monospace" }}>{value}</div>
    </div>
  );
}