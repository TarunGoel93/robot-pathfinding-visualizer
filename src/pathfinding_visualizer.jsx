import { useState, useRef, useCallback } from "react";

const ROWS = 20;
const COLS = 35;
const CELL_EMPTY = 0;
const CELL_WALL = 1;

const ALGOS = [
  { id: "astar", label: "A* Search", short: "A*", icon: "✦", color: "#2563eb" },
  { id: "dijkstra", label: "Dijkstra", short: "Dijkstra", icon: "◈", color: "#7c3aed" },
  { id: "bfs", label: "BFS", short: "BFS", icon: "◎", color: "#059669" },
  { id: "dfs", label: "DFS", short: "DFS", icon: "◇", color: "#d97706" },
];

function createGrid() {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => ({ type: CELL_EMPTY, row: r, col: c }))
  );
}

function heuristic(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function getNeighbors(g, node) {
  return [[-1,0],[1,0],[0,-1],[0,1]]
    .map(([dr,dc]) => { const r=node.row+dr, c=node.col+dc; return (r>=0&&r<ROWS&&c>=0&&c<COLS)?g[r][c]:null; })
    .filter(n => n && n.type !== CELL_WALL);
}

function reconstructPath(node) {
  const path=[]; let cur=node; while(cur){path.unshift(cur);cur=cur.parent;} return path;
}

function runAStar(grid, start, end) {
  const steps=[], g=grid.map(r=>r.map(c=>({...c,parent:null,gv:Infinity,f:Infinity})));
  const s=g[start.row][start.col], e=g[end.row][end.col];
  s.gv=0; s.h=heuristic(s,e); s.f=s.h;
  const open=[s], closed=new Set();
  while(open.length){
    open.sort((a,b)=>a.f-b.f);
    const cur=open.shift();
    if(closed.has(`${cur.row},${cur.col}`)) continue;
    closed.add(`${cur.row},${cur.col}`);
    if(cur.row===e.row&&cur.col===e.col){steps.push({visited:[...closed].map(k=>k.split(",").map(Number)),path:reconstructPath(cur).map(n=>[n.row,n.col])});return steps;}
    steps.push({visited:[...closed].map(k=>k.split(",").map(Number)),frontier:open.map(n=>[n.row,n.col]),path:[]});
    for(const nb of getNeighbors(g,cur)){
      if(closed.has(`${nb.row},${nb.col}`)) continue;
      const ng=cur.gv+1;
      if(ng<nb.gv){nb.gv=ng;nb.h=heuristic(nb,e);nb.f=nb.gv+nb.h;nb.parent=cur;open.push(nb);}
    }
  }
  return steps;
}

function runBFS(grid, start, end) {
  const steps=[], g=grid.map(r=>r.map(c=>({...c,parent:null})));
  const s=g[start.row][start.col], e=g[end.row][end.col];
  const queue=[s], visited=new Set([`${s.row},${s.col}`]);
  while(queue.length){
    const cur=queue.shift();
    if(cur.row===e.row&&cur.col===e.col){steps.push({visited:[...visited].map(k=>k.split(",").map(Number)),path:reconstructPath(cur).map(n=>[n.row,n.col])});return steps;}
    steps.push({visited:[...visited].map(k=>k.split(",").map(Number)),frontier:queue.map(n=>[n.row,n.col]),path:[]});
    for(const nb of getNeighbors(g,cur)){const key=`${nb.row},${nb.col}`;if(!visited.has(key)){visited.add(key);nb.parent=cur;queue.push(nb);}}
  }
  return steps;
}

function runDFS(grid, start, end) {
  const steps=[], g=grid.map(r=>r.map(c=>({...c,parent:null})));
  const s=g[start.row][start.col], e=g[end.row][end.col];
  const stack=[s], visited=new Set();
  while(stack.length){
    const cur=stack.pop(); const key=`${cur.row},${cur.col}`;
    if(visited.has(key)) continue; visited.add(key);
    if(cur.row===e.row&&cur.col===e.col){steps.push({visited:[...visited].map(k=>k.split(",").map(Number)),path:reconstructPath(cur).map(n=>[n.row,n.col])});return steps;}
    steps.push({visited:[...visited].map(k=>k.split(",").map(Number)),frontier:stack.map(n=>[n.row,n.col]),path:[]});
    for(const nb of getNeighbors(g,cur)){if(!visited.has(`${nb.row},${nb.col}`)){nb.parent=cur;stack.push(nb);}}
  }
  return steps;
}

function runDijkstra(grid, start, end) {
  const steps=[], g=grid.map(r=>r.map(c=>({...c,parent:null,dist:Infinity})));
  const s=g[start.row][start.col]; s.dist=0;
  const e=g[end.row][end.col];
  const queue=[s], visited=new Set();
  while(queue.length){
    queue.sort((a,b)=>a.dist-b.dist);
    const cur=queue.shift(); const key=`${cur.row},${cur.col}`;
    if(visited.has(key)) continue; visited.add(key);
    if(cur.row===e.row&&cur.col===e.col){steps.push({visited:[...visited].map(k=>k.split(",").map(Number)),path:reconstructPath(cur).map(n=>[n.row,n.col])});return steps;}
    steps.push({visited:[...visited].map(k=>k.split(",").map(Number)),frontier:queue.map(n=>[n.row,n.col]),path:[]});
    for(const nb of getNeighbors(g,cur)){if(!visited.has(`${nb.row},${nb.col}`)){const nd=cur.dist+1;if(nd<nb.dist){nb.dist=nd;nb.parent=cur;queue.push(nb);}}}
  }
  return steps;
}

function runAlgo(algo, grid, start, end) {
  if(algo==="astar") return runAStar(grid,start,end);
  if(algo==="bfs") return runBFS(grid,start,end);
  if(algo==="dfs") return runDFS(grid,start,end);
  if(algo==="dijkstra") return runDijkstra(grid,start,end);
  return [];
}

function benchmarkAll(grid, start, end) {
  return ALGOS.map(a => {
    const RUNS = 50;
    let totalTime = 0, steps = null;
    for (let i = 0; i < RUNS; i++) {
      const t0 = performance.now();
      steps = runAlgo(a.id, grid, start, end);
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

export default function PathfindingVisualizer() {
  const [grid, setGrid] = useState(createGrid);
  const [startNode, setStartNode] = useState({ row: 5, col: 5 });
  const [endNode, setEndNode] = useState({ row: 14, col: 29 });
  const [algo, setAlgo] = useState("astar");
  const [mode, setMode] = useState("wall");
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [speed, setSpeed] = useState(18);
  const [visitedCells, setVisitedCells] = useState(new Set());
  const [frontierCells, setFrontierCells] = useState(new Set());
  const [pathCells, setPathCells] = useState(new Set());
  const [stats, setStats] = useState(null);
  const [benchmarks, setBenchmarks] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [showBenchPanel, setShowBenchPanel] = useState(false);
  const animRef = useRef(null);

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
    clearTimeout(animRef.current);
    setVisitedCells(new Set()); setFrontierCells(new Set()); setPathCells(new Set());
    setIsRunning(false); setIsDone(false); setStats(null);
  }

  function clearAll() {
    clearVisualization(); setGrid(createGrid()); setBenchmarks(null); setShowBenchPanel(false);
  }

  function handleCellInteraction(r, c) {
    if (isRunning) return;
    clearVisualization();
    if (mode === "start") setStartNode({ row: r, col: c });
    else if (mode === "end") setEndNode({ row: r, col: c });
    else setGrid(prev => { const n=prev.map(row=>row.map(cell=>({...cell}))); n[r][c].type=n[r][c].type===CELL_WALL?CELL_EMPTY:CELL_WALL; return n; });
  }

  function visualize() {
    if (isRunning) return;
    clearVisualization(); setIsRunning(true);
    const t0 = performance.now();
    const steps = runAlgo(algo, grid, startNode, endNode);
    const algoTime = performance.now() - t0;
    if (!steps.length) { setIsRunning(false); return; }
    const last = steps[steps.length - 1];
    let i = 0;
    function animate() {
      if (i >= steps.length) {
        setVisitedCells(new Set(last.visited.map(([r,c])=>`${r},${c}`)));
        setFrontierCells(new Set());
        setPathCells(new Set(last.path.map(([r,c])=>`${r},${c}`)));
        setIsRunning(false); setIsDone(true);
        setStats({ visited: last.visited.length, pathLen: last.path.length > 0 ? last.path.length - 1 : 0, time: algoTime.toFixed(3) });
        return;
      }
      const s = steps[i];
      setVisitedCells(new Set(s.visited.map(([r,c])=>`${r},${c}`)));
      setFrontierCells(new Set((s.frontier||[]).map(([r,c])=>`${r},${c}`)));
      if (s.path.length) setPathCells(new Set(s.path.map(([r,c])=>`${r},${c}`)));
      i++;
      animRef.current = setTimeout(animate, Math.max(1, 100 - speed * 4));
    }
    animate();
  }

  function runBenchmark() {
    setIsBenchmarking(true);
    setTimeout(() => {
      const results = benchmarkAll(grid, startNode, endNode);
      results.sort((a, b) => a.time - b.time);
      setBenchmarks(results);
      setShowBenchPanel(true);
      setIsBenchmarking(false);
    }, 50);
  }

  function generateMaze() {
    clearVisualization(); setBenchmarks(null); setShowBenchPanel(false);
    setGrid(() => {
      const next = createGrid();
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (Math.random() < 0.3 && !(r===startNode.row&&c===startNode.col) && !(r===endNode.row&&c===endNode.col))
            next[r][c].type = CELL_WALL;
      return next;
    });
  }

  const fastest = benchmarks && benchmarks[0];
  const maxTime = benchmarks ? Math.max(...benchmarks.map(b => b.time)) : 1;

  return (
    <div style={{ minHeight:"100vh", background:"#f8f9fc", fontFamily:"'Georgia', serif", color:"#1a1a2e", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700&display=swap');
        * { box-sizing: border-box; }
        .cell { transition: background 0.06s ease; }
        .btn-primary { transition: all 0.15s ease; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.25); }
        .btn-bench:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124,58,237,0.25); }
        .algo-btn:hover { background: #f0f4ff !important; }
        .bench-row { transition: background 0.15s ease; }
        .bench-row:hover { background: #f5f7ff !important; }
        @keyframes slideIn { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
        .slide-in { animation: slideIn 0.3s ease forwards; }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        .pulsing { animation: pulse 1s ease infinite; display:inline-block; }
        @keyframes barGrow { from { width:0; } }
        .bar-grow { animation: barGrow 0.6s ease forwards; }
      `}</style>

      {/* Header */}
      <div style={{ background:"#fff", borderBottom:"2px solid #e8ecf5", padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"12px", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <div style={{ width:"40px", height:"40px", background:"linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:"20px", boxShadow:"0 4px 12px rgba(37,99,235,0.3)" }}>◈</div>
          <div>
            <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#94a3b8", fontFamily:"'DM Mono',monospace", textTransform:"uppercase" }}>University Project · Robotics</div>
            <div style={{ fontSize:"20px", fontWeight:"700", fontFamily:"'Playfair Display',serif", color:"#1e3a8a", lineHeight:"1.1" }}>Pathfinding Visualizer</div>
          </div>
        </div>

        {stats && (
          <div style={{ display:"flex", gap:"12px", alignItems:"center" }}>
            {[
              { label:"Nodes Visited", val:stats.visited, color:"#2563eb", bg:"#eff6ff" },
              { label:"Path Length", val:stats.pathLen||"∞", color:"#7c3aed", bg:"#f5f3ff" },
              { label:"Compute ms", val:stats.time, color:"#059669", bg:"#f0fdf4" },
            ].map(s=>(
              <div key={s.label} style={{ textAlign:"center", padding:"8px 16px", background:s.bg, borderRadius:"10px", border:`1px solid ${s.color}22` }}>
                <div style={{ fontSize:"22px", fontWeight:"700", color:s.color, fontFamily:"'DM Mono',monospace", lineHeight:"1" }}>{s.val}</div>
                <div style={{ fontSize:"9px", letterSpacing:"2px", color:"#94a3b8", textTransform:"uppercase", marginTop:"2px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display:"flex", flex:"1", overflow:"hidden" }}>
        {/* Sidebar */}
        <div style={{ width:"234px", minWidth:"234px", background:"#fff", borderRight:"1px solid #e8ecf5", padding:"20px 14px", display:"flex", flexDirection:"column", gap:"20px", overflowY:"auto" }}>

          <div>
            <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#94a3b8", marginBottom:"10px", fontFamily:"'DM Mono',monospace", textTransform:"uppercase" }}>Algorithm</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
              {ALGOS.map(a=>(
                <button key={a.id} className="algo-btn" onClick={()=>{setAlgo(a.id);clearVisualization();}}
                  style={{ background:algo===a.id?`${a.color}10`:"transparent", border:algo===a.id?`1.5px solid ${a.color}44`:"1.5px solid #e8ecf5", color:algo===a.id?a.color:"#64748b", padding:"9px 12px", borderRadius:"8px", cursor:"pointer", textAlign:"left", fontSize:"12px", fontFamily:"'DM Mono',monospace", display:"flex", alignItems:"center", gap:"8px", transition:"all 0.15s" }}>
                  <span style={{ fontSize:"15px" }}>{a.icon}</span>
                  <span style={{ fontWeight:algo===a.id?"600":"400", flex:1 }}>{a.label}</span>
                  {benchmarks && (()=>{ const b=benchmarks.find(x=>x.id===a.id); const rank=benchmarks.findIndex(x=>x.id===a.id); return b?<span style={{ fontSize:"10px", color:rank===0?"#059669":rank===1?"#d97706":"#94a3b8", fontWeight:"600" }}>{rank===0?"🥇":rank===1?"🥈":rank===2?"🥉":"  "}</span>:null; })()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#94a3b8", marginBottom:"10px", fontFamily:"'DM Mono',monospace", textTransform:"uppercase" }}>Draw Mode</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
              {[
                { id:"wall", label:"Wall", icon:"▪", color:"#dc2626" },
                { id:"start", label:"Source Node", icon:"▶", color:"#16a34a" },
                { id:"end", label:"Target Node", icon:"◼", color:"#d97706" },
              ].map(m=>(
                <button key={m.id} onClick={()=>setMode(m.id)}
                  style={{ background:mode===m.id?`${m.color}10`:"transparent", border:mode===m.id?`1.5px solid ${m.color}44`:"1.5px solid #e8ecf5", color:mode===m.id?m.color:"#64748b", padding:"8px 12px", borderRadius:"8px", cursor:"pointer", textAlign:"left", fontSize:"12px", fontFamily:"'DM Mono',monospace", display:"flex", alignItems:"center", gap:"8px", transition:"all 0.15s" }}>
                  <span>{m.icon}</span>{m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#94a3b8", marginBottom:"8px", fontFamily:"'DM Mono',monospace", textTransform:"uppercase" }}>
              Animation Speed
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <span style={{ fontSize:"10px", color:"#cbd5e1", fontFamily:"'DM Mono',monospace" }}>Slow</span>
              <input type="range" min="1" max="24" value={speed} onChange={e=>setSpeed(+e.target.value)} style={{ flex:1, accentColor:"#2563eb", cursor:"pointer" }} />
              <span style={{ fontSize:"10px", color:"#cbd5e1", fontFamily:"'DM Mono',monospace" }}>Fast</span>
            </div>
          </div>

          <div style={{ borderTop:"1px solid #e8ecf5" }} />

          <div>
            <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#94a3b8", marginBottom:"10px", fontFamily:"'DM Mono',monospace", textTransform:"uppercase" }}>Legend</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {[
                { color:"#16a34a", label:"Source node" },
                { color:"#d97706", label:"Target node" },
                { color:"#94a3b8", label:"Wall / obstacle" },
                { color:"#93c5fd", label:"Frontier cells" },
                { color:"#c4b5fd", label:"Visited cells" },
                { color:"#2563eb", label:"Shortest path" },
              ].map(l=>(
                <div key={l.label} style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  <div style={{ width:"12px", height:"12px", borderRadius:"3px", background:l.color, flexShrink:0 }} />
                  <span style={{ fontSize:"11px", color:"#64748b", fontFamily:"'DM Mono',monospace" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {/* Toolbar */}
          <div style={{ background:"#fff", borderBottom:"1px solid #e8ecf5", padding:"10px 20px", display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
            <button className="btn-primary" onClick={visualize} disabled={isRunning}
              style={{ background:isRunning?"#e2e8f0":"linear-gradient(135deg,#2563eb,#3b82f6)", border:"none", color:isRunning?"#94a3b8":"#fff", padding:"9px 22px", borderRadius:"8px", cursor:isRunning?"not-allowed":"pointer", fontSize:"12px", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", fontWeight:"600", boxShadow:isRunning?"none":"0 2px 8px rgba(37,99,235,0.2)" }}>
              {isRunning ? <span className="pulsing">◈ Running…</span> : "▶  Visualize"}
            </button>

            <button className="btn-bench" onClick={runBenchmark} disabled={isRunning||isBenchmarking}
              style={{ background:(isRunning||isBenchmarking)?"#f1f5f9":"linear-gradient(135deg,#7c3aed,#9b59b6)", border:"none", color:(isRunning||isBenchmarking)?"#94a3b8":"#fff", padding:"9px 18px", borderRadius:"8px", cursor:(isRunning||isBenchmarking)?"not-allowed":"pointer", fontSize:"12px", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", fontWeight:"600", boxShadow:(isRunning||isBenchmarking)?"none":"0 2px 8px rgba(124,58,237,0.2)", transition:"all 0.15s" }}>
              {isBenchmarking ? <span className="pulsing">⏱ Benchmarking…</span> : "⏱  Benchmark All"}
            </button>

            {[
              { label:"↺  Clear Path", fn:clearVisualization },
              { label:"✕  Clear All", fn:clearAll },
              { label:"⊞  Random Maze", fn:generateMaze },
            ].map(b=>(
              <button key={b.label} onClick={b.fn} disabled={isRunning}
                style={{ background:"transparent", border:"1.5px solid #e2e8f0", color:"#64748b", padding:"9px 14px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontFamily:"'DM Mono',monospace", transition:"all 0.15s" }}>
                {b.label}
              </button>
            ))}

            <div style={{ marginLeft:"auto", fontSize:"10px", color:"#cbd5e1", fontFamily:"'DM Mono',monospace" }}>
              {COLS}×{ROWS} · {mode} mode
            </div>
          </div>

          <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
            {/* Grid */}
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px", background:"#f8f9fc", overflow:"hidden" }}>
              <div onMouseLeave={()=>setIsDrawing(false)}
                style={{ display:"grid", gridTemplateColumns:`repeat(${COLS}, 1fr)`, gap:"1.5px", background:"#e2e8f0", border:"2px solid #e2e8f0", borderRadius:"10px", padding:"2px", boxShadow:"0 4px 24px rgba(0,0,0,0.07)", cursor:mode==="wall"?"cell":"crosshair" }}>
                {grid.map((row,r)=>row.map((cell,c)=>{
                  const ct=cellTypeAt(r,c);
                  const bg = ct==="start"?"#16a34a" : ct==="end"?"#d97706" : ct==="wall"?"#94a3b8" : ct==="path"?"#2563eb" : ct==="visited"?"#ddd6fe" : ct==="frontier"?"#bfdbfe" : "#fff";
                  return (
                    <div key={`${r}-${c}`} className="cell"
                      onMouseDown={()=>{setIsDrawing(true);handleCellInteraction(r,c);}}
                      onMouseEnter={()=>{if(isDrawing&&mode==="wall")handleCellInteraction(r,c);}}
                      onMouseUp={()=>setIsDrawing(false)}
                      style={{ width:"100%", aspectRatio:"1", background:bg, borderRadius:"2px", minWidth:"15px", minHeight:"15px", maxWidth:"22px", maxHeight:"22px" }} />
                  );
                }))}
              </div>
            </div>

            {/* Benchmark Panel */}
            {showBenchPanel && benchmarks && (
              <div className="slide-in" style={{ width:"310px", minWidth:"310px", background:"#fff", borderLeft:"1px solid #e8ecf5", padding:"20px 18px", overflowY:"auto", boxShadow:"-4px 0 20px rgba(0,0,0,0.05)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"18px" }}>
                  <div>
                    <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#94a3b8", fontFamily:"'DM Mono',monospace", textTransform:"uppercase" }}>Performance Report</div>
                    <div style={{ fontSize:"18px", fontWeight:"700", fontFamily:"'Playfair Display',serif", color:"#1e3a8a" }}>Algorithm Benchmark</div>
                    <div style={{ fontSize:"10px", color:"#94a3b8", fontFamily:"'DM Mono',monospace", marginTop:"2px" }}>50 runs · averaged</div>
                  </div>
                  <button onClick={()=>setShowBenchPanel(false)} style={{ background:"#f1f5f9", border:"none", cursor:"pointer", color:"#64748b", fontSize:"16px", width:"28px", height:"28px", borderRadius:"6px", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                </div>

                {/* Winner */}
                <div style={{ background:`linear-gradient(135deg, ${fastest.color}15, ${fastest.color}05)`, border:`2px solid ${fastest.color}30`, borderRadius:"12px", padding:"16px", marginBottom:"16px" }}>
                  <div style={{ fontSize:"9px", letterSpacing:"3px", color:fastest.color, fontFamily:"'DM Mono',monospace", textTransform:"uppercase", marginBottom:"6px" }}>🏆 Fastest Algorithm</div>
                  <div style={{ fontSize:"22px", fontWeight:"700", fontFamily:"'Playfair Display',serif", color:fastest.color }}>{fastest.label}</div>
                  <div style={{ display:"flex", gap:"16px", marginTop:"8px" }}>
                    <div>
                      <div style={{ fontSize:"15px", fontWeight:"700", color:fastest.color, fontFamily:"'DM Mono',monospace" }}>{fastest.time.toFixed(4)} ms</div>
                      <div style={{ fontSize:"9px", color:"#94a3b8", fontFamily:"'DM Mono',monospace" }}>avg time</div>
                    </div>
                    <div>
                      <div style={{ fontSize:"15px", fontWeight:"700", color:fastest.color, fontFamily:"'DM Mono',monospace" }}>{fastest.visited}</div>
                      <div style={{ fontSize:"9px", color:"#94a3b8", fontFamily:"'DM Mono',monospace" }}>nodes visited</div>
                    </div>
                    <div>
                      <div style={{ fontSize:"15px", fontWeight:"700", color:fastest.color, fontFamily:"'DM Mono',monospace" }}>{fastest.pathLen||"∞"}</div>
                      <div style={{ fontSize:"9px", color:"#94a3b8", fontFamily:"'DM Mono',monospace" }}>path length</div>
                    </div>
                  </div>
                </div>

                {/* All rankings */}
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {benchmarks.map((b, idx) => (
                    <div key={b.id} className="bench-row" style={{ padding:"12px 14px", borderRadius:"10px", border:`1px solid ${idx===0?b.color+"33":"#e8ecf5"}`, background:idx===0?`${b.color}06`:"#fafbfc" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
                        <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:idx===0?b.color:idx===1?"#f1f5f9":"#f8fafc", color:idx===0?"#fff":"#64748b", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", flexShrink:0, border:idx===0?`2px solid ${b.color}`:"2px solid #e2e8f0" }}>
                          {idx===0?"🥇":idx===1?"🥈":idx===2?"🥉":idx+1}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:"13px", fontWeight:"600", color:idx===0?b.color:"#334155", fontFamily:"'DM Mono',monospace" }}>{b.label}</div>
                          <div style={{ fontSize:"10px", color:"#94a3b8", fontFamily:"'DM Mono',monospace" }}>
                            {b.found ? `${b.pathLen} steps · ${b.visited} nodes` : "⚠ No path found"}
                          </div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:"14px", fontWeight:"700", color:idx===0?b.color:"#475569", fontFamily:"'DM Mono',monospace" }}>{b.time.toFixed(4)}</div>
                          <div style={{ fontSize:"9px", color:"#94a3b8", fontFamily:"'DM Mono',monospace" }}>ms</div>
                        </div>
                      </div>
                      <div style={{ height:"5px", background:"#f1f5f9", borderRadius:"4px", overflow:"hidden" }}>
                        <div className="bar-grow" style={{ height:"100%", width:`${(b.time/maxTime)*100}%`, background:`linear-gradient(90deg,${b.color},${b.color}99)`, borderRadius:"4px" }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop:"14px", padding:"12px", background:"#f8f9fc", borderRadius:"8px", border:"1px solid #e8ecf5" }}>
                  <div style={{ fontSize:"9px", letterSpacing:"2px", color:"#94a3b8", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", marginBottom:"5px" }}>Note</div>
                  <div style={{ fontSize:"11px", color:"#64748b", lineHeight:"1.6", fontFamily:"'DM Mono',monospace" }}>
                    Benchmarks run on the <strong>current grid</strong>. Change walls or grid size and re-run for different results. Results may vary slightly between runs.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding:"8px 20px", borderTop:"1px solid #e8ecf5", fontSize:"10px", color:"#cbd5e1", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", display:"flex", justifyContent:"space-between", background:"#fff" }}>
            <span>Click + drag to draw walls · Select draw mode to move source / target</span>
            <span style={{ color:isDone&&stats?.pathLen===0?"#dc2626":isDone?"#16a34a":"#94a3b8", fontWeight:"600" }}>
              {isDone&&stats?.pathLen===0 ? "⚠ No path found" : isDone ? `✓ Path found — ${stats?.pathLen} steps` : "Ready"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}