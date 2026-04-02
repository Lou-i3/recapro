import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAllProjects } from '../hooks/useAllProjects';
import { CATEGORIES, STATUS_BY_CATEGORY, COMPLETED_STATUSES } from '../lib/constants';
import { colors, fonts, fontSizes, spacing, radii, transitions } from '../lib/theme';

export default function TasksByProjectPage() {
  const { projects, loading } = useAllProjects();
  const [collapsed, setCollapsed] = useState({});

  if (loading) return <div style={{ color: colors.textMuted }}>Chargement…</div>;

  if (projects.length === 0) {
    return (
      <div style={{ fontFamily: fonts.body }}>
        <h2 style={{ color: colors.text, fontWeight: 600, marginBottom: spacing.sm, fontSize: fontSizes.xl }}>Tâches par projet</h2>
        <p style={{ fontStyle: 'italic', color: colors.textMuted }}>Aucun projet.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: fonts.body, maxWidth: 900, padding: spacing.xxl }}>
      <h2 style={{ color: colors.text, fontWeight: 600, marginBottom: spacing.xl, fontSize: fontSizes.xl }}>
        Tâches par projet
      </h2>
      {projects.map(p => {
        const items = (p.items || []).filter(i => !i.parentId);
        const isCollapsed = collapsed[p.slug];
        return (
          <div key={p.slug} style={{ marginBottom: spacing.xl }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: spacing.sm,
                paddingBottom: spacing.sm, borderBottom: `1px solid ${colors.borderLight}`,
                marginBottom: spacing.sm, cursor: 'pointer',
              }}
              onClick={() => setCollapsed(prev => ({ ...prev, [p.slug]: !prev[p.slug] }))}
            >
              <span style={{ fontSize: fontSizes.sm, color: colors.textMuted, userSelect: 'none' }}>
                {isCollapsed ? '▶' : '▼'}
              </span>
              <Link to={`/project/${p.slug}`} style={{
                fontWeight: 600, fontSize: fontSizes.lg, color: colors.text, textDecoration: 'none',
              }} onClick={e => e.stopPropagation()}>
                {p.projectName}
              </Link>
              <span style={{ fontSize: fontSizes.sm, color: colors.textMuted }}>
                {items.length} élément{items.length !== 1 ? 's' : ''}
              </span>
            </div>
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.length === 0 ? (
                  <p style={{ fontSize: fontSizes.sm, color: colors.textMuted, paddingLeft: spacing.sm }}>Aucun élément</p>
                ) : items.map(item => {
                  const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[0];
                  const isTerminal = COMPLETED_STATUSES.has(item.status);
                  const statusDef = (STATUS_BY_CATEGORY[item.category] || []).find(s => s.id === item.status);
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: spacing.sm,
                      padding: `${spacing.sm}px ${spacing.md}px`,
                      background: colors.surface1, borderRadius: radii.md,
                      borderLeft: `3px solid ${cat.color}`,
                      color: isTerminal ? colors.textMuted : colors.text,
                      fontSize: fontSizes.base,
                      transition: transitions.fast,
                    }}>
                      <span style={{ fontSize: fontSizes.sm }}>{cat.icon}</span>
                      <span style={{
                        flex: 1,
                        textDecoration: isTerminal ? 'line-through' : 'none',
                        textDecorationColor: colors.textMuted,
                      }}>
                        {item.text || 'Sans titre'}
                      </span>
                      {statusDef && (
                        <span style={{
                          fontSize: fontSizes.xs, fontFamily: fonts.mono,
                          color: statusDef.color,
                          background: statusDef.color + '18',
                          padding: '1px 6px', borderRadius: radii.sm,
                        }}>
                          {statusDef.label}
                        </span>
                      )}
                      {item.owner && (
                        <span style={{ fontSize: fontSizes.sm, color: colors.blue }}>@{item.owner}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
