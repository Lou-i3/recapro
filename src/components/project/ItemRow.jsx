import { useState } from "react";
import EditableText from "./EditableText";
import PriorityDot from "./PriorityDot";
import StatusBadge from "./StatusBadge";
import { TERMINAL_STATUSES } from "../../lib/constants";
import { colors, fonts, fontSizes, spacing, radii, transitions } from "../../lib/theme";

export default function ItemRow({
  item, onUpdate, onDelete, sections, categories, dragHandlers,
  children, childCount, doneCount, onAddChild, isChild,
}) {
  const [expanded, setExpanded] = useState(false);
  const [childrenOpen, setChildrenOpen] = useState(true);
  const [hovered, setHovered] = useState(false);
  const cat = categories.find(c => c.id === item.category) || categories[0];
  const isTerminal = TERMINAL_STATUSES.has(item.status);
  const hasChildren = childCount > 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        draggable={!isChild}
        {...(isChild ? {} : dragHandlers)}
        style={{
          background: isTerminal ? colors.surface1 : colors.surface2,
          borderRadius: radii.lg,
          padding: `${spacing.sm}px ${spacing.md}px`,
          marginBottom: 2,
          marginLeft: isChild ? 24 : 0,
          color: isTerminal ? colors.textMuted : colors.text,
          borderLeft: `3px solid ${cat.color}`,
          transition: transitions.normal,
          cursor: isChild ? 'default' : 'grab',
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
          {/* Collapse toggle for parents with children */}
          {hasChildren && (
            <span
              onClick={() => setChildrenOpen(!childrenOpen)}
              style={{
                cursor: 'pointer', fontSize: fontSizes.xs, color: colors.textMuted,
                userSelect: 'none', width: 14, textAlign: 'center', flexShrink: 0,
              }}
            >
              {childrenOpen ? '▼' : '▶'}
            </span>
          )}

          <StatusBadge
            categoryId={item.category}
            status={item.status}
            onChange={(s) => onUpdate({ status: s })}
          />

          <PriorityDot priority={item.priority} onChange={(p) => onUpdate({ priority: p })} />

          <div style={{
            flex: 1, minWidth: 0,
            textDecoration: isTerminal ? 'line-through' : 'none',
            textDecorationColor: colors.textMuted,
          }}>
            <EditableText
              value={item.text}
              onChange={(t) => onUpdate({ text: t })}
              placeholder="Nouvel élément…"
            />
          </div>

          {/* Child count */}
          {hasChildren && (
            <span style={{
              fontSize: fontSizes.xs, fontFamily: fonts.mono,
              color: doneCount === childCount ? colors.green : colors.textMuted,
              flexShrink: 0,
            }}>
              {doneCount}/{childCount}
            </span>
          )}

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
            <button onClick={() => {
              const label = item.text || 'cet élément';
              const msg = hasChildren
                ? `Supprimer « ${label} » et ses ${childCount} sous-élément${childCount > 1 ? 's' : ''} ?`
                : `Supprimer « ${label} » ?`;
              if (window.confirm(msg)) onDelete();
            }} style={{
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
          <div style={{ marginTop: spacing.sm, marginLeft: hasChildren ? 14 : 0 }}>
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

      {/* Children (sub-items) */}
      {hasChildren && childrenOpen && (
        <div style={{
          borderLeft: `1px solid ${colors.borderLight}`,
          marginLeft: 14,
          paddingLeft: 0,
          marginTop: 1,
        }}>
          {children}
        </div>
      )}

      {/* Add sub-item button — only visible on hover */}
      {!isChild && childrenOpen && hovered && (
        <div style={{ marginLeft: 24, marginBottom: 1 }}>
          <button
            onClick={onAddChild}
            style={{
              background: 'none',
              border: 'none',
              borderRadius: radii.sm,
              color: colors.dimmed,
              cursor: 'pointer',
              fontSize: fontSizes.xs,
              fontFamily: fonts.body,
              padding: '1px 10px',
              transition: transitions.fast,
              textAlign: 'left',
            }}
            onMouseEnter={e => e.target.style.color = colors.textSecondary}
            onMouseLeave={e => e.target.style.color = colors.dimmed}
          >
            + Sub-item
          </button>
        </div>
      )}
    </div>
  );
}
