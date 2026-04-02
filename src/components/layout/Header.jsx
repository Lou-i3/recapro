import { useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { LayoutContext } from './Layout';
import { colors, fonts, fontSizes, spacing, transitions } from '../../lib/theme';

const titles = {
  '/dashboard': 'Dashboard',
  '/tasks/by-project': 'Mes tâches — Par projet',
  '/tasks/in-progress': 'Mes tâches — En cours',
};

export default function Header() {
  const { pathname } = useLocation();
  const { sidebarOpen, toggleSidebar } = useContext(LayoutContext);

  let title = titles[pathname];
  if (!title && pathname.startsWith('/project/')) {
    title = 'Projet';
  }
  title = title || 'Project Status';

  return (
    <header style={{
      height: 52,
      minHeight: 52,
      display: 'flex',
      alignItems: 'center',
      gap: spacing.md,
      padding: `0 ${spacing.xxl}px`,
      borderBottom: `1px solid ${colors.borderLight}`,
      background: colors.bg,
    }}>
      <button
        onClick={toggleSidebar}
        title={sidebarOpen ? 'Masquer la sidebar' : 'Afficher la sidebar'}
        style={{
          background: 'none',
          border: 'none',
          color: colors.textMuted,
          cursor: 'pointer',
          fontSize: 16,
          padding: `${spacing.xs}px`,
          display: 'flex',
          alignItems: 'center',
          transition: transitions.fast,
          borderRadius: 4,
        }}
        onMouseEnter={e => e.currentTarget.style.color = colors.text}
        onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>
      <span style={{
        fontFamily: fonts.mono,
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {title}
      </span>
    </header>
  );
}
