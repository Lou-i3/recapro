'use client';

import { useState, useRef, useEffect } from 'react';
import { STATUS_BY_CATEGORY } from '../../lib/constants';
import { colors, fonts, fontSizes, radii, shadows, transitions, spacing } from '../../lib/theme';
import type { CategoryId } from '../../types';

interface StatusBadgeProps {
  categoryId: CategoryId;
  status: string;
  onChange: (status: string) => void;
}

export default function StatusBadge({ categoryId, status, onChange }: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const statuses = STATUS_BY_CATEGORY[categoryId] || STATUS_BY_CATEGORY.actions;
  const current = statuses.find(s => s.id === status) || statuses[0];

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          background: current.color + '18',
          border: `1px solid ${current.color}33`,
          borderRadius: radii.sm,
          padding: '2px 8px',
          cursor: 'pointer',
          fontSize: fontSizes.xs,
          fontFamily: fonts.mono,
          color: current.color,
          letterSpacing: '0.02em',
          transition: transitions.fast,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: current.color, flexShrink: 0,
        }} />
        {current.label}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: '100%',
          marginTop: 4,
          background: colors.bgSurface,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.lg,
          padding: spacing.xs,
          zIndex: 25,
          boxShadow: shadows.md,
          minWidth: 130,
        }}>
          {statuses.map(s => (
            <button
              key={s.id}
              onClick={() => { onChange(s.id); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: `${spacing.xs + 2}px ${spacing.sm}px`,
                background: s.id === status ? colors.surface2 : 'none',
                border: 'none',
                borderRadius: radii.sm,
                color: s.color,
                cursor: 'pointer',
                fontSize: fontSizes.sm,
                fontFamily: fonts.mono,
                textAlign: 'left',
                transition: transitions.fast,
              }}
              onMouseEnter={e => { if (s.id !== status) e.currentTarget.style.background = colors.surface2; }}
              onMouseLeave={e => { if (s.id !== status) e.currentTarget.style.background = 'none'; }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: s.color, flexShrink: 0,
              }} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
