import { useState, useRef, useEffect } from "react";
import { PRIORITY_LEVELS } from "../../lib/constants";
import { colors, fonts, fontSizes, spacing, radii, shadows, transitions } from "../../lib/theme";

export default function PriorityDot({ priority, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const p = PRIORITY_LEVELS.find((l) => l.id === priority) || PRIORITY_LEVELS[1];

  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <span
        onClick={() => setOpen(!open)}
        style={{
          color: p.dot,
          cursor: "pointer",
          display: "inline-flex", alignItems: "center",
          fontSize: 11,
          flexShrink: 0,
          transition: transitions.fast,
          lineHeight: 1,
        }}
        title={`Priorité: ${p.label}`}
      >
        {p.icon}
      </span>
      {open && (
        <div style={{
          position: "absolute", left: 0, top: "100%", marginTop: 4,
          display: "flex", flexDirection: "column", gap: 2,
          background: colors.bgSurface, border: `1px solid ${colors.border}`,
          borderRadius: radii.lg, padding: spacing.xs, zIndex: 25,
          boxShadow: shadows.md, minWidth: 110,
        }}>
          {PRIORITY_LEVELS.map((l) => (
            <button
              key={l.id}
              onClick={() => { onChange(l.id); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: spacing.sm,
                padding: `${spacing.xs + 2}px ${spacing.sm}px`,
                background: l.id === priority ? colors.surface2 : "none",
                border: "none", borderRadius: radii.sm,
                color: l.dot, cursor: "pointer",
                fontSize: fontSizes.sm, fontFamily: fonts.body,
                textAlign: "left", transition: transitions.fast,
              }}
              onMouseEnter={e => { if (l.id !== priority) e.currentTarget.style.background = colors.surface2; }}
              onMouseLeave={e => { if (l.id !== priority) e.currentTarget.style.background = "none"; }}
            >
              <span style={{ fontSize: 11, width: 14, textAlign: "center" }}>{l.icon}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
