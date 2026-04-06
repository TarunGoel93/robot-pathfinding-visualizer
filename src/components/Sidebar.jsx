// ===================== SIDEBAR =====================
import { SectionLabel } from "./UIComponents.jsx";
import { ALGOS, DRAW_MODES, LEGEND_ITEMS } from "../constants.js";

export default function Sidebar({
  algo, setAlgo,
  mode, setMode,
  threshold, setThreshold,
  speed, speedLabel,
  setSpeed,
  clearVisualization,
  onClose,
}) {
  return (
    <div style={{
      width: "240px", background: "#fff", borderRight: "1px solid #e8ecf5",
      padding: "16px 12px", display: "flex", flexDirection: "column",
      gap: "16px", overflowY: "auto", height: "100%",
    }}>

      {/* Mobile close button */}
      {onClose && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"-8px" }}>
          <span style={{ fontSize:"11px", fontWeight:"600", color:"#64748b", letterSpacing:"1px", textTransform:"uppercase" }}>Settings</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:"20px", lineHeight:1, padding:"2px 6px" }}>✕</button>
        </div>
      )}

      {/* Algorithm selector */}
      <div>
        <SectionLabel>Algorithm</SectionLabel>
        {ALGOS.map(a => (
          <button key={a.id} className="btn-act"
            onClick={() => { setAlgo(a.id); clearVisualization(); onClose?.(); }}
            style={{
              background: algo === a.id ? `${a.color}12` : "transparent",
              border: algo === a.id ? `1.5px solid ${a.color}55` : "1.5px solid #e8ecf5",
              color: algo === a.id ? a.color : "#64748b",
              padding: "8px 10px", borderRadius: "8px", width: "100%",
              textAlign: "left", marginBottom: "4px", fontFamily: "inherit", fontSize: "12px"
            }}>
            <span style={{ marginRight: "8px" }}>{a.icon}</span>{a.label}
          </button>
        ))}
      </div>

      {/* Draw mode */}
      <div>
        <SectionLabel>Draw Mode</SectionLabel>
        {DRAW_MODES.map(m => (
          <button key={m.id} className="btn-act" onClick={() => { setMode(m.id); onClose?.(); }}
            style={{
              background: mode === m.id ? `${m.color}12` : "transparent",
              border: mode === m.id ? `1.5px solid ${m.color}55` : "1.5px solid #e8ecf5",
              color: mode === m.id ? m.color : "#64748b",
              padding: "8px 10px", borderRadius: "8px", width: "100%",
              textAlign: "left", marginBottom: "4px", fontFamily: "inherit", fontSize: "12px"
            }}>
            {m.icon} {m.label}
          </button>
        ))}
        <div style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'DM Mono',monospace", marginTop: "4px", lineHeight: "1.6" }}>
          Click grid to place <span style={{ color: "#16a34a", fontWeight: "600" }}>Source</span> or{" "}
          <span style={{ color: "#d97706", fontWeight: "600" }}>Target</span>, then press{" "}
          <span style={{ color: "#059669", fontWeight: "600" }}>⚡ Run All & Compare</span>
        </div>
      </div>

      {/* Wall Threshold */}
      <div>
        <SectionLabel>Wall Threshold (image)</SectionLabel>
        <input type="range" min="80" max="200" value={threshold}
          onChange={e => setThreshold(+e.target.value)} style={{ width: "100%" }} />
        <div style={{ textAlign: "center", fontSize: "11px", color: "#64748b" }}>Value: {threshold}</div>
      </div>

      {/* Animation Speed */}
      <div>
        <SectionLabel>Animation Speed</SectionLabel>
        <input type="range" min="1" max="25" value={speed}
          onChange={e => setSpeed(+e.target.value)}
          style={{ width: "100%", accentColor: "#2563eb" }} />
        <div style={{
          textAlign: "center", fontSize: "11px",
          color: speed >= 24 ? "#2563eb" : "#64748b",
          fontWeight: speed >= 24 ? "600" : "400"
        }}>
          {speedLabel}
        </div>
      </div>

      {/* Legend */}
      <div>
        <SectionLabel>Legend</SectionLabel>
        {LEGEND_ITEMS.map(([color, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", fontSize: "12px", color: "#64748b" }}>
            <div style={{ width: "13px", height: "13px", borderRadius: "3px", background: color, flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}