'use client';

import { useState, useRef, useEffect, useMemo } from "react";
import type { Item, Category, CategoryId, ItemLink, LinkType } from "../../types";
import { CATEGORIES, COMPLETED_STATUSES, LINK_LABELS } from "../../lib/constants";
import { colors, fonts, fontSizes, spacing, radii, transitions, shadows } from "../../lib/theme";

interface LinkSectionProps {
  item: Item;
  allItems: Item[];
  reverseLinks: { sourceId: string; type: LinkType }[];
  onAddLink: (link: ItemLink) => void;
  onRemoveLink: (targetId: string, type: LinkType) => void;
  onScrollToItem: (itemId: string) => void;
  onAddLinkedItem: (categoryId: CategoryId, linkType: LinkType) => void;
  onUnblock: () => void;
  categories: readonly Category[];
}

interface ResolvedLink {
  item: Item;
  type: LinkType;
  direction: 'forward' | 'reverse';
}

export default function LinkSection({
  item, allItems, reverseLinks, onAddLink, onRemoveLink,
  onScrollToItem, onAddLinkedItem, onUnblock, categories,
}: LinkSectionProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLinkType, setSelectedLinkType] = useState<LinkType>("depends-on");
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

  // Resolve all links (forward + reverse) into display items
  const resolvedLinks = useMemo((): ResolvedLink[] => {
    const links: ResolvedLink[] = [];

    // Forward links (stored on this item)
    for (const link of (item.links || [])) {
      const target = allItems.find(i => i.id === link.targetId);
      if (target) links.push({ item: target, type: link.type, direction: 'forward' });
    }

    // Reverse links (other items that point to this one)
    for (const rl of reverseLinks) {
      const source = allItems.find(i => i.id === rl.sourceId);
      if (source) links.push({ item: source, type: rl.type, direction: 'reverse' });
    }

    return links;
  }, [item.links, reverseLinks, allItems]);

  // Group by category for display
  const linksByCategory = useMemo(() => {
    const groups: Record<string, ResolvedLink[]> = {};
    for (const link of resolvedLinks) {
      const catId = link.item.category;
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(link);
    }
    return groups;
  }, [resolvedLinks]);

  // Search results
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

  // Check if all depends-on links are resolved
  const dependsOnLinks = resolvedLinks.filter(l => l.type === 'depends-on' && l.direction === 'forward');
  const allDepsResolved = dependsOnLinks.length > 0 && dependsOnLinks.every(l => COMPLETED_STATUSES.has(l.item.status));
  const isBlocked = item.status === 'blocked';
  const hasDependsOn = dependsOnLinks.length > 0;

  const getLinkLabel = (type: LinkType, direction: 'forward' | 'reverse') => {
    const labels = LINK_LABELS[type];
    return direction === 'forward' ? labels.forward : labels.reverse;
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

  if (resolvedLinks.length === 0 && !searchOpen) {
    return (
      <div style={{ marginBottom: spacing.sm }}>
        <div style={{
          display: 'flex', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <button
            onClick={() => onAddLinkedItem('actions', 'stems-from')}
            style={{
              background: 'none', border: `1px dashed ${colors.borderDashed}`,
              borderRadius: radii.sm, padding: '2px 8px',
              fontSize: fontSizes.xs, color: colors.textMuted, cursor: 'pointer',
              fontFamily: fonts.body, transition: transitions.fast,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderInput; e.currentTarget.style.color = colors.textSecondary; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = colors.borderDashed; e.currentTarget.style.color = colors.textMuted; }}
          >
            + Linked action
          </button>
          <button
            onClick={() => onAddLinkedItem('questions', 'stems-from')}
            style={{
              background: 'none', border: `1px dashed ${colors.borderDashed}`,
              borderRadius: radii.sm, padding: '2px 8px',
              fontSize: fontSizes.xs, color: colors.textMuted, cursor: 'pointer',
              fontFamily: fonts.body, transition: transitions.fast,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderInput; e.currentTarget.style.color = colors.textSecondary; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = colors.borderDashed; e.currentTarget.style.color = colors.textMuted; }}
          >
            + Linked question
          </button>
          <button
            onClick={() => { setSearchOpen(true); setSearchQuery(""); }}
            style={{
              background: 'none', border: `1px dashed ${colors.borderDashed}`,
              borderRadius: radii.sm, padding: '2px 8px',
              fontSize: fontSizes.xs, color: colors.textMuted, cursor: 'pointer',
              fontFamily: fonts.body, transition: transitions.fast,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderInput; e.currentTarget.style.color = colors.textSecondary; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = colors.borderDashed; e.currentTarget.style.color = colors.textMuted; }}
          >
            + Link existing
          </button>
        </div>

        {/* Search picker */}
        {searchOpen && renderSearchPicker()}
      </div>
    );
  }

  function renderSearchPicker() {
    return (
      <div ref={searchRef} style={{
        marginTop: spacing.xs,
        background: colors.bgSurface, border: `1px solid ${colors.border}`,
        borderRadius: radii.lg, padding: spacing.sm,
        boxShadow: shadows.md, maxWidth: 400,
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
            value={selectedLinkType}
            onChange={e => setSelectedLinkType(e.target.value as LinkType)}
            style={{
              fontSize: fontSizes.xs, background: colors.surface2, color: colors.textSecondary,
              border: `1px solid ${colors.borderInput}`, borderRadius: radii.sm, padding: '4px 6px',
              fontFamily: fonts.body,
            }}
          >
            <option value="depends-on">depends on</option>
            <option value="stems-from">stems from</option>
            <option value="related">related to</option>
          </select>
        </div>
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {searchResults.map(target => {
            const tCat = getCatForItem(target);
            const alreadyLinked = (item.links || []).some(l => l.targetId === target.id);
            return (
              <button
                key={target.id}
                disabled={alreadyLinked}
                onClick={() => {
                  onAddLink({ targetId: target.id, type: selectedLinkType });
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
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

  return (
    <div style={{ marginBottom: spacing.sm }}>
      {/* Links grouped by category */}
      {CATEGORIES.map(cat => {
        const catLinks = linksByCategory[cat.id];
        if (!catLinks || catLinks.length === 0) return null;
        return (
          <div key={cat.id} style={{ marginBottom: spacing.xs }}>
            <div style={{
              fontSize: fontSizes.xs, color: colors.textMuted, marginBottom: 2,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {catLinks.map((link, idx) => {
                const tCat = getCatForItem(link.item);
                const depIcon = getDepIcon(link);
                return (
                  <div
                    key={`${link.item.id}-${link.type}-${link.direction}-${idx}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '2px 6px', borderRadius: radii.sm,
                      fontSize: fontSizes.sm,
                      transition: transitions.fast,
                    }}
                  >
                    {depIcon && <span style={{ fontSize: 10 }}>{depIcon}</span>}
                    <span style={{
                      fontSize: fontSizes.xs, color: colors.textMuted,
                      fontStyle: 'italic', minWidth: 70,
                    }}>
                      {getLinkLabel(link.type, link.direction)}
                    </span>
                    <span style={{
                      fontSize: fontSizes.xs, fontFamily: fonts.mono,
                      color: tCat.color, minWidth: 28,
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
                    {link.direction === 'forward' && (
                      <button
                        onClick={() => onRemoveLink(link.item.id, link.type)}
                        style={{
                          background: 'none', border: 'none', color: colors.dimmed,
                          cursor: 'pointer', fontSize: 11, padding: '0 2px',
                          transition: transitions.fast,
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = colors.red}
                        onMouseLeave={e => e.currentTarget.style.color = colors.dimmed}
                        title="Remove link"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Unblock suggestion */}
      {isBlocked && allDepsResolved && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: spacing.xs,
          padding: `${spacing.xs}px ${spacing.sm}px`,
          background: `${colors.green}12`, borderRadius: radii.sm,
          marginBottom: spacing.xs,
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
          marginBottom: spacing.xs,
        }}>
          <span style={{ fontSize: fontSizes.sm }}>🔗</span>
          <span style={{ fontSize: fontSizes.xs, color: colors.textMuted, flex: 1 }}>
            Blocked item — link the blocker?
          </span>
          <button
            onClick={() => { setSearchOpen(true); setSelectedLinkType('depends-on'); setSearchQuery(""); }}
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

      {/* Action buttons */}
      <div style={{
        display: 'flex', gap: spacing.xs, flexWrap: 'wrap', alignItems: 'center',
        marginTop: spacing.xs,
      }}>
        <button
          onClick={() => onAddLinkedItem('actions', 'stems-from')}
          style={{
            background: 'none', border: `1px dashed ${colors.borderDashed}`,
            borderRadius: radii.sm, padding: '2px 8px',
            fontSize: fontSizes.xs, color: colors.textMuted, cursor: 'pointer',
            fontFamily: fonts.body, transition: transitions.fast,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderInput; e.currentTarget.style.color = colors.textSecondary; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = colors.borderDashed; e.currentTarget.style.color = colors.textMuted; }}
        >
          + Linked action
        </button>
        <button
          onClick={() => onAddLinkedItem('questions', 'stems-from')}
          style={{
            background: 'none', border: `1px dashed ${colors.borderDashed}`,
            borderRadius: radii.sm, padding: '2px 8px',
            fontSize: fontSizes.xs, color: colors.textMuted, cursor: 'pointer',
            fontFamily: fonts.body, transition: transitions.fast,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderInput; e.currentTarget.style.color = colors.textSecondary; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = colors.borderDashed; e.currentTarget.style.color = colors.textMuted; }}
        >
          + Linked question
        </button>
        <button
          onClick={() => { setSearchOpen(true); setSearchQuery(""); }}
          style={{
            background: 'none', border: `1px dashed ${colors.borderDashed}`,
            borderRadius: radii.sm, padding: '2px 8px',
            fontSize: fontSizes.xs, color: colors.textMuted, cursor: 'pointer',
            fontFamily: fonts.body, transition: transitions.fast,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderInput; e.currentTarget.style.color = colors.textSecondary; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = colors.borderDashed; e.currentTarget.style.color = colors.textMuted; }}
        >
          + Link existing
        </button>
      </div>

      {/* Search picker */}
      {searchOpen && renderSearchPicker()}
    </div>
  );
}
