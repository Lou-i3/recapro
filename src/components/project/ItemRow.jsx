import { useState, useRef, useEffect } from "react";
import EditableText from "./EditableText";
import PriorityDot from "./PriorityDot";
import StatusBadge from "./StatusBadge";

import { colors, fonts, fontSizes, spacing, radii, transitions, shadows } from "../../lib/theme";

export default function ItemRow({
  item, onUpdate, onDelete, sections, categories, dragHandlers,
  children, childCount, doneCount, onAddChild, isChild,
}) {
  const [expanded, setExpanded] = useState(false);
  const [childrenOpen, setChildrenOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState(false);
  const menuRef = useRef(null);
  const cat = categories.find(c => c.id === item.category) || categories[0];
  const isDimmed = item.status === 'closed';
  const hasChildren = childCount > 0;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  const menuItemStyle = {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: `${spacing.xs + 2}px ${spacing.md}px`,
    background: 'none', border: 'none', borderRadius: radii.sm,
    color: colors.textSecondary, cursor: 'pointer',
    fontSize: fontSizes.sm, fontFamily: fonts.body,
    textAlign: 'left', transition: transitions.fast,
  };

  return (
    <div>
      <div
        draggable={!isChild}
        {...(isChild ? {} : dragHandlers)}
        style={{
          background: isDimmed ? colors.surface1 : colors.surface2,
          borderRadius: radii.lg,
          padding: `${spacing.sm}px ${spacing.md}px`,
          marginBottom: 2,
          marginLeft: isChild ? 24 : 0,
          color: isDimmed ? colors.textMuted : colors.text,
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
            textDecoration: isDimmed ? 'line-through' : 'none',
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

          {/* Owner display (read-only, only if filled) */}
          {item.owner && !editingOwner && (
            <span
              onClick={() => setEditingOwner(true)}
              style={{
                fontSize: fontSizes.sm, color: colors.blue,
                cursor: 'pointer', flexShrink: 0,
                maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
              title="Modifier l'owner"
            >
              @{item.owner}
            </span>
          )}

          {/* Owner inline edit */}
          {editingOwner && (
            <input
              autoFocus
              defaultValue={item.owner}
              onBlur={(e) => {
                onUpdate({ owner: e.target.value.trim() });
                setEditingOwner(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { onUpdate({ owner: e.target.value.trim() }); setEditingOwner(false); }
                if (e.key === 'Escape') setEditingOwner(false);
              }}
              placeholder="Owner…"
              style={{
                fontSize: fontSizes.sm, color: colors.text,
                background: colors.surface3, border: `1px solid ${colors.borderInput}`,
                borderRadius: radii.sm, padding: '2px 6px',
                width: 90, outline: 'none', fontFamily: fonts.body,
              }}
            />
          )}

          <span style={{ display: "flex", alignItems: "center", gap: spacing.xs, flexShrink: 0 }}>
            <button onClick={() => setExpanded(!expanded)} style={{
              background: "none", border: "none",
              color: item.note ? colors.purple : colors.dimmed,
              cursor: "pointer", fontSize: fontSizes.md, padding: "2px 4px",
              transition: transitions.fast,
            }} title="Annexe / note">
              📎
            </button>

            {/* ⋯ menu */}
            <span ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  background: "none", border: "none", color: colors.textMuted,
                  cursor: "pointer", fontSize: fontSizes.md, padding: "2px 4px",
                  transition: transitions.fast,
                }}
                onMouseEnter={e => e.target.style.color = colors.text}
                onMouseLeave={e => e.target.style.color = colors.textMuted}
              >⋯</button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 4,
                  background: colors.bgSurface, border: `1px solid ${colors.border}`,
                  borderRadius: radii.lg, padding: spacing.xs,
                  zIndex: 30, boxShadow: shadows.md, minWidth: 180,
                }}>
                  {/* Owner */}
                  <button
                    onClick={() => { setMenuOpen(false); setEditingOwner(true); }}
                    style={menuItemStyle}
                    onMouseEnter={e => e.currentTarget.style.background = colors.surface2}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    {item.owner ? `Modifier owner (@${item.owner})` : 'Ajouter un owner'}
                  </button>

                  {/* Add sub-item */}
                  {!isChild && (
                    <button
                      onClick={() => { setMenuOpen(false); onAddChild(); }}
                      style={menuItemStyle}
                      onMouseEnter={e => e.currentTarget.style.background = colors.surface2}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      Ajouter un sous-élément
                    </button>
                  )}

                  {/* Move to category */}
                  <div style={{ padding: `${spacing.xs}px ${spacing.md}px`, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <span style={{ fontSize: fontSizes.sm, color: colors.textMuted, whiteSpace: 'nowrap' }}>Catégorie :</span>
                    <select
                      value={item.category}
                      onChange={(e) => { onUpdate({ category: e.target.value }); setMenuOpen(false); }}
                      style={{
                        fontSize: fontSizes.sm, background: colors.bgSurface, color: colors.textSecondary,
                        border: `1px solid ${colors.borderInput}`, borderRadius: radii.sm, padding: "3px 6px",
                        flex: 1,
                      }}
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                    </select>
                  </div>

                  {/* Move to section */}
                  <div style={{ padding: `${spacing.xs}px ${spacing.md}px`, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <span style={{ fontSize: fontSizes.sm, color: colors.textMuted, whiteSpace: 'nowrap' }}>Section :</span>
                    <select
                      value={item.section}
                      onChange={(e) => { onUpdate({ section: e.target.value }); setMenuOpen(false); }}
                      style={{
                        fontSize: fontSizes.sm, background: colors.bgSurface, color: colors.textSecondary,
                        border: `1px solid ${colors.borderInput}`, borderRadius: radii.sm, padding: "3px 6px",
                        flex: 1,
                      }}
                    >
                      {sections.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Separator */}
                  <div style={{ height: 1, background: colors.borderLight, margin: `${spacing.xs}px 0` }} />

                  {/* Delete */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      const label = item.text || 'cet élément';
                      const msg = hasChildren
                        ? `Supprimer « ${label} » et ses ${childCount} sous-élément${childCount > 1 ? 's' : ''} ?`
                        : `Supprimer « ${label} » ?`;
                      if (window.confirm(msg)) onDelete();
                    }}
                    style={{ ...menuItemStyle, color: colors.red }}
                    onMouseEnter={e => e.currentTarget.style.background = colors.surface2}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </span>
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
    </div>
  );
}
