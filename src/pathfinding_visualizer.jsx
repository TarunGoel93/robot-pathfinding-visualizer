// ===================== MAIN COMPONENT =====================
import { useState, useRef, useCallback } from "react";

import { ALGOS, CELL_EMPTY, CELL_WALL }       from "./constants.js";
import { createGrid, generateRecursiveMaze, findFirstEmptyCell } from "./gridUtils.js";
import { runAlgo, benchmarkAll }              from "./algorithms.js";
import Sidebar                                from "./components/Sidebar.jsx";
import { StatBadge }                          from "./components/UIComponents.jsx";
import { RunAllResultsPanel, BenchmarkPanel } from "./components/ResultPanels.jsx";

// ╔══════════════════════════════════════════════════════════════════╗
// ║              AI API CONFIGURATION — EDIT THIS SECTION           ║
// ║                                                                  ║
// ║  STEP 1 — Choose your provider:                                  ║
// ║    "anthropic"  →  Claude models  (api.anthropic.com)           ║
// ║    "openai"     →  GPT models     (api.openai.com)              ║
// ║    "gemini"     →  Gemini models  (generativelanguage.google)   ║
// ║    "none"       →  skip AI, use local math (no key needed)      ║
// ║                                                                  ║
// ║  STEP 2 — Paste your API key on the AI_API_KEY line             ║
// ║                                                                  ║
// ║  STEP 3 — Optionally change the model name                      ║
// ╚══════════════════════════════════════════════════════════════════╝

const AI_PROVIDER = "anthropic";          // "anthropic" | "openai" | "gemini" | "none"
const AI_API_KEY  = "YOUR_API_KEY_HERE";  // ← paste your key here

const AI_MODEL = {
  anthropic : "claude-opus-4-5",           // or "claude-sonnet-4-5", "claude-haiku-4-5-20251001"
  openai    : "gpt-4o",                    // or "gpt-4o-mini", "gpt-3.5-turbo"
  gemini    : "gemini-2.0-flash",          // or "gemini-1.5-pro"
  none      : "",
}[AI_PROVIDER];

// ── internal: send one prompt to whichever provider is active ──────
async function callAI(userPrompt) {
  // If no provider or key is set, return null → caller uses local math
  if (AI_PROVIDER === "none" || !AI_API_KEY || AI_API_KEY === "YOUR_API_KEY_HERE") {
    return null;
  }

  // ── Anthropic / Claude ──────────────────────────────────────────
  if (AI_PROVIDER === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method : "POST",
      headers: {
        "Content-Type"      : "application/json",
        "x-api-key"         : AI_API_KEY,
        "anthropic-version" : "2023-06-01",
      },
      body: JSON.stringify({
        model      : AI_MODEL,
        max_tokens : 1024,
        messages   : [{ role: "user", content: userPrompt }],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.content.map(b => b.text || "").join("").trim();
  }

  // ── OpenAI / GPT ────────────────────────────────────────────────
  if (AI_PROVIDER === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method : "POST",
      headers: {
        "Content-Type" : "application/json",
        "Authorization": `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model    : AI_MODEL,
        messages : [{ role: "user", content: userPrompt }],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content.trim();
  }

  // ── Google Gemini ───────────────────────────────────────────────
  if (AI_PROVIDER === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${AI_API_KEY}`;
    const res = await fetch(url, {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text.trim();
  }

  throw new Error(`Unknown AI_PROVIDER: "${AI_PROVIDER}"`);
}
// ════════════════════════════════════════════════════════════════════

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

  const [stats,          setStats]          = useState(null);
  const [benchmarks,     setBenchmarks]     = useState(null);
  const [showBenchPanel, setShowBenchPanel] = useState(false);
  const [isDrawing,      setIsDrawing]      = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [threshold,      setThreshold]      = useState(118);

  const [autoRunningAlgo, setAutoRunningAlgo] = useState(null);
  const [bestAlgo,        setBestAlgo]        = useState(null);
  const [allAlgoResults,  setAllAlgoResults]  = useState(null);

  // ── Car command state ──
  const [pathArray,       setPathArray]       = useState([]);
  const [carCommands,     setCarCommands]     = useState("");
  const [carCommandsJSON, setCarCommandsJSON] = useState("");
  const [showCarPanel,    setShowCarPanel]    = useState(false);
  const [isGenerating,    setIsGenerating]    = useState(false);
  const [aiError,         setAiError]         = useState("");

  // ── Bluetooth state ──
  const [btDevice, setBtDevice] = useState(null);
  const [btStatus, setBtStatus] = useState("disconnected");
  const [btLog,    setBtLog]    = useState("");

  const animRef      = useRef(null);
  const fileInputRef = useRef(null);
  const btCharRef    = useRef(null); // mutable ref so async BT callbacks see latest char

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
    setPathArray([]);
    setCarCommands("");
    setCarCommandsJSON("");
    setShowCarPanel(false);
    setAiError("");
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

    const t0       = performance.now();
    const steps    = runAlgo(algo, grid, startNode, endNode, ROWS, COLS);
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
      if (found) setPathArray(last.path);
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
        if (found) setPathArray(last.path);
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
      const t0    = performance.now();
      const steps = runAlgo(a.id, currentGrid, currentStart, currentEnd, ROWS, COLS);
      const time  = (performance.now() - t0).toFixed(3);
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
          if (bl.path) setPathArray(bl.path);
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
            const idx        = (r * newCols + c) * 4;
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

  // ===================== CAR COMMAND HELPERS =====================

  // Converts [[row,col],...] → run-length encoded direction steps
  function pathToDirections(path) {
    if (path.length < 2) return [];
    const DIRS = { "-1,0":"UP", "1,0":"DOWN", "0,-1":"LEFT", "0,1":"RIGHT" };
    const steps = [];
    for (let i = 1; i < path.length; i++) {
      const dr  = path[i][0] - path[i-1][0];
      const dc  = path[i][1] - path[i-1][1];
      const dir = DIRS[`${dr},${dc}`] || "?";
      if (steps.length && steps[steps.length - 1].dir === dir) {
        steps[steps.length - 1].count++;
      } else {
        steps.push({ dir, count: 1 });
      }
    }
    return steps;
  }

  // Pure-JS fallback — always works, no API needed
  function buildCommandsLocally(steps) {
    const DIR_MAP   = { UP:"FORWARD", DOWN:"BACKWARD", LEFT:"LEFT", RIGHT:"RIGHT" };
    const cmdString = steps.map(s => `${DIR_MAP[s.dir] ?? s.dir} ${s.count};`).join(" ");
    const cmdJSON   = JSON.stringify(steps.map(s => ({ cmd: DIR_MAP[s.dir] ?? s.dir, steps: s.count })));
    return { cmdString, cmdJSON };
  }

  // Main entry point — tries AI, gracefully falls back to local math on any error
  async function generateCarCommands() {
    if (!pathArray.length) return;
    setShowCarPanel(true);
    setIsGenerating(true);
    setCarCommands("Generating…");
    setCarCommandsJSON("");
    setAiError("");

    const steps   = pathToDirections(pathArray);
    const stepStr = steps.map(s => `${s.dir} ${s.count}`).join(", ");

    const prompt = `You are a robot car command formatter. Convert these directional steps into commands for a physical car.

Directional steps (direction + grid cell count): ${stepStr}
Full path coordinates [row, col]: ${JSON.stringify(pathArray)}

Rules:
- The car starts facing UP (north). Mapping: UP→FORWARD, DOWN→BACKWARD, RIGHT→RIGHT, LEFT→LEFT
- Output exactly TWO lines, nothing else:
  Line 1: semicolon-separated command string  e.g.  FORWARD 3; RIGHT 2; FORWARD 5;
  Line 2: JSON array  e.g.  [{"cmd":"FORWARD","steps":3},{"cmd":"RIGHT","steps":2}]
- No extra text, no markdown, no explanations.`;

    try {
      const aiText = await callAI(prompt);

      if (aiText === null) {
        // Provider is "none" or key not filled in
        const { cmdString, cmdJSON } = buildCommandsLocally(steps);
        setCarCommands(cmdString);
        setCarCommandsJSON(cmdJSON);
        setAiError("ℹ️ No API key set — using local calculation instead.");
      } else {
        const lines = aiText.split("\n").map(l => l.trim()).filter(Boolean);
        setCarCommands(lines[0] || aiText);
        setCarCommandsJSON(lines[1] || "");
      }
    } catch (err) {
      // API failed (CORS if called without a proxy, bad key, network issue, etc.)
      const { cmdString, cmdJSON } = buildCommandsLocally(steps);
      setCarCommands(cmdString);
      setCarCommandsJSON(cmdJSON);
      setAiError(`⚠️ AI error: ${err.message} — showing local calculation instead.`);
    }

    setIsGenerating(false);
  }

  // ---- Bluetooth helpers ----
  async function connectBluetooth() {
    if (!navigator.bluetooth) {
      setBtLog("Web Bluetooth not supported. Use Chrome on desktop or Android.");
      setBtStatus("error");
      return;
    }
    try {
      setBtLog("Scanning for Bluetooth devices…");
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices : true,
        optionalServices : ["0000ffe0-0000-1000-8000-00805f9b34fb"], // HC-05/HC-06 serial
      });
      setBtLog(`Connecting to "${device.name}"…`);
      const server  = await device.gatt.connect();
      const service = await server.getPrimaryService("0000ffe0-0000-1000-8000-00805f9b34fb");
      const char    = await service.getCharacteristic("0000ffe1-0000-1000-8000-00805f9b34fb");
      btCharRef.current = char;
      setBtDevice(device);
      setBtStatus("connected");
      setBtLog(`✓ Connected to "${device.name}". Ready to send commands.`);
      device.addEventListener("gattserverdisconnected", () => {
        btCharRef.current = null;
        setBtDevice(null);
        setBtStatus("disconnected");
        setBtLog("Device disconnected.");
      });
    } catch (err) {
      setBtLog("Bluetooth error: " + err.message);
      setBtStatus("error");
    }
  }

  async function sendBluetoothCommands() {
    const char = btCharRef.current;
    if (!char || !carCommands) { setBtLog("No device or no commands."); return; }
    try {
      await char.writeValue(new TextEncoder().encode(carCommands + "\n"));
      setBtLog("✓ Sent: " + carCommands);
    } catch (err) {
      setBtLog("Send failed: " + err.message);
    }
  }

  function disconnectBluetooth() {
    if (btDevice && btDevice.gatt.connected) btDevice.gatt.disconnect();
    btCharRef.current = null;
    setBtDevice(null);
    setBtStatus("disconnected");
    setBtLog("Disconnected.");
  }

  // Labels shown in the UI
  const providerLabel = {
    anthropic : `Claude (${AI_MODEL})`,
    openai    : `OpenAI (${AI_MODEL})`,
    gemini    : `Gemini (${AI_MODEL})`,
    none      : "Local math (no AI)",
  }[AI_PROVIDER] ?? AI_PROVIDER;

  const apiKeySet = AI_PROVIDER !== "none" && AI_API_KEY && AI_API_KEY !== "YOUR_API_KEY_HERE";

  // ===================== RENDER =====================
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        @keyframes slideInLeft { from{opacity:0;transform:translateX(-100%)} to{opacity:1;transform:translateX(0)} }
        .sidebar-mobile { animation: slideInLeft 0.25s ease forwards; }

        /* Responsive toolbar: wrap and shrink buttons on small screens */
        .toolbar-btn { white-space: nowrap; }
        @media (max-width: 640px) {
          .toolbar-btn { padding: 7px 10px !important; font-size: 11px !important; }
          .header-subtitle { display: none; }
          .stat-badges { gap: 6px !important; }
          .best-pop-stats { display: none !important; }
          .footer-hint { display: none; }
        }
        @media (max-width: 900px) {
          .best-pop-stats { display: none !important; }
        }
        /* Touch-friendly grid cells on mobile */
        @media (pointer: coarse) {
          .cell { min-width: 6px !important; min-height: 6px !important; }
        }
        /* Sidebar overlay backdrop */
        .sidebar-backdrop {
          display: none;
          position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99;
        }
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-backdrop.open { display: block; }
          .sidebar-drawer {
            position: fixed; left: 0; top: 0; bottom: 0; z-index: 100;
            width: 260px; overflow-y: auto;
            box-shadow: 4px 0 24px rgba(0,0,0,0.18);
          }
        }
        @media (min-width: 769px) {
          .sidebar-drawer { position: static !important; box-shadow: none !important; }
          .sidebar-toggle { display: none !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background:"#fff", borderBottom:"2px solid #e8ecf5", padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"8px", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          {/* Mobile sidebar toggle */}
          <button className="btn-act sidebar-toggle"
            onClick={() => setSidebarOpen(o => !o)}
            style={{ width:"36px", height:"36px", border:"1.5px solid #e2e8f0", borderRadius:"8px", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", cursor:"pointer", flexShrink:0 }}>
            ☰
          </button>
          <div style={{ width:"36px", height:"36px", background:"linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:"18px", flexShrink:0 }}>◈</div>
          <div>
            <div className="header-subtitle" style={{ fontSize:"9px", letterSpacing:"3px", color:"#94a3b8", fontFamily:"'DM Mono',monospace", textTransform:"uppercase" }}>UNIVERSITY PROJECT · ROBOTICS</div>
            <div style={{ fontSize:"17px", fontWeight:"700", fontFamily:"'Playfair Display',serif", color:"#1e3a8a", lineHeight:1.2 }}>Pathfinding Visualizer</div>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap", flex:"1", justifyContent:"flex-end" }}>
          {autoRunningAlgo && (
            <div className="fade-up" style={{ display:"flex", alignItems:"center", gap:"6px", padding:"5px 10px", background:"#eff6ff", border:"1.5px solid #bfdbfe", borderRadius:"8px" }}>
              {ALGOS.map((a, i) => (
                <span key={a.id} style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                  <span style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", fontWeight:"600", color: a.label === autoRunningAlgo ? a.color : "#cbd5e1", transition:"color 0.2s" }}>
                    <span className={a.label === autoRunningAlgo ? "pulsing" : ""}>{a.icon}</span> {a.short}
                  </span>
                  {i < ALGOS.length - 1 && <span style={{color:"#e2e8f0",fontSize:"10px"}}> · </span>}
                </span>
              ))}
              <span className="pulsing" style={{fontSize:"10px",color:"#94a3b8",fontFamily:"'DM Mono',monospace",marginLeft:"2px"}}>running…</span>
            </div>
          )}

          {bestAlgo && !autoRunningAlgo && (
            <div className="best-pop" style={{ display:"flex", alignItems:"center", gap:"8px", padding:"6px 12px", background:`${bestAlgo.color}0e`, border:`1.5px solid ${bestAlgo.color}44`, borderRadius:"8px" }}>
              <span style={{fontSize:"16px"}}>🏆</span>
              <div>
                <div style={{fontSize:"8px",letterSpacing:"2px",color:"#94a3b8",fontFamily:"'DM Mono',monospace",textTransform:"uppercase"}}>Best Path Found By</div>
                <div style={{fontSize:"13px",fontWeight:"700",color:bestAlgo.color,fontFamily:"'DM Mono',monospace"}}>{bestAlgo.icon} {bestAlgo.label}</div>
              </div>
              <div className="best-pop-stats" style={{borderLeft:`1px solid ${bestAlgo.color}33`,paddingLeft:"10px",display:"flex",gap:"8px"}}>
                <StatBadge label="Path Len" value={bestAlgo.pathLen} color={bestAlgo.color} />
                <StatBadge label="Visited"  value={bestAlgo.visited} color={bestAlgo.color} />
                <StatBadge label="Time"     value={`${bestAlgo.time}ms`} color={bestAlgo.color} />
              </div>
            </div>
          )}

          {stats && !bestAlgo && (
            <div className="fade-up stat-badges" style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              <StatBadge label="Status"   value={stats.found ? "✓ Found" : "✗ No Path"} color={stats.found ? "#059669" : "#dc2626"} />
              <StatBadge label="Time"     value={`${stats.time} ms`}                     color={currentAlgo?.color ?? "#2563eb"} />
              <StatBadge label="Visited"  value={stats.visited.toLocaleString()}          color="#7c3aed" />
              <StatBadge label="Path Len" value={stats.found ? stats.pathLen : "—"}      color="#d97706" />
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display:"flex", flex:"1", overflow:"hidden", position:"relative" }}>

        {/* Mobile backdrop */}
        <div className={`sidebar-backdrop${sidebarOpen ? " open" : ""}`} onClick={() => setSidebarOpen(false)} />

        {/* Sidebar — desktop: inline, mobile: drawer */}
        <div className="sidebar-desktop" style={{ display:"flex" }}>
          <Sidebar
            algo={algo}             setAlgo={setAlgo}
            mode={mode}             setMode={setMode}
            threshold={threshold}   setThreshold={setThreshold}
            speed={speed}           setSpeed={setSpeed}
            speedLabel={speedLabel}
            clearVisualization={clearVisualization}
          />
        </div>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <div className="sidebar-drawer sidebar-mobile">
            <Sidebar
              algo={algo}             setAlgo={setAlgo}
              mode={mode}             setMode={setMode}
              threshold={threshold}   setThreshold={setThreshold}
              speed={speed}           setSpeed={setSpeed}
              speedLabel={speedLabel}
              clearVisualization={() => { clearVisualization(); setSidebarOpen(false); }}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}

        {/* Main area */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Toolbar */}
          <div style={{ background:"#fff", borderBottom:"1px solid #e8ecf5", padding:"8px 12px", display:"flex", gap:"6px", flexWrap:"wrap", alignItems:"center" }}>

            <button className="btn-act toolbar-btn" onClick={visualize} disabled={isRunning}
              style={{ padding:"8px 16px", background:isRunning?"#e2e8f0":"linear-gradient(135deg,#2563eb,#3b82f6)", color:isRunning?"#94a3b8":"#fff", border:"none", borderRadius:"8px", cursor:isRunning?"not-allowed":"pointer", fontFamily:"inherit", fontSize:"12px", fontWeight:"600" }}>
              {isRunning && !autoRunningAlgo ? <span className="pulsing">Running…</span> : "▶ Visualize"}
            </button>

            <button className="btn-act toolbar-btn" onClick={() => runAllAndShowBest(grid, startNode, endNode)} disabled={isRunning}
              style={{ padding:"8px 14px", background:isRunning?"#e2e8f0":"linear-gradient(135deg,#0f766e,#059669)", color:isRunning?"#94a3b8":"#fff", border:"none", borderRadius:"8px", cursor:isRunning?"not-allowed":"pointer", fontFamily:"inherit", fontSize:"12px", fontWeight:"600" }}>
              {autoRunningAlgo ? <span className="pulsing">Running All…</span> : "⚡ Run All & Compare"}
            </button>

            <button className="btn-act toolbar-btn" onClick={runBenchmark} disabled={isRunning || isBenchmarking}
              style={{ padding:"8px 14px", background:(isRunning||isBenchmarking)?"#e2e8f0":"#7c3aed", color:(isRunning||isBenchmarking)?"#94a3b8":"#fff", border:"none", borderRadius:"8px", cursor:(isRunning||isBenchmarking)?"not-allowed":"pointer", fontFamily:"inherit", fontSize:"12px", fontWeight:"600" }}>
              {isBenchmarking ? <span className="pulsing">Benchmarking…</span> : "⏱ Benchmark"}
            </button>

            <button className="btn-act toolbar-btn" onClick={handleGenerateMaze} disabled={isRunning}
              style={{ padding:"8px 12px", background:isRunning?"#f1f5f9":"linear-gradient(135deg,#0f766e,#059669)", color:isRunning?"#94a3b8":"#fff", border:"none", borderRadius:"8px", cursor:isRunning?"not-allowed":"pointer", fontFamily:"inherit", fontSize:"12px", fontWeight:"600" }}>
              🌀 Maze
            </button>

            <button className="btn-act toolbar-btn" onClick={clearVisualization}
              style={{ padding:"8px 12px", background:"transparent", border:"1.5px solid #e2e8f0", borderRadius:"8px", color:"#475569", fontFamily:"inherit", fontSize:"12px", cursor:"pointer" }}>
              Clear Path
            </button>

            <button className="btn-act toolbar-btn" onClick={clearAll}
              style={{ padding:"8px 12px", background:"transparent", border:"1.5px solid #e2e8f0", borderRadius:"8px", color:"#475569", fontFamily:"inherit", fontSize:"12px", cursor:"pointer" }}>
              Clear All
            </button>

            <button className="btn-act toolbar-btn" onClick={() => fileInputRef.current.click()}
              style={{ padding:"8px 12px", background:"transparent", border:"1.5px solid #e2e8f0", borderRadius:"8px", color:"#475569", fontFamily:"inherit", fontSize:"12px", cursor:"pointer" }}>
              📤 Floor Plan
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{display:"none"}} />

            {/* 🚗 Generate Car Commands */}
            <button
              className="btn-act toolbar-btn"
              onClick={generateCarCommands}
              disabled={isRunning || isGenerating || pathArray.length === 0}
              style={{
                padding     : "8px 12px",
                background  : (isRunning || isGenerating || pathArray.length === 0) ? "#e2e8f0" : "linear-gradient(135deg,#15803d,#16a34a)",
                color       : (isRunning || isGenerating || pathArray.length === 0) ? "#94a3b8" : "#fff",
                border      : "none",
                borderRadius: "8px",
                cursor      : (isRunning || isGenerating || pathArray.length === 0) ? "not-allowed" : "pointer",
                fontFamily  : "inherit",
                fontSize    : "12px",
                fontWeight  : "600",
              }}>
              {isGenerating ? <span className="pulsing">Generating…</span> : "🚗 Car Commands"}
            </button>
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

          {/* ── Car Commands Panel ── */}
          {showCarPanel && (
            <div style={{ background:"#f0fdf4", borderBottom:"1px solid #bbf7d0", padding:"14px 20px", fontFamily:"'DM Mono',monospace", fontSize:"13px" }}>

              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                  <span style={{ fontWeight:"600", color:"#15803d", fontSize:"14px" }}>🚗 Car Commands</span>
                  <span style={{
                    fontSize:"10px", padding:"2px 8px", borderRadius:"4px",
                    background: apiKeySet ? "#dbeafe" : "#fef3c7",
                    color     : apiKeySet ? "#1e40af" : "#92400e",
                    border    : `1px solid ${apiKeySet ? "#bfdbfe" : "#fde68a"}`,
                  }}>
                    {apiKeySet ? `🤖 ${providerLabel}` : "🔢 Local math (no API key)"}
                  </span>
                </div>
                <button onClick={() => setShowCarPanel(false)}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:"18px", lineHeight:1 }}>
                  ✕
                </button>
              </div>

              {/* Error / info notice */}
              {aiError && (
                <div style={{ marginBottom:"8px", padding:"6px 10px", background:"#fef9c3", border:"1px solid #fde047", borderRadius:"6px", fontSize:"11px", color:"#713f12" }}>
                  {aiError}
                </div>
              )}

              {/* Raw path array */}
              <div style={{ marginBottom:"8px" }}>
                <div style={{ fontSize:"10px", letterSpacing:"2px", color:"#6b7280", textTransform:"uppercase", marginBottom:"3px" }}>
                  Raw path array — {pathArray.length} coordinates
                </div>
                <div style={{ background:"#dcfce7", border:"1px solid #86efac", borderRadius:"6px", padding:"6px 10px", color:"#166534", fontSize:"11px", wordBreak:"break-all", maxHeight:"48px", overflowY:"auto" }}>
                  {JSON.stringify(pathArray)}
                </div>
              </div>

              {/* Compressed directional steps */}
              <div style={{ marginBottom:"8px" }}>
                <div style={{ fontSize:"10px", letterSpacing:"2px", color:"#6b7280", textTransform:"uppercase", marginBottom:"3px" }}>
                  Compressed directional steps
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"5px" }}>
                  {pathToDirections(pathArray).map((s, i) => {
                    const ARROW = { UP:"↑", DOWN:"↓", LEFT:"←", RIGHT:"→" };
                    const COLOR = { UP:"#185FA5", DOWN:"#3B6D11", LEFT:"#854F0B", RIGHT:"#993C1D" };
                    return (
                      <span key={i} style={{
                        display:"inline-flex", alignItems:"center", gap:"3px",
                        padding:"2px 8px", borderRadius:"5px",
                        background:`${COLOR[s.dir]}18`, color:COLOR[s.dir],
                        border:`0.5px solid ${COLOR[s.dir]}55`, fontSize:"12px",
                      }}>
                        {ARROW[s.dir]} {s.dir} ×{s.count}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Command string */}
              <div style={{ marginBottom:"8px" }}>
                <div style={{ fontSize:"10px", letterSpacing:"2px", color:"#6b7280", textTransform:"uppercase", marginBottom:"3px" }}>
                  Command string (car-ready)
                </div>
                <div style={{ background:"#dcfce7", border:"1px solid #86efac", borderRadius:"6px", padding:"8px 10px", color:"#166534", wordBreak:"break-all", minHeight:"32px" }}>
                  {carCommands || "—"}
                </div>
              </div>

              {/* JSON array */}
              {carCommandsJSON && (
                <div style={{ marginBottom:"8px" }}>
                  <div style={{ fontSize:"10px", letterSpacing:"2px", color:"#6b7280", textTransform:"uppercase", marginBottom:"3px" }}>
                    JSON array (for programmatic use)
                  </div>
                  <div style={{ background:"#dcfce7", border:"1px solid #86efac", borderRadius:"6px", padding:"8px 10px", color:"#166534", wordBreak:"break-all", maxHeight:"56px", overflowY:"auto", fontSize:"11px" }}>
                    {carCommandsJSON}
                  </div>
                </div>
              )}

              {/* Copy buttons */}
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"12px" }}>
                {[
                  { label:"Copy command string", text: carCommands,               disabled: !carCommands },
                  { label:"Copy JSON array",      text: carCommandsJSON,           disabled: !carCommandsJSON },
                  { label:"Copy raw path",        text: JSON.stringify(pathArray), disabled: !pathArray.length },
                ].map(btn => (
                  <button key={btn.label} className="btn-act"
                    onClick={() => navigator.clipboard.writeText(btn.text)}
                    disabled={btn.disabled}
                    style={{ fontSize:"12px", padding:"5px 12px", border:"1px solid #86efac", borderRadius:"6px", cursor: btn.disabled ? "not-allowed" : "pointer", background:"#fff", color:"#166534", opacity: btn.disabled ? 0.5 : 1 }}>
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Bluetooth section */}
              <div style={{ borderTop:"1px solid #bbf7d0", paddingTop:"10px" }}>
                <div style={{ fontSize:"10px", letterSpacing:"2px", color:"#6b7280", textTransform:"uppercase", marginBottom:"6px" }}>
                  Bluetooth — send to car · Chrome desktop / Android only
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"8px" }}>
                  <div style={{
                    width:"9px", height:"9px", borderRadius:"50%", flexShrink:0,
                    background: btStatus === "connected" ? "#16a34a" : btStatus === "error" ? "#dc2626" : "#9ca3af",
                  }} />
                  <span style={{ fontSize:"12px", color:"#374151" }}>
                    {btStatus === "connected" ? `Connected: ${btDevice?.name || "device"}` : btStatus === "error" ? "Connection error" : "Not connected"}
                  </span>
                </div>
                <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"6px" }}>
                  <button className="btn-act" onClick={connectBluetooth}
                    disabled={btStatus === "connected"}
                    style={{ fontSize:"12px", padding:"5px 12px", border:"1px solid #86efac", borderRadius:"6px", cursor: btStatus === "connected" ? "not-allowed" : "pointer", background:"#fff", color:"#166534", opacity: btStatus === "connected" ? 0.5 : 1 }}>
                    📡 Connect BT device
                  </button>
                  <button className="btn-act" onClick={sendBluetoothCommands}
                    disabled={btStatus !== "connected" || !carCommands}
                    style={{ fontSize:"12px", padding:"5px 12px", border:"1px solid #86efac", borderRadius:"6px", cursor:(btStatus !== "connected" || !carCommands) ? "not-allowed" : "pointer", background:(btStatus === "connected" && carCommands) ? "#15803d" : "#e2e8f0", color:(btStatus === "connected" && carCommands) ? "#fff" : "#94a3b8" }}>
                    ▶ Send to car
                  </button>
                  <button className="btn-act" onClick={disconnectBluetooth}
                    disabled={btStatus !== "connected"}
                    style={{ fontSize:"12px", padding:"5px 12px", border:"1px solid #fca5a5", borderRadius:"6px", cursor: btStatus !== "connected" ? "not-allowed" : "pointer", background:"#fff", color:"#dc2626", opacity: btStatus !== "connected" ? 0.5 : 1 }}>
                    Disconnect
                  </button>
                </div>
                {btLog && (
                  <div style={{ fontSize:"11px", color: btLog.startsWith("✓") ? "#15803d" : "#6b7280" }}>
                    {btLog}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Grid */}
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"10px", background:"#f8f9fc", overflow:"auto", touchAction:"none" }}>
            <div
              onMouseLeave={() => setIsDrawing(false)}
              onTouchEnd={() => setIsDrawing(false)}
              style={{
                display:"grid",
                gridTemplateColumns:`repeat(${COLS}, 1fr)`,
                gap:"1px", background:"#d1d5db",
                border:"3px solid #d1d5db", borderRadius:"10px",
                padding:"3px", userSelect:"none", touchAction:"none",
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
                    onTouchStart={(e) => { e.preventDefault(); setIsDrawing(true); handleCellInteraction(r, c); }}
                    onTouchMove={(e) => {
                      e.preventDefault();
                      if (!isDrawing || mode !== "wall") return;
                      const t = e.touches[0];
                      const el = document.elementFromPoint(t.clientX, t.clientY);
                      if (el && el.dataset.r !== undefined) handleCellInteraction(+el.dataset.r, +el.dataset.c);
                    }}
                    data-r={r} data-c={c}
                    style={{ width:"100%", aspectRatio:"1", background:bg, minWidth:"4px", minHeight:"4px" }}
                  />
                );
              }))}
            </div>
          </div>

          <div className="footer-hint" style={{ padding:"6px 16px", background:"#fff", borderTop:"1px solid #e8ecf5", fontSize:"10px", color:"#94a3b8", display:"flex", gap:"12px", flexWrap:"wrap" }}>
            <span>Draw walls by clicking/dragging · Place source/target via Draw Mode · Click ⚡ Run All & Compare to find the best path</span>
            <span>After visualizing, click 🚗 Generate Car Commands · AI: <strong>{providerLabel}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}