import { useLocation } from 'react-router-dom';
import { colors, fonts, fontSizes, spacing } from '../../lib/theme';

const titles = {
  '/dashboard': 'Dashboard',
  '/tasks/by-project': 'Mes tâches — Par projet',
  '/tasks/in-progress': 'Mes tâches — En cours',
};

export default function Header() {
  const { pathname } = useLocation();

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
      padding: `0 ${spacing.xxl}px`,
      borderBottom: `1px solid ${colors.borderLight}`,
      background: colors.bg,
      fontFamily: fonts.mono,
      fontSize: fontSizes.sm,
      color: colors.textMuted,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    }}>
      {title}
    </header>
  );
}
