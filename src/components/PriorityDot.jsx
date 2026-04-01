import { useState } from "react";
import { PRIORITY_LEVELS } from "../lib/constants";

export default function PriorityDot({ priority, onChange }) {
  const [open, setOpen] = useState(false);
  const p = PRIORITY_LEVELS.find((l) => l.id === priority) || PRIORITY_LEVELS[1];

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <span
        onClick={() => setOpen(!open)}
        style={{
          width: 10, height: 10, borderRadius: "50%", background: p.dot,
          cursor: "pointer", display: "inline-block", flexShrink: 0,
        }}
        title={`Priorité: ${p.label}`}
      />
      {open && (
        <span style={{
          position: "absolute", left: 16, top: -4, display: "flex", gap: 4,
          background: "#1E1E24", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 6, padding: "4px 6px", zIndex: 20,
        }}>
          {PRIORITY_LEVELS.map((l) => (
            <span
              key={l.id}
              onClick={() => { onChange(l.id); setOpen(false); }}
              style={{
                width: 14, height: 14, borderRadius: "50%", background: l.dot,
                cursor: "pointer", border: l.id === priority ? "2px solid #fff" : "2px solid transparent",
              }}
              title={l.label}
            />
          ))}
        </span>
      )}
    </span>
  );
}
