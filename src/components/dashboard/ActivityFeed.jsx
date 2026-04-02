import { Link } from 'react-router-dom';
import { CATEGORIES } from '../../lib/constants';
import { colors, fonts, fontSizes, spacing, radii, transitions } from '../../lib/theme';

export default function ActivityFeed({ projects }) {
  const allItems = projects.flatMap(p =>
    (p.items || []).map(item => ({ ...item, _projectSlug: p.slug, _projectName: p.projectName }))
  );

  const recent = allItems
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 20);

  if (recent.length === 0) {
    return (
      <p style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: fontSizes.base }}>
        Aucune activité récente.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {recent.map(item => {
        const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[0];
        const date = item.createdAt
          ? new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
          : '';
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
            }}
            onMouseEnter={e => e.currentTarget.style.background = colors.surface3}
            onMouseLeave={e => e.currentTarget.style.background = colors.surface1}
          >
            <span style={{ fontSize: fontSizes.md }}>{cat.icon}</span>
            <span style={{
              flex: 1, fontSize: fontSizes.base, color: item.done ? colors.textMuted : colors.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textDecoration: item.done ? 'line-through' : 'none',
              textDecorationColor: colors.textMuted,
            }}>
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
            <span style={{
              fontSize: fontSizes.xs, color: colors.textMuted,
              fontFamily: fonts.mono, flexShrink: 0,
            }}>
              {date}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
