'use client';

import Link from 'next/link';
import { CATEGORIES, STATUS_BY_CATEGORY, COMPLETED_STATUSES } from '../../lib/constants';
import { colors, fonts, fontSizes, spacing, radii, transitions } from '../../lib/theme';
import type { Project } from '../../types';

interface ActivityFeedProps {
  projects: Project[];
}

export default function ActivityFeed({ projects }: ActivityFeedProps) {
  const allItems = projects.flatMap(p =>
    (p.items || []).filter(i => !i.parentId).map(item => ({ ...item, _projectSlug: p.slug, _projectName: p.projectName }))
  );

  const recent = allItems
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 20);

  if (recent.length === 0) {
    return (
      <p style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: fontSizes.base }}>
        No recent activity.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {recent.map(item => {
        const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[0];
        const CatIcon = cat.icon;
        const isTerminal = COMPLETED_STATUSES.has(item.status);
        const statusDef = (STATUS_BY_CATEGORY[item.category] || []).find(s => s.id === item.status);
        const date = item.createdAt
          ? new Date(item.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
          : '';
        return (
          <Link
            key={item.id}
            href={`/project/${item._projectSlug}`}
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
            <span style={{ display: 'inline-flex', alignItems: 'center', color: cat.color }}>
              <CatIcon size={16} weight="regular" />
            </span>
            <span style={{
              flex: 1, fontSize: fontSizes.base, color: isTerminal ? colors.textMuted : colors.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textDecoration: isTerminal ? 'line-through' : 'none',
              textDecorationColor: colors.textMuted,
            }}>
              {item.text || 'Untitled'}
            </span>
            {statusDef && (
              <span style={{
                fontSize: fontSizes.xs, fontFamily: fonts.mono,
                color: statusDef.color, flexShrink: 0,
              }}>
                {statusDef.label}
              </span>
            )}
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
