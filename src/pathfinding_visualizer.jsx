// ===================== MAIN COMPONENT =====================
import { useState, useRef, useCallback } from "react";

import { ALGOS, CELL_EMPTY, CELL_WALL }      from "./constants.js";
import { createGrid, generateRecursiveMaze, findFirstEmptyCell } from "./gridUtils.js";
import { runAlgo, benchmarkAll }             from "./algorithms.js";
import Sidebar                               from "./components/Sidebar.jsx";
import { StatBadge }                         from "./components/UIComponents.jsx";
import { RunAllResultsPanel, BenchmarkPanel } from "./components/ResultPanels.jsx";

export default function PathfindingVisualizer() {
  const [ROWS, setROWS] = useState(55);
  const [COLS, setCOLS] = useState(95);
  const [grid, setGrid] = useState(() => createGrid(55, 95));
  const [startNode, setStartNode] = useState({ row: 10, col: 10 });
  const [endNode,   setEndNode]   = useState({ row: 44, col: 84 });
  const [algo, setAlgo]           = useState("astar");
  const [mode, setMode]           = useState("wall");
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed]         = useState(18);

  const [visitedCells,  setVisitedCells]  = useState(new Set());
  const [frontierCells, setFrontierCells] = useState(new Set());
  const [pathCells,     setPathCells]     = useState(new Set());

  const [stats,         setStats]         = useState(null);
  const [benchmarks,    setBenchmarks]    = useState(null);
  const [showBenchPanel,setShowBenchPanel]= useState(false);
  const [isDrawing,     setIsDrawing]     = useState(false);
  const [isBenchmarking,setIsBenchmarking]= useState(false);
  const [threshold,     setThreshold]     = useState(118);

  const [autoRunningAlgo, setAutoRunningAlgo] = useState(null);
  const [bestAlgo,        setBestAlgo]        = useState(null);
  const [allAlgoResults,  setAllAlgoResults]  = useState(null);

  const animRef    = useRef(null);
  const fileInputRef = useRef(null);

  // ---- derived ----
  const currentAlgo  = ALGOS.find(a => a.id === algo);
  const maxBenchTime = benchmarks ? Math.max(...benchmarks.map(b => b.time), 0.001) : 1;
  const speedLabel   = speed >= 24 ? "⚡ Instant" : speed >= 20 ? "Very Fast" : speed >= 14 ? "Fast" : speed >= 8 ? "Normal" : "Slow";

  function getDelay(spd) {
    if (spd >= 24) return -1;
    return Math.max(0, 120 - spd * 5);
  }

  // ---- cell renderer ----
  const cellTypeAt = useCallback((r, c) => {
    if (r === startNode.row && c === startNode.col) return "start";
    if (r === endNode.row   && c === endNode.col)   return "end";
    if (grid[r][c].type === CELL_WALL)              return "wall";
    if (pathCells.has(`${r},${c}`))                 return "path";
    if (visitedCells.has(`${r},${c}`))              return "visited";
    if (frontierCells.has(`${r},${c}`))             return "frontier";
    return "empty";
  }, [grid, startNode, endNode, visitedCells, frontierCells, pathCells]);

  // ---- clear helpers ----
  function clearVisualization() {
    if (animRef.current) clearTimeout(animRef.current);
    setVisitedCells(new Set());
    setFrontierCells(new Set());
    setPathCells(new Set());
    setIsRunning(false);
    setStats(null);
    setAutoRunningAlgo(null);
    setBestAlgo(null);
    setAllAlgoResults(null);
  }

  function clearAll() {
    clearVisualization();
    setGrid(createGrid(ROWS, COLS));
    setBenchmarks(null);
    setShowBenchPanel(false);
  }

  // ---- grid interaction ----
  function handleCellInteraction(r, c) {
    if (isRunning) return;
    clearVisualization();
    if (mode === "start") {
      setStartNode({ row: r, col: c });
    } else if (mode === "end") {
      setEndNode({ row: r, col: c });
    } else {
      setGrid(prev => {
        const n = prev.map(row => row.map(cell => ({ ...cell })));
        n[r][c].type = n[r][c].type === CELL_WALL ? CELL_EMPTY : CELL_WALL;
        return n;
      });
    }
  }

  // ---- single-algo visualize ----
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

  // ---- run all & compare ----
  function runAllAndShowBest(currentGrid, currentStart, currentEnd) {
    if (animRef.current) clearTimeout(animRef.current);
    setVisitedCells(new Set()); setFrontierCells(new Set()); setPathCells(new Set());
    setStats(null); setBestAlgo(null); setAutoRunningAlgo(null);
    setAllAlgoResults(null); setIsRunning(true);

    const delay = getDelay(speed);

    const allSteps = ALGOS.map(a => {
      const t0 = performance.now();
      const steps = runAlgo(a.id, currentGrid, currentStart, currentEnd, ROWS, COLS);
      const time = (performance.now() - t0).toFixed(3);
      const last  = steps.length ? steps[steps.length - 1] : null;
      const found = !!(last && last.path && last.path.length > 0);
      return { ...a, steps, time, last, found, pathLen: found ? last.path.length - 1 : 0, visited: last ? last.visited.length : 0 };
    });

    const foundOnes = allSteps.filter(a => a.found);
    const best = foundOnes.length > 0
      ? foundOnes.reduce((a, b) => a.pathLen < b.pathLen ? a : (a.pathLen === b.pathLen && a.visited <= b.visited ? a : b))
      : null;

    let algoIdx = 0;
    function runNextAlgo() {
      if (algoIdx >= allSteps.length) {
        setAutoRunningAlgo(null);
        setAllAlgoResults(allSteps.map(a => ({ id: a.id, label: a.label, color: a.color, icon: a.icon, found: a.found, pathLen: a.pathLen, visited: a.visited, time: a.time })));
        if (best) {
          const bl = best.last;
          setVisitedCells(new Set(bl.visited.map(([r,c]) => `${r},${c}`)));
          setFrontierCells(new Set());
          setPathCells(new Set((bl.path || []).map(([r,c]) => `${r},${c}`)));
          setAlgo(best.id);
          setBestAlgo({ label: best.label, color: best.color, icon: best.icon, pathLen: best.pathLen, visited: best.visited, time: best.time });
          setStats({ visited: best.visited, pathLen: best.pathLen, time: best.time, found: true });
        } else {
          setStats({ visited: 0, pathLen: 0, time: "0.000", found: false });
        }
        setIsRunning(false);
        return;
      }

      const current = allSteps[algoIdx];
      setAutoRunningAlgo(current.label);
      algoIdx++;

      const { steps, last, found } = current;
      if (!steps.length) { runNextAlgo(); return; }

      if (delay < 0) {
        if (last) {
          setVisitedCells(new Set(last.visited.map(([r,c]) => `${r},${c}`)));
          setFrontierCells(new Set());
          if (found) setPathCells(new Set((last.path || []).map(([r,c]) => `${r},${c}`)));
        }
        animRef.current = setTimeout(runNextAlgo, 100);
        return;
      }

      let i = 0;
      function tick() {
        if (i >= steps.length) {
          if (last) {
            setVisitedCells(new Set(last.visited.map(([r,c]) => `${r},${c}`)));
            setFrontierCells(new Set());
            if (found) setPathCells(new Set((last.path || []).map(([r,c]) => `${r},${c}`)));
          }
          animRef.current = setTimeout(runNextAlgo, 400);
          return;
        }
        const s = steps[i];
        setVisitedCells(new Set(s.visited.map(([r,c]) => `${r},${c}`)));
        setFrontierCells(new Set((s.frontier || []).map(([r,c]) => `${r},${c}`)));
        if (s.path && s.path.length) setPathCells(new Set(s.path.map(([r,c]) => `${r},${c}`)));
        i++;
        animRef.current = setTimeout(tick, delay);
      }
      tick();
    }
    runNextAlgo();
  }

  // ---- benchmark ----
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

  // ---- maze ----
  function handleGenerateMaze() {
    if (isRunning) return;
    clearVisualization();
    setBenchmarks(null);
    setShowBenchPanel(false);
    setGrid(generateRecursiveMaze(ROWS, COLS, startNode, endNode));
  }

  // ---- image upload ----
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    clearVisualization();
    setBenchmarks(null);
    setShowBenchPanel(false);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const aspect  = img.height / img.width;
      const newCols = 100;
      const newRows = Math.max(50, Math.round(newCols * aspect));
      setCOLS(newCols);
      setROWS(newRows);
      const canvas = document.createElement("canvas");
      canvas.width  = newCols;
      canvas.height = newRows;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, newCols, newRows);
      const data = ctx.getImageData(0, 0, newCols, newRows).data;
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

  // ===================== RENDER =====================
  return (
    <div style={{ minHeight:"100vh", background:"#f8f9fc", fontFamily:"'Georgia',serif", color:"#1a1a2e", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700&display=swap');
        * { box-sizing: border-box; }
        .cell { transition: background 0.05s ease; }
        .btn-act { cursor:pointer; transition: all 0.12s; }
        .btn-act:hover:not(:disabled) { opacity:0.88; transform:translateY(-1px); }
        @keyframes slideIn { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
        .slide-in { animation: slideIn 0.3s ease forwards; }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        .pulsing { animation: pulse 1s ease infinite; display:inline-block; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.35s ease forwards; }
        @keyframes bestPop { 0%{transform:scale(0.92);opacity:0} 60%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
        .best-pop { animation: bestPop 0.4s ease forwards; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background:"#fff", borderBottom:"2px solid #e8ecf5", padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"12px", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <div style={{ width:"40px", height:"40px", background:"linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:"20px" }}>◈</div>
          <div>
            <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#94a3b8", fontFamily:"'DM Mono',monospace", textTransform:"uppercase" }}>UNIVERSITY PROJECT · ROBOTICS</div>
            <div style={{ fontSize:"20px", fontWeight:"700", fontFamily:"'Playfair Display',serif", color:"#1e3a8a" }}>Pathfinding Visualizer</div>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
          {/* Running indicator */}
          {autoRunningAlgo && (
            <div className="fade-up" style={{ display:"flex", alignItems:"center", gap:"10px", padding:"6px 14px", background:"#eff6ff", border:"1.5px solid #bfdbfe", borderRadius:"8px" }}>
              {ALGOS.map((a, i) => (
                <span key={a.id} style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                  <span style={{ fontSize:"12px", fontFamily:"'DM Mono',monospace", fontWeight:"600", color: a.label === autoRunningAlgo ? a.color : "#cbd5e1", transition:"color 0.2s" }}>
                    <span className={a.label === autoRunningAlgo ? "pulsing" : ""}>{a.icon}</span> {a.short}
                  </span>
                  {i < ALGOS.length - 1 && <span style={{color:"#e2e8f0",fontSize:"11px"}}> · </span>}
                </span>
              ))}
              <span className="pulsing" style={{fontSize:"11px",color:"#94a3b8",fontFamily:"'DM Mono',monospace",marginLeft:"4px"}}>running…</span>
            </div>
          )}

          {/* Best algo winner badge */}
          {bestAlgo && !autoRunningAlgo && (
            <div className="best-pop" style={{ display:"flex", alignItems:"center", gap:"10px", padding:"7px 16px", background:`${bestAlgo.color}0e`, border:`1.5px solid ${bestAlgo.color}44`, borderRadius:"8px" }}>
              <span style={{fontSize:"18px"}}>🏆</span>
              <div>
                <div style={{fontSize:"9px",letterSpacing:"2px",color:"#94a3b8",fontFamily:"'DM Mono',monospace",textTransform:"uppercase"}}>Best Path Found By</div>
                <div style={{fontSize:"14px",fontWeight:"700",color:bestAlgo.color,fontFamily:"'DM Mono',monospace"}}>{bestAlgo.icon} {bestAlgo.label}</div>
              </div>
              <div style={{borderLeft:`1px solid ${bestAlgo.color}33`,paddingLeft:"12px",display:"flex",gap:"12px"}}>
                <StatBadge label="Path Len" value={bestAlgo.pathLen} color={bestAlgo.color} />
                <StatBadge label="Visited"  value={bestAlgo.visited} color={bestAlgo.color} />
                <StatBadge label="Time"     value={`${bestAlgo.time}ms`} color={bestAlgo.color} />
              </div>
            </div>
          )}

          {/* Single-algo stats */}
          {stats && !bestAlgo && (
            <div className="fade-up" style={{ display:"flex", gap:"12px", flexWrap:"wrap" }}>
              <StatBadge label="Status"   value={stats.found ? "✓ Found" : "✗ No Path"} color={stats.found ? "#059669" : "#dc2626"} />
              <StatBadge label="Time"     value={`${stats.time} ms`}                     color={currentAlgo?.color ?? "#2563eb"} />
              <StatBadge label="Visited"  value={stats.visited.toLocaleString()}          color="#7c3aed" />
              <StatBadge label="Path Len" value={stats.found ? stats.pathLen : "—"}      color="#d97706" />
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display:"flex", flex:"1", overflow:"hidden" }}>

        <Sidebar
          algo={algo}             setAlgo={setAlgo}
          mode={mode}             setMode={setMode}
          threshold={threshold}   setThreshold={setThreshold}
          speed={speed}           setSpeed={setSpeed}
          speedLabel={speedLabel}
          clearVisualization={clearVisualization}
        />

        {/* Main area */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Toolbar */}
          <div style={{ background:"#fff", borderBottom:"1px solid #e8ecf5", padding:"12px 20px", display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center" }}>
            <button className="btn-act" onClick={visualize} disabled={isRunning}
              style={{ padding:"10px 22px", background:isRunning?"#e2e8f0":"linear-gradient(135deg,#2563eb,#3b82f6)", color:isRunning?"#94a3b8":"#fff", border:"none", borderRadius:"8px", cursor:isRunning?"not-allowed":"pointer", fontFamily:"inherit", fontSize:"13px", fontWeight:"600" }}>
              {isRunning && !autoRunningAlgo ? <span className="pulsing">Running…</span> : "▶ Visualize"}
            </button>

            <button className="btn-act" onClick={() => runAllAndShowBest(grid, startNode, endNode)} disabled={isRunning}
              style={{ padding:"10px 20px", background:isRunning?"#e2e8f0":"linear-gradient(135deg,#0f766e,#059669)", color:isRunning?"#94a3b8":"#fff", border:"none", borderRadius:"8px", cursor:isRunning?"not-allowed":"pointer", fontFamily:"inherit", fontSize:"13px", fontWeight:"600" }}>
              {autoRunningAlgo ? <span className="pulsing">Running All…</span> : "⚡ Run All & Compare"}
            </button>

            <button className="btn-act" onClick={runBenchmark} disabled={isRunning || isBenchmarking}
              style={{ padding:"10px 20px", background:(isRunning||isBenchmarking)?"#e2e8f0":"#7c3aed", color:(isRunning||isBenchmarking)?"#94a3b8":"#fff", border:"none", borderRadius:"8px", cursor:(isRunning||isBenchmarking)?"not-allowed":"pointer", fontFamily:"inherit", fontSize:"13px", fontWeight:"600" }}>
              {isBenchmarking ? <span className="pulsing">Benchmarking…</span> : "⏱ Benchmark All"}
            </button>

            <button className="btn-act" onClick={handleGenerateMaze} disabled={isRunning}
              style={{ padding:"10px 16px", background:isRunning?"#f1f5f9":"linear-gradient(135deg,#0f766e,#059669)", color:isRunning?"#94a3b8":"#fff", border:"none", borderRadius:"8px", cursor:isRunning?"not-allowed":"pointer", fontFamily:"inherit", fontSize:"13px", fontWeight:"600" }}>
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

          {/* Run All results panel */}
          <RunAllResultsPanel
            allAlgoResults={allAlgoResults}
            bestAlgo={bestAlgo}
            autoRunningAlgo={autoRunningAlgo}
            onClose={() => setAllAlgoResults(null)}
          />

          {/* Benchmark panel */}
          {showBenchPanel && (
            <BenchmarkPanel
              benchmarks={benchmarks}
              ROWS={ROWS} COLS={COLS}
              maxBenchTime={maxBenchTime}
              onClose={() => setShowBenchPanel(false)}
            />
          )}

          {/* Grid */}
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px", background:"#f8f9fc", overflow:"auto" }}>
            <div
              onMouseLeave={() => setIsDrawing(false)}
              style={{
                display:"grid",
                gridTemplateColumns:`repeat(${COLS}, 1fr)`,
                gap:"1px", background:"#d1d5db",
                border:"3px solid #d1d5db", borderRadius:"10px",
                padding:"3px", userSelect:"none",
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
                  <div key={`${r}-${c}`} className="cell"
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
            <span>Draw walls by clicking/dragging · Place source/target via Draw Mode · Click ⚡ Run All & Compare to find the best path</span>
            <span>Upload image → adjust threshold → run</span>
          </div>
        </div>
      </div>
    </div>
  );
}