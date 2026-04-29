'use client';

import { useState, useRef, useEffect, useMemo } from "react";
import type { Item, CategoryId, ItemLink, LinkType } from "../../types";
import { CATEGORIES, COMPLETED_STATUSES, QUICK_LINK_BY_CATEGORY, STATUS_BY_CATEGORY } from "../../lib/constants";
import type { LinkDirection } from "../../lib/constants";
import { colors, fonts, fontSizes, spacing, radii, transitions, shadows } from "../../lib/theme";
import { CheckCircle, Circle, Lightbulb, Link as LinkIcon } from "../ui/icons";
import ItemPicker from "./ItemPicker";

interface LinkSectionProps {
  item: Item;
  allItems: Item[];
  sections: string[];
  reverseLinks: { sourceId: string; type: LinkType }[];
  onAddLink: (link: ItemLink) => void;
  onAddReverseLink: (targetId: string, link: ItemLink) => void;
  onRemoveLink: (targetId: string, type: LinkType) => void;
  onRemoveLinkFromSource: (sourceId: string, targetId: string, type: LinkType) => void;
  onScrollToItem: (itemId: string) => void;
  onCreateAndLink: (categoryId: CategoryId, section: string, text: string, linkType: LinkType, direction: LinkDirection) => void;
  onUnblock: () => void;
}

interface ResolvedLink {
  item: Item;
  type: LinkType;
  direction: 'forward' | 'reverse';
}

// Link groups for display
interface LinkGroup {
  key: string;
  label: string;
  links: ResolvedLink[];
}

function getStatusColor(targetItem: Item): string {
  const statuses = STATUS_BY_CATEGORY[targetItem.category];
  const match = statuses?.find(s => s.id === targetItem.status);
  return match?.color || colors.textMuted;
}

export default function LinkSection({
  item, allItems, sections, reverseLinks, onAddLink, onAddReverseLink,
  onRemoveLink, onRemoveLinkFromSource, onScrollToItem,
  onCreateAndLink, onUnblock,
}: LinkSectionProps) {
  const [activePicker, setActivePicker] = useState<string | null>(null);

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

  // Group links by semantic type
  const linkGroups = useMemo((): LinkGroup[] => {
    const groups: LinkGroup[] = [
      { key: 'stems-from-fwd', label: 'Stems from', links: resolvedLinks.filter(l => l.type === 'stems-from' && l.direction === 'forward') },
      { key: 'stems-from-rev', label: 'Leads to', links: resolvedLinks.filter(l => l.type === 'stems-from' && l.direction === 'reverse') },
      { key: 'depends-on-fwd', label: 'Depends on', links: resolvedLinks.filter(l => l.type === 'depends-on' && l.direction === 'forward') },
      { key: 'depends-on-rev', label: 'Blocks', links: resolvedLinks.filter(l => l.type === 'depends-on' && l.direction === 'reverse') },
      { key: 'related', label: 'Related', links: resolvedLinks.filter(l => l.type === 'related') },
    ];
    return groups.filter(g => g.links.length > 0);
  }, [resolvedLinks]);

  const dependsOnLinks = resolvedLinks.filter(l => l.type === 'depends-on' && l.direction === 'forward');
  const allDepsResolved = dependsOnLinks.length > 0 && dependsOnLinks.every(l => COMPLETED_STATUSES.has(l.item.status));
  const isBlocked = item.status === 'blocked';
  const hasDependsOn = dependsOnLinks.length > 0;

  const quickLinks = QUICK_LINK_BY_CATEGORY[item.category] || [];

  const linkedItemIds = useMemo(() => {
    const ids = new Set<string>([item.id]);
    for (const link of (item.links || [])) ids.add(link.targetId);
    for (const rl of reverseLinks) ids.add(rl.sourceId);
    return ids;
  }, [item.id, item.links, reverseLinks]);

  const handleSelectExisting = (target: Item, linkType: LinkType, direction: LinkDirection) => {
    if (direction === 'forward') {
      // Link stored on the selected item, pointing to current item
      onAddReverseLink(target.id, { targetId: item.id, type: linkType });
    } else {
      // Link stored on current item, pointing to selected item
      onAddLink({ targetId: target.id, type: linkType });
    }
    setActivePicker(null);
  };

  const handleCreateNew = (text: string, section: string, category: CategoryId, linkType: LinkType, direction: LinkDirection) => {
    onCreateAndLink(category, section, text, linkType, direction);
    setActivePicker(null);
  };

  const getCategoryColor = (categoryId: CategoryId): string =>
    CATEGORIES.find(c => c.id === categoryId)?.color || colors.textMuted;

  const dashedBtnStyle = {
    background: 'none',
    borderWidth: 1, borderStyle: 'dashed' as const, borderColor: colors.borderDashed,
    borderRadius: radii.sm, padding: '2px 8px',
    fontSize: fontSizes.xs, color: colors.textMuted, cursor: 'pointer' as const,
    fontFamily: fonts.body, transition: transitions.fast,
  };

  const dashedBtnHover = (e: React.MouseEvent<HTMLButtonElement>, enter: boolean) => {
    e.currentTarget.style.borderColor = enter ? colors.borderInput : colors.borderDashed;
    e.currentTarget.style.color = enter ? colors.textSecondary : colors.textMuted;
  };

  const renderLinkChip = (link: ResolvedLink, idx: number) => {
    const catColor = getCategoryColor(link.item.category);
    const statusColor = getStatusColor(link.item);
    const isDepForward = link.type === 'depends-on' && link.direction === 'forward';
    const depResolved = isDepForward && COMPLETED_STATUSES.has(link.item.status);

    return (
      <div
        key={`${link.item.id}-${link.type}-${link.direction}-${idx}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '3px 8px', borderRadius: radii.sm,
          fontSize: fontSizes.sm,
          background: colors.surface1,
          borderLeft: `2px solid ${catColor}`,
        }}
      >
        {isDepForward && (
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            color: depResolved ? colors.green : colors.red,
            flexShrink: 0,
          }}>
            {depResolved
              ? <CheckCircle size={12} weight="fill" />
              : <Circle size={12} weight="fill" />}
          </span>
        )}
        <span style={{
          fontSize: fontSizes.xs, fontFamily: fonts.mono,
          color: colors.textSecondary, minWidth: 26, flexShrink: 0,
        }}>{link.item.shortId}</span>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: statusColor, flexShrink: 0,
        }} />
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
        {link.item.section !== item.section && (
          <span style={{
            fontSize: fontSizes.xs, color: colors.textMuted,
            background: colors.surface2, padding: '1px 4px', borderRadius: radii.sm,
            flexShrink: 0,
          }}>{link.item.section}</span>
        )}
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
        >×</button>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: spacing.sm }}>
      {/* Grouped links display */}
      {linkGroups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
          {linkGroups.map(group => (
            <div key={group.key}>
              <div style={{
                fontSize: fontSizes.xs, color: colors.textMuted,
                fontFamily: fonts.mono, textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 2,
              }}>
                {group.label} ({group.links.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {group.links.map((link, idx) => renderLinkChip(link, idx))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unblock suggestion */}
      {isBlocked && allDepsResolved && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: spacing.xs,
          padding: `${spacing.xs}px ${spacing.sm}px`,
          background: `${colors.green}12`, borderRadius: radii.sm,
          marginTop: spacing.xs,
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', color: colors.green }}>
            <Lightbulb size={14} weight="regular" />
          </span>
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
          <span style={{ display: 'inline-flex', alignItems: 'center', color: colors.red }}>
            <LinkIcon size={14} weight="regular" />
          </span>
          <span style={{ fontSize: fontSizes.xs, color: colors.textMuted, flex: 1 }}>
            Blocked item — link the blocker?
          </span>
          <button
            onClick={() => setActivePicker('link-existing')}
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

      {/* Quick-create and link buttons */}
      <div style={{
        display: 'flex', gap: spacing.xs, flexWrap: 'wrap', alignItems: 'center',
        marginTop: linkGroups.length > 0 ? spacing.xs : 0,
      }}>
        {quickLinks.map((ql, idx) => (
          <div key={idx} style={{ position: 'relative' }}>
            <button
              onClick={() => setActivePicker(activePicker === `quick-${idx}` ? null : `quick-${idx}`)}
              style={{
                ...dashedBtnStyle,
                ...(activePicker === `quick-${idx}` ? {
                  borderColor: colors.borderInput,
                  color: colors.textSecondary,
                } : {}),
              }}
              onMouseEnter={e => dashedBtnHover(e, true)}
              onMouseLeave={e => { if (activePicker !== `quick-${idx}`) dashedBtnHover(e, false); }}
            >
              + {ql.label}
            </button>
            {activePicker === `quick-${idx}` && (
              <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 4, zIndex: 50 }}>
                <ItemPicker
                  allItems={allItems}
                  sections={sections}
                  excludeIds={linkedItemIds}
                  filterFn={ql.targetCategory ? (i => i.category === ql.targetCategory) : undefined}
                  onSelectExisting={(target) => handleSelectExisting(target, ql.linkType, ql.direction)}
                  onCreateNew={(text, section, category) => handleCreateNew(text, section, category, ql.linkType, ql.direction)}
                  defaultCategory={ql.targetCategory || undefined}
                  defaultSection={item.section}
                  lockCategory={!!ql.targetCategory}
                  placeholder={`Search ${ql.targetCategory ? CATEGORIES.find(c => c.id === ql.targetCategory)?.label.toLowerCase() : 'items'}…`}
                  onClose={() => setActivePicker(null)}
                />
              </div>
            )}
          </div>
        ))}

        {/* Generic "Link existing" */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setActivePicker(activePicker === 'link-existing' ? null : 'link-existing')}
            style={{
              ...dashedBtnStyle,
              ...(activePicker === 'link-existing' ? {
                borderColor: colors.borderInput,
                color: colors.textSecondary,
              } : {}),
            }}
            onMouseEnter={e => dashedBtnHover(e, true)}
            onMouseLeave={e => { if (activePicker !== 'link-existing') dashedBtnHover(e, false); }}
          >
            + Link existing
          </button>
          {activePicker === 'link-existing' && (
            <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 4, zIndex: 50 }}>
              <LinkExistingPicker
                item={item}
                allItems={allItems}
                linkedItemIds={linkedItemIds}
                onAddLink={onAddLink}
                onAddReverseLink={onAddReverseLink}
                onClose={() => setActivePicker(null)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Dedicated picker for "Link existing" with direction selection (keeps the original PICKER_OPTIONS UX)
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

function LinkExistingPicker({
  item, allItems, linkedItemIds, onAddLink, onAddReverseLink, onClose,
}: {
  item: Item;
  allItems: Item[];
  linkedItemIds: Set<string>;
  onAddLink: (link: ItemLink) => void;
  onAddReverseLink: (targetId: string, link: ItemLink) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedOption, setSelectedOption] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    let candidates = allItems.filter(i => !linkedItemIds.has(i.id));
    if (q) {
      candidates = candidates.filter(i =>
        i.text.toLowerCase().includes(q) ||
        i.shortId?.toLowerCase().includes(q)
      );
    }
    return candidates.slice(0, 8);
  }, [allItems, query, linkedItemIds]);

  const handleLink = (targetId: string) => {
    const opt = PICKER_OPTIONS[selectedOption];
    if (opt.direction === 'forward') {
      onAddLink({ targetId, type: opt.type });
    } else {
      onAddReverseLink(targetId, { targetId: item.id, type: opt.type });
    }
    onClose();
  };

  return (
    <div ref={containerRef} style={{
      background: colors.bgSurface, border: `1px solid ${colors.border}`,
      borderRadius: radii.lg, padding: spacing.sm, boxShadow: shadows.md,
      minWidth: 300, maxWidth: 420,
    }}>
      <div style={{ display: 'flex', gap: spacing.xs, marginBottom: spacing.xs }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
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
        {results.map(target => {
          const tCat = CATEGORIES.find(c => c.id === target.category) || CATEGORIES[0];
          const TCatIcon = tCat.icon;
          return (
            <button
              key={target.id}
              onClick={() => handleLink(target.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                width: '100%', padding: '4px 8px',
                background: 'none', border: 'none', borderRadius: radii.sm,
                color: colors.textSecondary,
                cursor: 'pointer',
                fontSize: fontSizes.sm, fontFamily: fonts.body,
                textAlign: 'left', transition: transitions.fast,
              }}
              onMouseEnter={e => e.currentTarget.style.background = colors.surface2}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ fontSize: fontSizes.xs, fontFamily: fonts.mono, color: tCat.color, minWidth: 28 }}>
                {target.shortId}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', color: tCat.color }}>
                <TCatIcon size={12} weight="regular" />
              </span>
              <span style={{
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {target.text || 'Untitled'}
              </span>
            </button>
          );
        })}
        {results.length === 0 && (
          <div style={{ padding: '8px', fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center' }}>
            No results
          </div>
        )}
      </div>
    </div>
  );
}
