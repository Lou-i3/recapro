import { Link } from 'react-router-dom';
import { useAllProjects } from '../hooks/useAllProjects';
import { CATEGORIES, PRIORITY_LEVELS } from '../lib/constants';
import { colors, fonts, fontSizes, spacing, radii, transitions } from '../lib/theme';

export default function TasksInProgressPage() {
  const { projects, loading } = useAllProjects();

  if (loading) return <div style={{ color: colors.textMuted }}>Chargement…</div>;

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const inProgress = projects
    .flatMap(p =>
      (p.items || [])
        .filter(i => !i.done)
        .map(i => ({ ...i, _projectSlug: p.slug, _projectName: p.projectName }))
    )
    .sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1));

  return (
    <div style={{ fontFamily: fonts.body, maxWidth: 900 }}>
      <h2 style={{ color: colors.text, fontWeight: 600, marginBottom: spacing.sm, fontSize: fontSizes.xl }}>
        Tâches en cours
      </h2>
      <p style={{ fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: spacing.xl }}>
        {inProgress.length} tâche{inProgress.length !== 1 ? 's' : ''} en cours
      </p>

      {inProgress.length === 0 ? (
        <p style={{ color: colors.textMuted, fontStyle: 'italic' }}>
          Toutes les tâches sont terminées !
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {inProgress.map(item => {
            const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[0];
            const prio = PRIORITY_LEVELS.find(l => l.id === item.priority);
            return (
              <Link
                key={item.id}
                to={`/project/${item._projectSlug}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: spacing.md,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  background: colors.surface1, borderRadius: radii.md,
                  textDecoration: 'none', color: 'inherit',
                  borderLeft: `3px solid ${cat.color}`,
                  transition: transitions.fast,
                  fontSize: fontSizes.base,
                }}
                onMouseEnter={e => e.currentTarget.style.background = colors.surface3}
                onMouseLeave={e => e.currentTarget.style.background = colors.surface1}
              >
                {prio && (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: prio.dot, flexShrink: 0,
                  }} />
                )}
                <span style={{ fontSize: fontSizes.sm }}>{cat.icon}</span>
                <span style={{ flex: 1, color: colors.text }}>
                  {item.text || 'Sans titre'}
                </span>
                <span style={{
                  fontSize: fontSizes.sm, color: colors.textMuted,
                  fontFamily: fonts.mono, flexShrink: 0,
                }}>
                  {item._projectName}
                </span>
                {item.owner && (
                  <span style={{ fontSize: fontSizes.sm, color: colors.blue, flexShrink: 0 }}>
                    @{item.owner}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
