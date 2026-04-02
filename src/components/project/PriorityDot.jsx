import { useState } from "react";
import { PRIORITY_LEVELS } from "../../lib/constants";
import { colors, radii, shadows, transitions } from "../../lib/theme";

export default function PriorityDot({ priority, onChange }) {
  const [open, setOpen] = useState(false);
  const p = PRIORITY_LEVELS.find((l) => l.id === priority) || PRIORITY_LEVELS[1];

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <span
        onClick={() => setOpen(!open)}
        style={{
          width: 10, height: 10, borderRadius: radii.full, background: p.dot,
          cursor: "pointer", display: "inline-block", flexShrink: 0,
          transition: transitions.fast,
          boxShadow: `0 0 0 2px transparent`,
        }}
        title={`Priorité: ${p.label}`}
      />
      {open && (
        <span style={{
          position: "absolute", left: 18, top: -6, display: "flex", gap: 6,
          background: colors.bgSurface, border: `1px solid ${colors.border}`,
          borderRadius: radii.lg, padding: "6px 8px", zIndex: 20,
          boxShadow: shadows.md,
        }}>
          {PRIORITY_LEVELS.map((l) => (
            <span
              key={l.id}
              onClick={() => { onChange(l.id); setOpen(false); }}
              style={{
                width: 16, height: 16, borderRadius: radii.full, background: l.dot,
                cursor: "pointer",
                border: l.id === priority ? "2px solid #fff" : "2px solid transparent",
                transition: transitions.fast,
              }}
              title={l.label}
            />
          ))}
        </span>
      )}
    </span>
  );
}
