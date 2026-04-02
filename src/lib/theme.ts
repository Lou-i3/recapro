import type { CSSProperties } from 'react';
import type { CategoryId } from '../types';

// ─── Design Tokens ───

export const colors = {
  bg: '#1C1C1E',
  bgContent: '#222226',
  bgSidebar: '#161618',
  bgSurface: '#2C2C2E',

  text: '#E6E6EB',
  textSecondary: '#9898A4',
  textMuted: '#6E6E80',

  blue: '#4EA8DE',
  blueBg: 'rgba(78,168,222,0.12)',
  blueBorder: 'rgba(78,168,222,0.25)',

  red: '#E25D5D',
  green: '#6BC06B',
  yellow: '#E8B931',
  purple: '#C77DBA',

  surface1: 'rgba(255,255,255,0.03)',
  surface2: 'rgba(255,255,255,0.05)',
  surface3: 'rgba(255,255,255,0.07)',
  surfaceHover: 'rgba(255,255,255,0.09)',

  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.05)',
  borderInput: 'rgba(255,255,255,0.14)',
  borderDashed: 'rgba(255,255,255,0.12)',

  surfaceDecisions: 'rgba(232,185,49,0.04)',
  surfaceActions: 'rgba(78,168,222,0.04)',
  surfaceQuestions: 'rgba(199,125,186,0.04)',
  surfaceNotes: 'rgba(78,168,222,0.02)',
  surfaceStats: 'rgba(107,192,107,0.03)',

  dimmed: 'rgba(255,255,255,0.35)',
  placeholder: 'rgba(255,255,255,0.3)',
} as const;

export const categoryBg: Record<CategoryId, string> = {
  decisions: 'rgba(232,185,49,0.04)',
  actions: 'rgba(78,168,222,0.04)',
  questions: 'rgba(199,125,186,0.04)',
};

export const fonts = {
  body: "Lato, sans-serif",
  mono: "'Space Mono', monospace",
} as const;

export const fontSizes = {
  xs: 10,
  sm: 11,
  base: 13,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 26,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radii = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: '50%',
} as const;

export const shadows = {
  sm: '0 2px 6px rgba(0,0,0,0.25)',
  md: '0 4px 16px rgba(0,0,0,0.35)',
  lg: '0 8px 32px rgba(0,0,0,0.45)',
} as const;

export const transitions = {
  fast: 'all 0.15s ease',
  normal: 'all 0.2s ease',
} as const;

// ─── Shared style presets ───

export const labelStyle: CSSProperties = {
  fontFamily: fonts.mono,
  fontSize: fontSizes.sm,
  color: colors.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

export const cardStyle: CSSProperties = {
  background: colors.surface2,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.lg,
  padding: `${spacing.lg}px ${spacing.xl}px`,
};

export const inputStyle: CSSProperties = {
  background: colors.surface2,
  border: `1px solid ${colors.borderInput}`,
  borderRadius: radii.sm,
  color: colors.text,
  fontSize: fontSizes.base,
  fontFamily: fonts.body,
  padding: '6px 10px',
  outline: 'none',
  transition: transitions.fast,
};

export const buttonStyle: CSSProperties = {
  background: colors.surface2,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  color: colors.textSecondary,
  cursor: 'pointer',
  fontSize: fontSizes.sm,
  fontFamily: fonts.body,
  padding: '6px 12px',
  transition: transitions.fast,
};

export const buttonPrimaryStyle: CSSProperties = {
  ...buttonStyle,
  background: colors.blueBg,
  border: `1px solid ${colors.blueBorder}`,
  color: colors.blue,
};

export const buttonDashedStyle: CSSProperties = {
  background: 'none',
  border: `1px dashed ${colors.borderDashed}`,
  borderRadius: radii.md,
  color: colors.dimmed,
  cursor: 'pointer',
  fontSize: fontSizes.sm,
  fontFamily: fonts.body,
  padding: '5px 12px',
  width: '100%',
  transition: transitions.fast,
};
