import { useState } from "react";
import EditableText from "./EditableText";
import PriorityDot from "./PriorityDot";
import { colors, fonts, fontSizes, spacing, radii, transitions } from "../../lib/theme";

export default function ItemRow({ item, onUpdate, onDelete, sections, categories, dragHandlers }) {
  const [expanded, setExpanded] = useState(false);
  const cat = categories.find(c => c.id === item.category) || categories[0];

  return (
    <div
      draggable
      {...dragHandlers}
      style={{
        background: item.done ? colors.surface1 : colors.surface2,
        borderRadius: radii.lg,
        padding: `${spacing.sm}px ${spacing.md}px`,
        marginBottom: spacing.xs,
        color: item.done ? colors.textMuted : colors.text,
        borderLeft: `3px solid ${cat.color}`,
        transition: transitions.normal,
        cursor: "grab",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => onUpdate({ done: !item.done })}
          style={{ accentColor: colors.blue, cursor: "pointer", flexShrink: 0 }}
        />
        <PriorityDot priority={item.priority} onChange={(p) => onUpdate({ priority: p })} />
        <div style={{
          flex: 1, minWidth: 0,
          textDecoration: item.done ? 'line-through' : 'none',
          textDecorationColor: colors.textMuted,
        }}>
          <EditableText
            value={item.text}
            onChange={(t) => onUpdate({ text: t })}
            placeholder="Nouvel élément…"
          />
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: spacing.xs + 2, flexShrink: 0 }}>
          <span style={{ fontSize: fontSizes.sm, color: colors.textSecondary, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <EditableText
              value={item.owner}
              onChange={(o) => onUpdate({ owner: o })}
              placeholder="@"
            />
          </span>
          <button onClick={() => setExpanded(!expanded)} style={{
            background: "none", border: "none",
            color: item.note ? colors.purple : colors.dimmed,
            cursor: "pointer", fontSize: fontSizes.md, padding: "2px 4px",
            transition: transitions.fast,
          }} title="Annexe / note">
            📎
          </button>
          <button onClick={onDelete} style={{
            background: "none", border: "none", color: colors.dimmed,
            cursor: "pointer", fontSize: fontSizes.base, padding: "2px 4px",
            transition: transitions.fast,
          }}
            onMouseEnter={e => e.target.style.color = colors.red}
            onMouseLeave={e => e.target.style.color = colors.dimmed}
            title="Supprimer"
          >✕</button>
        </span>
      </div>
      {expanded && (
        <div style={{ marginTop: spacing.sm, marginLeft: 28 }}>
          <EditableText
            value={item.note}
            onChange={(n) => onUpdate({ note: n })}
            placeholder="Ajouter une note / annexe…"
            multiline
          />
          <div style={{ marginTop: spacing.sm, display: "flex", gap: spacing.sm, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: fontSizes.sm, color: colors.textMuted }}>Déplacer vers :</span>
            <select
              value={item.category}
              onChange={(e) => onUpdate({ category: e.target.value })}
              style={{
                fontSize: fontSizes.sm, background: colors.bgSurface, color: colors.textSecondary,
                border: `1px solid ${colors.borderInput}`, borderRadius: radii.sm, padding: "4px 8px",
              }}
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
            <select
              value={item.section}
              onChange={(e) => onUpdate({ section: e.target.value })}
              style={{
                fontSize: fontSizes.sm, background: colors.bgSurface, color: colors.textSecondary,
                border: `1px solid ${colors.borderInput}`, borderRadius: radii.sm, padding: "4px 8px",
              }}
            >
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
