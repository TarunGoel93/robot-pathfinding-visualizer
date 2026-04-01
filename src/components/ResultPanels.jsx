// ===================== RESULT PANELS =====================
import { ALGOS } from "../constants.js";

export function RunAllResultsPanel({ allAlgoResults, bestAlgo, autoRunningAlgo, onClose }) {
  if (!allAlgoResults || autoRunningAlgo) return null;

  return (
    <div className="fade-up" style={{ background: "#fff", borderBottom: "1px solid #e8ecf5", padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#94a3b8", fontFamily: "'DM Mono',monospace", textTransform: "uppercase" }}>
          ⚡ Run All Results — Best Path Highlighted
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "16px" }}>✕</button>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {allAlgoResults.map(a => {
          const isBest = bestAlgo && a.id === ALGOS.find(al => al.label === bestAlgo.label)?.id;
          return (
            <div key={a.id} className="slide-in" style={{
              flex: "1", minWidth: "130px",
              background: isBest ? `${a.color}12` : "#f8f9fc",
              border: isBest ? `2px solid ${a.color}` : "1.5px solid #e8ecf5",
              borderRadius: "10px", padding: "12px 14px", position: "relative"
            }}>
              {isBest && (
                <div style={{
                  position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)",
                  background: a.color, color: "#fff", fontSize: "9px", fontWeight: "700",
                  letterSpacing: "1.5px", padding: "2px 8px", borderRadius: "4px", whiteSpace: "nowrap"
                }}>
                  🏆 BEST PATH
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span style={{ fontSize: "16px" }}>{a.icon}</span>
                <span style={{ fontWeight: "700", color: a.color, fontSize: "13px" }}>{a.label}</span>
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", display: "flex", flexDirection: "column", gap: "3px", fontFamily: "'DM Mono',monospace" }}>
                <span>Path: <b style={{ color: a.found ? "#374151" : "#dc2626" }}>{a.found ? `${a.pathLen} steps` : "no path"}</b></span>
                <span>Visited: <b style={{ color: "#374151" }}>{a.visited.toLocaleString()}</b></span>
                <span>Time: <b style={{ color: "#374151" }}>{a.time}ms</b></span>
              </div>
            </div>
          );
        })}
      </div>

      {bestAlgo && (
        <div style={{ marginTop: "10px", fontSize: "11px", color: "#64748b", fontFamily: "'DM Mono',monospace" }}>
          ↳ Showing <span style={{ color: bestAlgo.color, fontWeight: "700" }}>{bestAlgo.icon} {bestAlgo.label}</span>'s path on the grid (shortest path · fewest visited as tiebreaker)
        </div>
      )}
      {!bestAlgo && (
        <div style={{ marginTop: "10px", fontSize: "11px", color: "#dc2626", fontFamily: "'DM Mono',monospace" }}>
          ✗ No algorithm found a path. Try clearing walls or repositioning start/end.
        </div>
      )}
    </div>
  );
}

export function BenchmarkPanel({ benchmarks, ROWS, COLS, maxBenchTime, onClose }) {
  if (!benchmarks) return null;

  return (
    <div className="fade-up" style={{ background: "#fff", borderBottom: "1px solid #e8ecf5", padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#94a3b8", fontFamily: "'DM Mono',monospace", textTransform: "uppercase" }}>
          Benchmark Results — {ROWS}×{COLS} grid · 20 runs avg
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "16px" }}>✕</button>
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {benchmarks.map((b, i) => (
          <div key={b.id} className="slide-in" style={{
            flex: "1", minWidth: "140px",
            background: i === 0 ? "#f0fdf4" : "#f8f9fc",
            border: i === 0 ? "1.5px solid #86efac" : "1.5px solid #e8ecf5",
            borderRadius: "10px", padding: "12px 14px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <span style={{ fontSize: "16px" }}>{b.icon}</span>
              <span style={{ fontWeight: "700", color: b.color, fontSize: "13px" }}>{b.label}</span>
              {i === 0 && (
                <span style={{ marginLeft: "auto", fontSize: "10px", background: "#22c55e", color: "#fff", borderRadius: "4px", padding: "1px 6px" }}>FASTEST</span>
              )}
            </div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "20px", fontWeight: "700", color: b.color, marginBottom: "4px" }}>
              {b.time < 1 ? `${(b.time * 1000).toFixed(1)}µs` : `${b.time.toFixed(3)}ms`}
            </div>
            <div style={{ background: "#e2e8f0", borderRadius: "4px", height: "4px", marginBottom: "8px" }}>
              <div style={{ width: `${(b.time / maxBenchTime) * 100}%`, height: "100%", background: b.color, borderRadius: "4px", transition: "width 0.6s ease" }} />
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", display: "flex", flexDirection: "column", gap: "2px" }}>
              <span>Visited: <b style={{ color: "#374151" }}>{b.visited.toLocaleString()}</b></span>
              <span>Path: <b style={{ color: "#374151" }}>{b.found ? `${b.pathLen} steps` : "no path"}</b></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}