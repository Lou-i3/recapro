'use client';

import { useState, useRef, useEffect, useMemo } from "react";
import type { Item, CategoryId } from "../../types";
import { CATEGORIES, STATUS_BY_CATEGORY } from "../../lib/constants";
import { colors, fonts, fontSizes, spacing, radii, transitions, shadows, inputStyle } from "../../lib/theme";

interface ItemPickerProps {
  allItems: Item[];
  sections: string[];
  excludeIds?: Set<string>;
  filterFn?: (item: Item) => boolean;
  onSelectExisting: (item: Item) => void;
  onCreateNew?: (text: string, section: string, category: CategoryId) => void;
  defaultCategory?: CategoryId;
  defaultSection?: string;
  lockCategory?: boolean;
  placeholder?: string;
  onClose: () => void;
}

const MAX_RESULTS = 8;

function getStatusColor(item: Item): string {
  const statuses = STATUS_BY_CATEGORY[item.category];
  const match = statuses?.find(s => s.id === item.status);
  return match?.color || colors.textMuted;
}

function getCategoryIcon(categoryId: CategoryId): string {
  return CATEGORIES.find(c => c.id === categoryId)?.icon || '';
}

export default function ItemPicker({
  allItems, sections, excludeIds, filterFn, onSelectExisting, onCreateNew,
  defaultCategory, defaultSection, lockCategory, placeholder, onClose,
}: ItemPickerProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [newTitle, setNewTitle] = useState("");
  const [newSection, setNewSection] = useState(defaultSection || sections[0] || '');
  const [newCategory, setNewCategory] = useState<CategoryId>(defaultCategory || 'actions');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'search') inputRef.current?.focus();
    else createInputRef.current?.focus();
  }, [mode]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    let candidates = allItems;
    if (filterFn) candidates = candidates.filter(filterFn);
    if (excludeIds) candidates = candidates.filter(i => !excludeIds.has(i.id));
    if (q) {
      candidates = candidates.filter(i =>
        i.text.toLowerCase().includes(q) ||
        i.shortId?.toLowerCase().includes(q) ||
        i.note?.toLowerCase().includes(q) ||
        i.owner?.toLowerCase().includes(q)
      );
    }
    return candidates.slice(0, MAX_RESULTS);
  }, [allItems, query, filterFn, excludeIds]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode !== 'search') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      onSelectExisting(results[highlightIdx]);
      onClose();
    }
  };

  const handleCreate = () => {
    const title = newTitle.trim();
    if (!title || !onCreateNew) return;
    onCreateNew(title, newSection, lockCategory ? (defaultCategory || newCategory) : newCategory);
    onClose();
  };

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + '…' : text;

  if (mode === 'create') {
    return (
      <div ref={containerRef} style={{
        background: colors.bgSurface, border: `1px solid ${colors.border}`,
        borderRadius: radii.lg, padding: spacing.md, boxShadow: shadows.md,
        minWidth: 280, maxWidth: 380,
      }}>
        <div style={{ fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.sm }}>
          Create new item
        </div>
        <input
          ref={createInputRef}
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleCreate();
            if (e.key === 'Escape') setMode('search');
          }}
          placeholder="Item title…"
          style={{ ...inputStyle, fontSize: fontSizes.sm, width: '100%', marginBottom: spacing.sm }}
        />
        <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.sm }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: fontSizes.xs, color: colors.textMuted, marginBottom: 2 }}>Section</div>
            <select
              value={newSection}
              onChange={e => setNewSection(e.target.value)}
              style={{
                fontSize: fontSizes.sm, background: colors.surface2, color: colors.text,
                border: `1px solid ${colors.borderInput}`, borderRadius: radii.sm,
                padding: '4px 6px', width: '100%',
              }}
            >
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {!lockCategory && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: fontSizes.xs, color: colors.textMuted, marginBottom: 2 }}>Category</div>
              <select
                value={lockCategory ? (defaultCategory || newCategory) : newCategory}
                onChange={e => setNewCategory(e.target.value as CategoryId)}
                style={{
                  fontSize: fontSizes.sm, background: colors.surface2, color: colors.text,
                  border: `1px solid ${colors.borderInput}`, borderRadius: radii.sm,
                  padding: '4px 6px', width: '100%',
                }}
              >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <button
            onClick={() => setMode('search')}
            style={{
              flex: 1, padding: '4px 8px', fontSize: fontSizes.sm, fontFamily: fonts.body,
              background: 'transparent', color: colors.textMuted,
              border: `1px solid ${colors.border}`, borderRadius: radii.sm, cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!newTitle.trim()}
            style={{
              flex: 1, padding: '4px 8px', fontSize: fontSizes.sm, fontFamily: fonts.body,
              background: newTitle.trim() ? colors.blue : colors.surface2,
              color: newTitle.trim() ? '#fff' : colors.textMuted,
              border: 'none', borderRadius: radii.sm, cursor: newTitle.trim() ? 'pointer' : 'default',
            }}
          >Create</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{
      background: colors.bgSurface, border: `1px solid ${colors.border}`,
      borderRadius: radii.lg, padding: spacing.sm, boxShadow: shadows.md,
      minWidth: 280, maxWidth: 380,
    }}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Search items…'}
        style={{ ...inputStyle, fontSize: fontSizes.sm, width: '100%', marginBottom: spacing.xs }}
      />

      {results.length > 0 && (
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          {results.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => { onSelectExisting(item); onClose(); }}
              onMouseEnter={() => setHighlightIdx(idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: `${spacing.xs}px ${spacing.sm}px`,
                borderRadius: radii.sm, cursor: 'pointer',
                background: idx === highlightIdx ? colors.surface2 : 'transparent',
                transition: transitions.fast,
              }}
            >
              <span style={{
                fontSize: fontSizes.xs, fontFamily: fonts.mono,
                color: colors.textMuted, flexShrink: 0, minWidth: 26,
              }}>{item.shortId}</span>
              <span style={{ fontSize: 10, flexShrink: 0 }}>
                {getCategoryIcon(item.category)}
              </span>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: getStatusColor(item), flexShrink: 0,
              }} />
              <span style={{
                fontSize: fontSizes.sm, color: colors.text,
                flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{truncate(item.text || 'Untitled', 40)}</span>
              <span style={{
                fontSize: fontSizes.xs, color: colors.textMuted,
                background: colors.surface1, padding: '1px 4px', borderRadius: radii.sm,
                flexShrink: 0,
              }}>{item.section}</span>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && query.trim() && (
        <div style={{
          padding: `${spacing.sm}px`, fontSize: fontSizes.sm, color: colors.textMuted,
          textAlign: 'center',
        }}>No matching items</div>
      )}

      {onCreateNew && (
        <button
          onClick={() => { setNewTitle(query); setMode('create'); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            width: '100%', padding: `${spacing.xs}px ${spacing.sm}px`,
            background: 'none', border: `1px dashed ${colors.borderDashed}`,
            borderRadius: radii.sm, cursor: 'pointer',
            color: colors.textMuted, fontSize: fontSizes.sm, fontFamily: fonts.body,
            marginTop: spacing.xs, transition: transitions.fast,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderInput; e.currentTarget.style.color = colors.textSecondary; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = colors.borderDashed; e.currentTarget.style.color = colors.textMuted; }}
        >
          + Create new{query.trim() ? ` "${truncate(query.trim(), 20)}"` : ''}…
        </button>
      )}
    </div>
  );
}
