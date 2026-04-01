// ===================== SHARED UI COMPONENTS =====================

export function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: "9px", letterSpacing: "3px", color: "#94a3b8",
      marginBottom: "8px", marginTop: "2px", textTransform: "uppercase",
      fontFamily: "'DM Mono',monospace"
    }}>
      {children}
    </div>
  );
}

export function StatBadge({ label, value, color }) {
  return (
    <div style={{
      background: `${color}0e`, border: `1px solid ${color}33`,
      borderRadius: "8px", padding: "6px 12px", textAlign: "center", minWidth: "80px"
    }}>
      <div style={{ fontSize: "9px", color: "#94a3b8", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>
        {label}
      </div>
      <div style={{ fontSize: "14px", fontWeight: "700", color, fontFamily: "'DM Mono',monospace" }}>
        {value}
      </div>
    </div>
  );
}