import { useState, useRef, useCallback } from "react";

const ALGOS = [
  { id: "astar", label: "A* Search", short: "A*", icon: "✦", color: "#2563eb" },
  { id: "dijkstra", label: "Dijkstra", short: "Dijkstra", icon: "◈", color: "#7c3aed" },
  { id: "bfs", label: "BFS", short: "BFS", icon: "◎", color: "#059669" },
  { id: "dfs", label: "DFS", short: "DFS", icon: "◇", color: "#d97706" },
];

const CELL_EMPTY = 0;
const CELL_WALL = 1;

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

function reconstructPath(node) {
  const path = [];
  let cur = node;
  while (cur) {
    path.unshift(cur);
    cur = cur.parent;
  }
  return path;
}

// ===================== FIXED ALGORITHMS =====================
function runAStar(grid, start, end, ROWS, COLS) {
  const steps = [];
  const g = grid.map(r => r.map(c => ({ ...c, parent: null, gv: Infinity, f: Infinity })));
  const s = g[start.row][start.col];
  const e = g[end.row][end.col];
  s.gv = 0; s.h = heuristic(s, e); s.f = s.gv + s.h;

  const open = [s];
  const closed = new Set();

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    const key = `${cur.row},${cur.col}`;
    if (closed.has(key)) continue;
    closed.add(key);

    if (cur.row === e.row && cur.col === e.col) {
      steps.push({ visited: [...closed].map(k => k.split(",").map(Number)), path: reconstructPath(cur).map(n => [n.row, n.col]) });
      return steps;
    }

    steps.push({ visited: [...closed].map(k => k.split(",").map(Number)), frontier: open.map(n => [n.row, n.col]), path: [] });

    for (const nb of getNeighbors(g, cur, ROWS, COLS)) {
      if (closed.has(`${nb.row},${nb.col}`)) continue;
      const ng = cur.gv + 1;
      if (ng < nb.gv) {
        nb.gv = ng;
        nb.h = heuristic(nb, e);
        nb.f = nb.gv + nb.h;
        nb.parent = cur;
        open.push(nb);
      }
    }
  }
  return steps; // No path found
}

function runBFS(grid, start, end, ROWS, COLS) {
  const steps = [];
  const g = grid.map(r => r.map(c => ({ ...c, parent: null })));
  const s = g[start.row][start.col];
  const e = g[end.row][end.col];
  const queue = [s];
  const visited = new Set([`${s.row},${s.col}`]);

  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.row === e.row && cur.col === e.col) {
      steps.push({ visited: [...visited].map(k => k.split(",").map(Number)), path: reconstructPath(cur).map(n => [n.row, n.col]) });
      return steps;
    }
    steps.push({ visited: [...visited].map(k => k.split(",").map(Number)), frontier: queue.map(n => [n.row, n.col]), path: [] });

    for (const nb of getNeighbors(g, cur, ROWS, COLS)) {
      const key = `${nb.row},${nb.col}`;
      if (!visited.has(key)) {
        visited.add(key);
        nb.parent = cur;
        queue.push(nb);
      }
    }
  }
  return steps;
}

function runDFS(grid, start, end, ROWS, COLS) {
  const steps = [];
  const g = grid.map(r => r.map(c => ({ ...c, parent: null })));
  const s = g[start.row][start.col];
  const e = g[end.row][end.col];
  const stack = [s];
  const visited = new Set();

  while (stack.length > 0) {
    const cur = stack.pop();
    const key = `${cur.row},${cur.col}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (cur.row === e.row && cur.col === e.col) {
      steps.push({ visited: [...visited].map(k => k.split(",").map(Number)), path: reconstructPath(cur).map(n => [n.row, n.col]) });
      return steps;
    }
    steps.push({ visited: [...visited].map(k => k.split(",").map(Number)), frontier: stack.map(n => [n.row, n.col]), path: [] });

    for (const nb of getNeighbors(g, cur, ROWS, COLS)) {
      if (!visited.has(`${nb.row},${nb.col}`)) {
        nb.parent = cur;
        stack.push(nb);
      }
    }
  }
  return steps;
}

function runDijkstra(grid, start, end, ROWS, COLS) {
  const steps = [];
  const g = grid.map(r => r.map(c => ({ ...c, parent: null, dist: Infinity })));
  const s = g[start.row][start.col];
  s.dist = 0;
  const e = g[end.row][end.col];
  const queue = [s];
  const visited = new Set();

  while (queue.length > 0) {
    queue.sort((a, b) => a.dist - b.dist);
    const cur = queue.shift();
    const key = `${cur.row},${cur.col}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (cur.row === e.row && cur.col === e.col) {
      steps.push({ visited: [...visited].map(k => k.split(",").map(Number)), path: reconstructPath(cur).map(n => [n.row, n.col]) });
      return steps;
    }
    steps.push({ visited: [...visited].map(k => k.split(",").map(Number)), frontier: queue.map(n => [n.row, n.col]), path: [] });

    for (const nb of getNeighbors(g, cur, ROWS, COLS)) {
      if (!visited.has(`${nb.row},${nb.col}`)) {
        const nd = cur.dist + 1;
        if (nd < nb.dist) {
          nb.dist = nd;
          nb.parent = cur;
          queue.push(nb);
        }
      }
    }
  }
  return steps;
}

function runAlgo(algo, grid, start, end, ROWS, COLS) {
  if (algo === "astar") return runAStar(grid, start, end, ROWS, COLS);
  if (algo === "bfs") return runBFS(grid, start, end, ROWS, COLS);
  if (algo === "dfs") return runDFS(grid, start, end, ROWS, COLS);
  if (algo === "dijkstra") return runDijkstra(grid, start, end, ROWS, COLS);
  return [];
}

function benchmarkAll(grid, start, end, ROWS, COLS) {
  return ALGOS.map(a => {
    const RUNS = 30;
    let totalTime = 0, steps = null;
    for (let i = 0; i < RUNS; i++) {
      const t0 = performance.now();
      steps = runAlgo(a.id, grid, start, end, ROWS, COLS);
      totalTime += performance.now() - t0;
    }
    const last = steps && steps.length ? steps[steps.length - 1] : null;
    return {
      id: a.id, label: a.label, short: a.short, color: a.color, icon: a.icon,
      time: totalTime / RUNS,
      visited: last ? last.visited.length : 0,
      pathLen: last && last.path.length ? last.path.length - 1 : 0,
      found: last && last.path.length > 0,
    };
  });
}

function findFirstEmptyCell(grid, ROWS, COLS) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].type === CELL_EMPTY) return { row: r, col: c };
    }
  }
  return { row: Math.floor(ROWS / 2), col: Math.floor(COLS / 2) };
}

// ===================== MAIN COMPONENT =====================
export default function PathfindingVisualizer() {
  const [ROWS, setROWS] = useState(55);
  const [COLS, setCOLS] = useState(95);
  const [grid, setGrid] = useState(() => createGrid(55, 95));
  const [startNode, setStartNode] = useState({ row: 25, col: 20 });
  const [endNode, setEndNode] = useState({ row: 40, col: 70 });
  const [algo, setAlgo] = useState("astar");
  const [mode, setMode] = useState("wall");
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [speed, setSpeed] = useState(22);
  const [visitedCells, setVisitedCells] = useState(new Set());
  const [frontierCells, setFrontierCells] = useState(new Set());
  const [pathCells, setPathCells] = useState(new Set());
  const [stats, setStats] = useState(null);
  const [benchmarks, setBenchmarks] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [showBenchPanel, setShowBenchPanel] = useState(false);
  const [threshold, setThreshold] = useState(118);

  const animRef = useRef(null);
  const fileInputRef = useRef(null);

  const cellTypeAt = useCallback((r, c) => {
    if (r === startNode.row && c === startNode.col) return "start";
    if (r === endNode.row && c === endNode.col) return "end";
    if (grid[r][c].type === CELL_WALL) return "wall";
    if (pathCells.has(`${r},${c}`)) return "path";
    if (visitedCells.has(`${r},${c}`)) return "visited";
    if (frontierCells.has(`${r},${c}`)) return "frontier";
    return "empty";
  }, [grid, startNode, endNode, visitedCells, frontierCells, pathCells]);

  function clearVisualization() {
    if (animRef.current) clearTimeout(animRef.current);
    setVisitedCells(new Set());
    setFrontierCells(new Set());
    setPathCells(new Set());
    setIsRunning(false);
    setIsDone(false);
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

  function visualize() {
    if (isRunning) return;
    clearVisualization();
    setIsRunning(true);

    const t0 = performance.now();
    const steps = runAlgo(algo, grid, startNode, endNode, ROWS, COLS);
    const algoTime = performance.now() - t0;

    if (!steps.length) {
      setIsRunning(false);
      setIsDone(true);
      setStats({ visited: 0, pathLen: 0, time: algoTime.toFixed(3) });
      return;
    }

    const last = steps[steps.length - 1];
    let i = 0;

    function animate() {
      if (i >= steps.length) {
        setVisitedCells(new Set(last.visited.map(([r,c]) => `${r},${c}`)));
        setFrontierCells(new Set());
        setPathCells(new Set(last.path.map(([r,c]) => `${r},${c}`)));
        setIsRunning(false);
        setIsDone(true);
        setStats({
          visited: last.visited.length,
          pathLen: last.path.length > 0 ? last.path.length - 1 : 0,
          time: algoTime.toFixed(3)
        });
        return;
      }

      const s = steps[i];
      setVisitedCells(new Set(s.visited.map(([r,c]) => `${r},${c}`)));
      setFrontierCells(new Set((s.frontier || []).map(([r,c]) => `${r},${c}`)));
      if (s.path && s.path.length) setPathCells(new Set(s.path.map(([r,c]) => `${r},${c}`)));

      i++;

      // ==================== IMPROVED SPEED CONTROL ====================
      let delay = 160 - (speed * 7);   // Main formula
      delay = Math.max(4, delay);      // Never go below 4ms
      // ============================================================

      animRef.current = setTimeout(animate, delay);
    }
    animate();
  }

  function runBenchmark() {
    setIsBenchmarking(true);
    setTimeout(() => {
      const results = benchmarkAll(grid, startNode, endNode, ROWS, COLS);
      results.sort((a, b) => a.time - b.time);
      setBenchmarks(results);
      setShowBenchPanel(true);
      setIsBenchmarking(false);
    }, 80);
  }

  function generateMaze() {
    clearVisualization();
    setBenchmarks(null);
    setShowBenchPanel(false);
    setGrid(() => {
      const next = createGrid(ROWS, COLS);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (Math.random() < 0.25 && !(r === startNode.row && c === startNode.col) && !(r === endNode.row && c === endNode.col)) {
            next[r][c].type = CELL_WALL;
          }
        }
      }
      return next;
    });
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
      canvas.width = newCols;
      canvas.height = newRows;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      ctx.drawImage(img, 0, 0, newCols, newRows);
      const imageData = ctx.getImageData(0, 0, newCols, newRows);
      const data = imageData.data;

      setGrid(() => {
        const newGrid = createGrid(newRows, newCols);
        for (let r = 0; r < newRows; r++) {
          for (let c = 0; c < newCols; c++) {
            const idx = (r * newCols + c) * 4;
            const brightness = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
            newGrid[r][c].type = brightness < threshold ? CELL_WALL : CELL_EMPTY;
          }
        }

        const newStart = findFirstEmptyCell(newGrid, newRows, newCols);
        let newEnd = findFirstEmptyCell(newGrid, newRows, newCols);

        setStartNode(newStart);
        setEndNode(newEnd);
        return newGrid;
      });

      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const fastest = benchmarks && benchmarks[0];
  const maxTime = benchmarks ? Math.max(...benchmarks.map(b => b.time)) : 1;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fc", fontFamily: "'Georgia', serif", color: "#1a1a2e", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700&display=swap');
        * { box-sizing: border-box; }
        .cell { transition: background 0.06s ease; }
        .btn-primary { transition: all 0.15s ease; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.25); }
        @keyframes slideIn { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
        .slide-in { animation: slideIn 0.3s ease forwards; }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        .pulsing { animation: pulse 1s ease infinite; display:inline-block; }
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
      </div>

      <div style={{ display:"flex", flex:"1", overflow:"hidden" }}>
        {/* Sidebar */}
        <div style={{ width:"260px", background:"#fff", borderRight:"1px solid #e8ecf5", padding:"20px 14px", display:"flex", flexDirection:"column", gap:"20px", overflowY:"auto" }}>
          {/* Algorithm */}
          <div>
            <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#94a3b8", marginBottom:"10px", textTransform:"uppercase" }}>Algorithm</div>
            {ALGOS.map(a => (
              <button key={a.id} onClick={() => {setAlgo(a.id); clearVisualization();}}
                style={{ background: algo === a.id ? `${a.color}10` : "transparent", border: algo === a.id ? `1.5px solid ${a.color}44` : "1.5px solid #e8ecf5", color: algo === a.id ? a.color : "#64748b", padding:"9px 12px", borderRadius:"8px", width:"100%", textAlign:"left", marginBottom:"4px" }}>
                <span style={{marginRight:"8px"}}>{a.icon}</span> {a.label}
              </button>
            ))}
          </div>

          {/* Draw Mode */}
          <div>
            <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#94a3b8", marginBottom:"10px", textTransform:"uppercase" }}>Draw Mode</div>
            {[
              { id:"wall", label:"Wall", icon:"▪", color:"#dc2626" },
              { id:"start", label:"Source Node", icon:"▶", color:"#16a34a" },
              { id:"end", label:"Target Node", icon:"◼", color:"#d97706" },
            ].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                style={{ background: mode === m.id ? `${m.color}10` : "transparent", border: mode === m.id ? `1.5px solid ${m.color}44` : "1.5px solid #e8ecf5", color: mode === m.id ? m.color : "#64748b", padding:"9px 12px", borderRadius:"8px", width:"100%", textAlign:"left", marginBottom:"4px" }}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {/* Wall Threshold */}
          <div>
            <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#94a3b8", marginBottom:"8px", textTransform:"uppercase" }}>Wall Threshold</div>
            <input type="range" min="80" max="200" value={threshold} onChange={e => setThreshold(+e.target.value)} style={{width:"100%"}} />
            <div style={{textAlign:"center", fontSize:"11px", color:"#64748b"}}>Value: {threshold}</div>
          </div>

          {/* Animation Speed */}
          <div>
            <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#94a3b8", marginBottom:"8px", textTransform:"uppercase" }}>Animation Speed</div>
            <input 
              type="range" 
              min="5" 
              max="25" 
              value={speed} 
              onChange={e => setSpeed(+e.target.value)} 
              style={{width:"100%", accentColor:"#2563eb"}} 
            />
            <div style={{textAlign:"center", fontSize:"11px", color:"#64748b"}}>
              {speed >= 22 ? "⚡ Ultra Fast" : speed >= 18 ? "Very Fast" : speed >= 14 ? "Fast" : "Normal"}
            </div>
          </div>
        </div>

        {/* Main Area */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ background:"#fff", borderBottom:"1px solid #e8ecf5", padding:"12px 20px", display:"flex", gap:"10px", flexWrap:"wrap" }}>
            <button onClick={visualize} disabled={isRunning} style={{ padding:"10px 22px", background:isRunning?"#e2e8f0":"linear-gradient(135deg,#2563eb,#3b82f6)", color:"#fff", border:"none", borderRadius:"8px", cursor:isRunning?"not-allowed":"pointer" }}>
              {isRunning ? <span className="pulsing">Running…</span> : "▶ Visualize"}
            </button>

            <button onClick={runBenchmark} disabled={isRunning||isBenchmarking} style={{ padding:"10px 20px", background:"#7c3aed", color:"#fff", border:"none", borderRadius:"8px" }}>
              ⏱ Benchmark All
            </button>

            <button onClick={clearVisualization} style={{ padding:"10px 16px", background:"transparent", border:"1.5px solid #e2e8f0", borderRadius:"8px" }}>Clear Path</button>
            <button onClick={clearAll} style={{ padding:"10px 16px", background:"transparent", border:"1.5px solid #e2e8f0", borderRadius:"8px" }}>Clear All</button>

            <button onClick={() => fileInputRef.current.click()} style={{ padding:"10px 16px", background:"transparent", border:"1.5px solid #e2e8f0", borderRadius:"8px" }}>
              📤 Upload Floor Plan
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          </div>

          {/* Grid */}
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", background:"#f8f9fc", overflow:"auto" }}>
            <div onMouseLeave={() => setIsDrawing(false)}
              style={{ 
                display:"grid", 
                gridTemplateColumns:`repeat(${COLS}, 1fr)`, 
                gap:"1px", 
                background:"#e2e8f0", 
                border:"3px solid #e2e8f0", 
                borderRadius:"12px", 
                padding:"4px" 
              }}>
              {grid.map((row, r) => row.map((_, c) => {
                const ct = cellTypeAt(r, c);
                const bg = ct === "start" ? "#16a34a" 
                         : ct === "end" ? "#d97706" 
                         : ct === "wall" ? "#1f2937" 
                         : ct === "path" ? "#2563eb" 
                         : ct === "visited" ? "#c4b5fd" 
                         : ct === "frontier" ? "#93c5fd" 
                         : "#ffffff";

                return (
                  <div 
                    key={`${r}-${c}`}
                    onMouseDown={() => { setIsDrawing(true); handleCellInteraction(r, c); }}
                    onMouseEnter={() => { if (isDrawing && mode === "wall") handleCellInteraction(r, c); }}
                    onMouseUp={() => setIsDrawing(false)}
                    style={{ width:"100%", aspectRatio:"1", background:bg, minWidth:"6px", minHeight:"6px" }}
                  />
                );
              }))}
            </div>
          </div>

          <div style={{ padding:"10px 20px", background:"#fff", borderTop:"1px solid #e8ecf5", fontSize:"11px", color:"#64748b" }}>
            Upload image → Adjust threshold → Place source/target → Visualize
          </div>
        </div>
      </div>
    </div>
  );
}