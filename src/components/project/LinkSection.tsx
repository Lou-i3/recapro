'use client';

import { useState, useRef, useEffect, useMemo } from "react";
import type { Item, Category, CategoryId, ItemLink, LinkType } from "../../types";
import { COMPLETED_STATUSES, LINK_LABELS } from "../../lib/constants";
import { colors, fonts, fontSizes, spacing, radii, transitions, shadows } from "../../lib/theme";

// Picker options: forward stores on this item, reverse stores on the target
type PickerDirection = 'forward' | 'reverse';
interface PickerOption {
  label: string;
  type: LinkType;
  direction: PickerDirection;
}

const PICKER_OPTIONS: PickerOption[] = [
  { label: 'this depends on →',  type: 'depends-on', direction: 'forward' },
  { label: '← this blocks',      type: 'depends-on', direction: 'reverse' },
  { label: 'this stems from →',  type: 'stems-from', direction: 'forward' },
  { label: '← this leads to',    type: 'stems-from', direction: 'reverse' },
  { label: '↔ related to',       type: 'related',    direction: 'forward' },
];

interface LinkSectionProps {
  item: Item;
  allItems: Item[];
  reverseLinks: { sourceId: string; type: LinkType }[];
  onAddLink: (link: ItemLink) => void;
  onAddReverseLink: (targetId: string, link: ItemLink) => void;
  onRemoveLink: (targetId: string, type: LinkType) => void;
  onRemoveLinkFromSource: (sourceId: string, targetId: string, type: LinkType) => void;
  onScrollToItem: (itemId: string) => void;
  onAddLinkedItem: (categoryId: CategoryId, linkType: LinkType) => void;
  onAddBlockingItem: (categoryId: CategoryId) => void;
  onUnblock: () => void;
  categories: readonly Category[];
}

interface ResolvedLink {
  item: Item;
  type: LinkType;
  direction: 'forward' | 'reverse';
}

export default function LinkSection({
  item, allItems, reverseLinks, onAddLink, onAddReverseLink, onRemoveLink, onRemoveLinkFromSource,
  onScrollToItem, onAddLinkedItem, onAddBlockingItem, onUnblock, categories,
}: LinkSectionProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOption, setSelectedOption] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && inputRef.current) inputRef.current.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const handle = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [searchOpen]);

  const resolvedLinks = useMemo((): ResolvedLink[] => {
    const links: ResolvedLink[] = [];
    for (const link of (item.links || [])) {
      const target = allItems.find(i => i.id === link.targetId);
      if (target) links.push({ item: target, type: link.type, direction: 'forward' });
    }
    for (const rl of reverseLinks) {
      const source = allItems.find(i => i.id === rl.sourceId);
      if (source) links.push({ item: source, type: rl.type, direction: 'reverse' });
    }
    return links;
  }, [item.links, reverseLinks, allItems]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return allItems.filter(i => i.id !== item.id).slice(0, 8);
    const q = searchQuery.toLowerCase();
    return allItems
      .filter(i => i.id !== item.id && (
        i.text.toLowerCase().includes(q) ||
        i.shortId?.toLowerCase().includes(q)
      ))
      .slice(0, 8);
  }, [searchQuery, allItems, item.id]);

  const dependsOnLinks = resolvedLinks.filter(l => l.type === 'depends-on' && l.direction === 'forward');
  const allDepsResolved = dependsOnLinks.length > 0 && dependsOnLinks.every(l => COMPLETED_STATUSES.has(l.item.status));
  const isBlocked = item.status === 'blocked';
  const hasDependsOn = dependsOnLinks.length > 0;

  const getLinkLabel = (type: LinkType, direction: 'forward' | 'reverse') => {
    const labels = LINK_LABELS[type];
    return direction === 'forward' ? labels.forward : labels.reverse;
  };

  const getLinkArrow = (direction: 'forward' | 'reverse', type: LinkType) => {
    if (type === 'related') return '↔';
    return direction === 'forward' ? '→' : '←';
  };

  const getDepIcon = (link: ResolvedLink) => {
    if (link.type !== 'depends-on') return null;
    if (link.direction === 'forward') {
      return COMPLETED_STATUSES.has(link.item.status) ? '✅' : '🔴';
    }
    return null;
  };

  const getCatForItem = (targetItem: Item) =>
    categories.find(c => c.id === targetItem.category) || categories[0];

  const handlePickerLink = (targetId: string) => {
    const opt = PICKER_OPTIONS[selectedOption];
    if (opt.direction === 'forward') {
      onAddLink({ targetId, type: opt.type });
    } else {
      // Reverse: store the link on the target, pointing to this item
      onAddReverseLink(targetId, { targetId: item.id, type: opt.type });
    }
    setSearchOpen(false);
    setSearchQuery("");
  };

  const dashedBtnStyle = {
    background: 'none', border: `1px dashed ${colors.borderDashed}`,
    borderRadius: radii.sm, padding: '2px 8px',
    fontSize: fontSizes.xs, color: colors.textMuted, cursor: 'pointer' as const,
    fontFamily: fonts.body, transition: transitions.fast,
  };

  const dashedBtnHover = (e: React.MouseEvent<HTMLButtonElement>, enter: boolean) => {
    e.currentTarget.style.borderColor = enter ? colors.borderInput : colors.borderDashed;
    e.currentTarget.style.color = enter ? colors.textSecondary : colors.textMuted;
  };

  function renderSearchPicker() {
    return (
      <div ref={searchRef} style={{
        marginTop: spacing.xs,
        background: colors.bgSurface, border: `1px solid ${colors.border}`,
        borderRadius: radii.lg, padding: spacing.sm,
        boxShadow: shadows.md, maxWidth: 420,
      }}>
        <div style={{ display: 'flex', gap: spacing.xs, marginBottom: spacing.xs }}>
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search items…"
            style={{
              flex: 1, fontSize: fontSizes.sm, color: colors.text,
              background: colors.surface2, border: `1px solid ${colors.borderInput}`,
              borderRadius: radii.sm, padding: '4px 8px',
              outline: 'none', fontFamily: fonts.body,
            }}
          />
          <select
            value={selectedOption}
            onChange={e => setSelectedOption(Number(e.target.value))}
            style={{
              fontSize: fontSizes.xs, background: colors.surface2, color: colors.textSecondary,
              border: `1px solid ${colors.borderInput}`, borderRadius: radii.sm, padding: '4px 6px',
              fontFamily: fonts.body,
            }}
          >
            {PICKER_OPTIONS.map((opt, i) => (
              <option key={i} value={i}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {searchResults.map(target => {
            const tCat = getCatForItem(target);
            const alreadyLinked = (item.links || []).some(l => l.targetId === target.id)
              || reverseLinks.some(rl => rl.sourceId === target.id);
            return (
              <button
                key={target.id}
                disabled={alreadyLinked}
                onClick={() => handlePickerLink(target.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', padding: '4px 8px',
                  background: 'none', border: 'none', borderRadius: radii.sm,
                  color: alreadyLinked ? colors.dimmed : colors.textSecondary,
                  cursor: alreadyLinked ? 'default' : 'pointer',
                  fontSize: fontSizes.sm, fontFamily: fonts.body,
                  textAlign: 'left', transition: transitions.fast,
                  opacity: alreadyLinked ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!alreadyLinked) e.currentTarget.style.background = colors.surface2; }}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ fontSize: fontSizes.xs, fontFamily: fonts.mono, color: tCat.color, minWidth: 28 }}>
                  {target.shortId}
                </span>
                <span style={{ fontSize: 11 }}>{tCat.icon}</span>
                <span style={{
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {target.text || 'Untitled'}
                </span>
                {alreadyLinked && <span style={{ fontSize: fontSizes.xs, color: colors.dimmed }}>already linked</span>}
              </button>
            );
          })}
          {searchResults.length === 0 && (
            <div style={{ padding: '8px', fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center' }}>
              No results
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderButtons() {
    return (
      <div style={{
        display: 'flex', gap: spacing.xs, flexWrap: 'wrap', alignItems: 'center',
        marginTop: resolvedLinks.length > 0 ? spacing.xs : 0,
      }}>
        <button
          onClick={() => onAddLinkedItem('actions', 'stems-from')}
          style={dashedBtnStyle}
          onMouseEnter={e => dashedBtnHover(e, true)}
          onMouseLeave={e => dashedBtnHover(e, false)}
        >
          + Action from this
        </button>
        <button
          onClick={() => onAddBlockingItem('questions')}
          style={dashedBtnStyle}
          onMouseEnter={e => dashedBtnHover(e, true)}
          onMouseLeave={e => dashedBtnHover(e, false)}
        >
          + Blocking question
        </button>
        <button
          onClick={() => { setSearchOpen(true); setSearchQuery(""); }}
          style={dashedBtnStyle}
          onMouseEnter={e => dashedBtnHover(e, true)}
          onMouseLeave={e => dashedBtnHover(e, false)}
        >
          + Link existing
        </button>
      </div>
    );
  }

  if (resolvedLinks.length === 0 && !searchOpen) {
    return (
      <div style={{ marginBottom: spacing.sm }}>
        {renderButtons()}
        {searchOpen && renderSearchPicker()}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: spacing.sm }}>
      {/* Links list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {resolvedLinks.map((link, idx) => {
          const depIcon = getDepIcon(link);
          const arrow = getLinkArrow(link.direction, link.type);
          return (
            <div
              key={`${link.item.id}-${link.type}-${link.direction}-${idx}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '3px 8px', borderRadius: radii.sm,
                fontSize: fontSizes.sm,
                background: colors.surface1,
              }}
            >
              {depIcon && <span style={{ fontSize: 10 }}>{depIcon}</span>}
              <span style={{
                fontSize: fontSizes.xs, color: colors.textSecondary,
                fontFamily: fonts.mono, width: 14, textAlign: 'center', flexShrink: 0,
              }}>
                {arrow}
              </span>
              <span style={{
                fontSize: fontSizes.xs, color: colors.textMuted,
                minWidth: 72, flexShrink: 0,
              }}>
                {getLinkLabel(link.type, link.direction)}
              </span>
              <span style={{
                fontSize: fontSizes.xs, fontFamily: fonts.mono,
                color: colors.textSecondary, minWidth: 28, flexShrink: 0,
              }}>
                {link.item.shortId}
              </span>
              <span
                onClick={() => onScrollToItem(link.item.id)}
                style={{
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  cursor: 'pointer', color: colors.textSecondary,
                  transition: transitions.fast,
                }}
                onMouseEnter={e => e.currentTarget.style.color = colors.text}
                onMouseLeave={e => e.currentTarget.style.color = colors.textSecondary}
                title={`Go to ${link.item.shortId}: ${link.item.text}`}
              >
                {link.item.text || 'Untitled'}
              </span>
              <button
                onClick={() => {
                  if (link.direction === 'forward') {
                    onRemoveLink(link.item.id, link.type);
                  } else {
                    onRemoveLinkFromSource(link.item.id, item.id, link.type);
                  }
                }}
                style={{
                  background: 'none', border: 'none', color: colors.dimmed,
                  cursor: 'pointer', fontSize: 11, padding: '0 2px',
                  transition: transitions.fast, flexShrink: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.color = colors.red}
                onMouseLeave={e => e.currentTarget.style.color = colors.dimmed}
                title="Remove link"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Unblock suggestion */}
      {isBlocked && allDepsResolved && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: spacing.xs,
          padding: `${spacing.xs}px ${spacing.sm}px`,
          background: `${colors.green}12`, borderRadius: radii.sm,
          marginTop: spacing.xs,
        }}>
          <span style={{ fontSize: fontSizes.sm }}>💡</span>
          <span style={{ fontSize: fontSizes.xs, color: colors.green, flex: 1 }}>
            All dependencies resolved
          </span>
          <button
            onClick={onUnblock}
            style={{
              background: colors.green, color: '#fff', border: 'none',
              borderRadius: radii.sm, padding: '2px 8px',
              fontSize: fontSizes.xs, cursor: 'pointer', fontFamily: fonts.body,
            }}
          >
            Unblock → todo
          </button>
        </div>
      )}

      {/* Suggest linking when blocked without deps */}
      {isBlocked && !hasDependsOn && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: spacing.xs,
          padding: `${spacing.xs}px ${spacing.sm}px`,
          background: `${colors.red}08`, borderRadius: radii.sm,
          marginTop: spacing.xs,
        }}>
          <span style={{ fontSize: fontSizes.sm }}>🔗</span>
          <span style={{ fontSize: fontSizes.xs, color: colors.textMuted, flex: 1 }}>
            Blocked item — link the blocker?
          </span>
          <button
            onClick={() => { setSearchOpen(true); setSelectedOption(0); setSearchQuery(""); }}
            style={{
              background: 'none', border: `1px solid ${colors.borderInput}`,
              borderRadius: radii.sm, padding: '2px 8px',
              fontSize: fontSizes.xs, color: colors.textSecondary, cursor: 'pointer',
              fontFamily: fonts.body,
            }}
          >
            + Link
          </button>
        </div>
      )}

      {renderButtons()}
      {searchOpen && renderSearchPicker()}
    </div>
  );
}
