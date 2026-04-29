'use client';

import { useRef, useEffect } from 'react';
import { colors, fontSizes, spacing, radii, transitions, inputStyle, TOOLBAR_HEIGHT } from '../../lib/theme';
import { MagnifyingGlass, X, Eye, EyeSlash } from './icons';

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  showHidden: boolean;
  onShowHiddenChange: (show: boolean) => void;
  hideLabel?: string;
  children?: React.ReactNode;
}

export default function Toolbar({
  searchQuery,
  onSearchChange,
  showHidden,
  onShowHiddenChange,
  hideLabel = 'closed',
  children,
}: ToolbarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => {
      document.documentElement.style.setProperty('--toolbar-self-h', `${el.offsetHeight}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--toolbar-self-h');
    };
  }, []);

  return (
    <div
      ref={rootRef}
      style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: colors.bgContent,
        borderBottom: `1px solid ${colors.borderLight}`,
        marginBottom: spacing.md,
        padding: `${spacing.sm}px ${spacing.xxl}px`,
        minHeight: TOOLBAR_HEIGHT,
        display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap',
      }}
    >
      <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 320 }}>
        <span style={{
          position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
          color: colors.textMuted, pointerEvents: 'none',
          display: 'inline-flex', alignItems: 'center',
        }}>
          <MagnifyingGlass size={14} weight="regular" />
        </span>
        <input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`Search items… (${navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+K)`}
          style={{
            ...inputStyle,
            fontSize: fontSizes.sm,
            height: 28,
            padding: '0 8px 0 28px',
            width: '100%',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            title="Clear"
            style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: colors.textMuted,
              cursor: 'pointer', padding: '2px 4px',
              display: 'inline-flex', alignItems: 'center',
            }}
          ><X size={14} weight="bold" /></button>
        )}
      </div>

      <span style={{ flex: 1 }} />

      {children}

      <button
        onClick={() => onShowHiddenChange(!showHidden)}
        title={showHidden ? `Hide ${hideLabel}` : `Show ${hideLabel}`}
        style={{
          width: 28, height: 28,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: showHidden ? colors.blueBg : 'transparent',
          color: showHidden ? colors.blue : colors.textMuted,
          border: `1px solid ${showHidden ? colors.blueBorder : colors.border}`,
          borderRadius: radii.md, cursor: 'pointer',
          transition: transitions.fast,
        }}
      >
        {showHidden ? <Eye size={14} weight="regular" /> : <EyeSlash size={14} weight="regular" />}
      </button>
    </div>
  );
}
