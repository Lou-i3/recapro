'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAllProjects } from '../../../hooks/useAllProjects';
import { useSearchAndFilter } from '../../../hooks/useSearchAndFilter';
import { useItemHierarchy } from '../../../hooks/useItemHierarchy';
import { useItemLinks } from '../../../hooks/useItemLinks';
import Toolbar from '../../../components/ui/Toolbar';
import { Paperclip, ChevronDown, ChevronRight } from '../../../components/ui/icons';
import { CATEGORIES, PRIORITY_LEVELS, STATUS_BY_CATEGORY, COMPLETED_STATUSES } from '../../../lib/constants';
import { colors, fonts, fontSizes, spacing, radii, transitions } from '../../../lib/theme';
import type { Item, Project } from '../../../types';

export default function TasksByProjectPage() {
  const { projects, loading } = useAllProjects();
  const [projectCollapsed, setProjectCollapsed] = useState<Record<string, boolean>>({});

  const allItems = useMemo(() => projects.flatMap(p => p.items || []), [projects]);

  const { filteredItems, searchQuery, setSearchQuery, showHidden, setShowHidden } =
    useSearchAndFilter(allItems, COMPLETED_STATUSES);
  const hierarchy = useItemHierarchy();
  const linkResolver = useItemLinks(allItems);

  const projectByItemId = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of projects) {
      for (const item of p.items || []) map.set(item.id, p);
    }
    return map;
  }, [projects]);

  const itemsWithLinks = useMemo(() => {
    const ids = new Set<string>();
    for (const item of allItems) {
      if (linkResolver.getLinksForItem(item).count > 0) ids.add(item.id);
    }
    return ids;
  }, [allItems, linkResolver]);

  const parentIds = useMemo(() => {
    return new Set(allItems.filter(i => i.parentId).map(i => i.parentId!));
  }, [allItems]);

  const allDetailsOpen = useMemo(() => {
    if (itemsWithLinks.size === 0) return false;
    return [...itemsWithLinks].every(id => hierarchy.expandedItems.has(id));
  }, [itemsWithLinks, hierarchy.expandedItems]);

  const allChildrenExpanded = useMemo(() => {
    if (parentIds.size === 0) return true;
    return [...parentIds].every(id => !hierarchy.collapsedChildren.has(id));
  }, [parentIds, hierarchy.collapsedChildren]);

  const toggleAllDetails = useCallback(() => {
    if (allDetailsOpen) hierarchy.setExpandedItems(new Set());
    else hierarchy.setExpandedItems(new Set(itemsWithLinks));
  }, [allDetailsOpen, itemsWithLinks, hierarchy]);

  const toggleAllChildren = useCallback(() => {
    if (allChildrenExpanded) hierarchy.setCollapsedChildren(new Set(parentIds));
    else hierarchy.setCollapsedChildren(new Set());
  }, [allChildrenExpanded, parentIds, hierarchy]);

  if (loading) return <div style={{ color: colors.textMuted }}>Loading…</div>;

  if (projects.length === 0) {
    return (
      <div style={{ fontFamily: fonts.body, padding: spacing.xxl }}>
        <h2 style={{ color: colors.text, fontWeight: 600, marginBottom: spacing.sm, fontSize: fontSizes.xl }}>
          Tasks by project
        </h2>
        <p style={{ fontStyle: 'italic', color: colors.textMuted }}>No projects.</p>
      </div>
    );
  }

  const renderItem = (item: Item, depth: number): React.ReactNode => {
    const children = filteredItems
      .filter(i => i.parentId === item.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const childCount = allItems.filter(i => i.parentId === item.id).length;
    const doneCount = allItems.filter(i => i.parentId === item.id && COMPLETED_STATUSES.has(i.status)).length;
    const hasChildren = childCount > 0;
    const childrenVisible = !hierarchy.collapsedChildren.has(item.id);

    const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[0];
    const prio = PRIORITY_LEVELS.find(l => l.id === item.priority);
    const statusDef = (STATUS_BY_CATEGORY[item.category] || []).find(s => s.id === item.status);
    const isDimmed = item.status === 'closed';
    const isTerminal = COMPLETED_STATUSES.has(item.status);
    const links = linkResolver.getLinksForItem(item);
    const project = projectByItemId.get(item.id);
    const expanded = hierarchy.expandedItems.has(item.id);

    return (
      <div key={item.id}>
        <div style={{
          background: isDimmed ? colors.surface1 : colors.surface2,
          borderRadius: radii.lg,
          padding: `${spacing.sm}px ${spacing.md}px`,
          marginBottom: 2,
          marginLeft: depth > 0 ? 24 : 0,
          color: isDimmed ? colors.textMuted : colors.text,
          borderLeft: `3px solid ${cat.color}`,
          transition: transitions.fast,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <span
              onClick={hasChildren ? () => hierarchy.toggleChildrenCollapsed(item.id) : undefined}
              style={{
                color: hasChildren ? colors.textMuted : 'transparent',
                userSelect: 'none', width: 14, flexShrink: 0,
                cursor: hasChildren ? 'pointer' : 'default',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {childrenVisible ? <ChevronDown size={12} weight="bold" /> : <ChevronRight size={12} weight="bold" />}
            </span>

            {item.shortId && (
              <span style={{
                fontSize: fontSizes.sm, fontFamily: fonts.mono,
                color: colors.textSecondary, flexShrink: 0,
                minWidth: 30,
              }}>
                {item.shortId}
              </span>
            )}

            {prio && (
              <span style={{
                color: prio.dot,
                fontSize: 11,
                flexShrink: 0,
                lineHeight: 1,
              }} title={prio.label}>
                {prio.icon}
              </span>
            )}

            {project ? (
              <Link
                href={`/project/${project.slug}`}
                style={{
                  flex: 1, minWidth: 0,
                  color: 'inherit', textDecoration: 'none',
                  textDecorationLine: isTerminal ? 'line-through' : 'none',
                  textDecorationColor: colors.textMuted,
                }}
              >
                {item.text || 'Untitled'}
              </Link>
            ) : (
              <span style={{ flex: 1, minWidth: 0 }}>{item.text || 'Untitled'}</span>
            )}

            {hasChildren && (
              <span style={{
                fontSize: fontSizes.xs, fontFamily: fonts.mono,
                color: doneCount === childCount ? colors.green : colors.textMuted,
                flexShrink: 0,
              }}>
                {doneCount}/{childCount}
              </span>
            )}

            {item.owner && (
              <span style={{
                fontSize: fontSizes.sm, color: colors.blue, flexShrink: 0,
                maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                @{item.owner}
              </span>
            )}

            {statusDef && (
              <span style={{
                fontSize: fontSizes.xs, fontFamily: fonts.mono,
                color: statusDef.color,
                background: statusDef.color + '18',
                padding: '1px 6px', borderRadius: radii.sm,
                flexShrink: 0,
              }}>
                {statusDef.label}
              </span>
            )}

            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              <button
                onClick={() => hierarchy.toggleItemExpanded(item.id)}
                style={{
                  background: 'none', border: 'none',
                  color: colors.textMuted,
                  cursor: 'pointer', padding: '2px 4px',
                  display: 'inline-flex', alignItems: 'center',
                  transition: transitions.fast,
                }}
                title={expanded ? 'Hide links' : 'Show links'}
              >
                <Paperclip size={16} weight="regular" />
              </button>
              {links.count > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -2,
                  fontSize: 9, fontFamily: fonts.mono, fontWeight: 700,
                  background: colors.purple, color: '#fff',
                  borderRadius: '50%', width: 14, height: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  {links.count}
                </span>
              )}
            </span>
          </div>

          {expanded && links.linkGroups.length > 0 && (
            <div style={{
              marginTop: spacing.sm,
              marginLeft: hasChildren ? 14 : 0,
              display: 'flex', flexDirection: 'column', gap: spacing.xs,
            }}>
              {links.linkGroups.map(group => (
                <div key={group.key} style={{ display: 'flex', gap: spacing.xs, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: fontSizes.xs, fontFamily: fonts.mono,
                    color: colors.textMuted, minWidth: 80,
                  }}>
                    {group.label}
                  </span>
                  {group.links.map(link => {
                    const linkProj = projectByItemId.get(link.item.id);
                    const chipContent = (
                      <>
                        <span style={{ fontFamily: fonts.mono, color: colors.textMuted }}>
                          {link.item.shortId}
                        </span>
                        <span>{link.item.text || 'Untitled'}</span>
                      </>
                    );
                    const chipStyle = {
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 6px',
                      background: colors.surface3,
                      borderRadius: radii.sm,
                      fontSize: fontSizes.xs,
                    };
                    return linkProj ? (
                      <Link
                        key={`${group.key}-${link.item.id}`}
                        href={`/project/${linkProj.slug}`}
                        style={{ ...chipStyle, color: 'inherit', textDecoration: 'none' }}
                      >{chipContent}</Link>
                    ) : (
                      <span
                        key={`${group.key}-${link.item.id}`}
                        style={chipStyle}
                      >{chipContent}</span>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {childrenVisible && children.length > 0 && (
          <div>
            {children.map(child => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ fontFamily: fonts.body, fontSize: fontSizes.base, lineHeight: 1.6, maxWidth: 1000, paddingBottom: spacing.xxl, background: colors.bgContent, minHeight: '100%' }}>
      <div style={{ marginBottom: spacing.lg, padding: `${spacing.xxl}px ${spacing.xxl}px 0` }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>
          Tasks by project
        </div>
      </div>

      <Toolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showHidden={showHidden}
        onShowHiddenChange={setShowHidden}
        hideLabel="completed"
      >
        {itemsWithLinks.size > 0 && (
          <button
            onClick={toggleAllDetails}
            title={allDetailsOpen ? 'Close all details' : 'Open all details'}
            style={{
              width: 28, height: 28,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: allDetailsOpen ? colors.blueBg : 'transparent',
              color: allDetailsOpen ? colors.blue : colors.textMuted,
              border: `1px solid ${allDetailsOpen ? colors.blueBorder : colors.border}`,
              borderRadius: radii.md, cursor: 'pointer',
              transition: transitions.fast,
            }}
          >
            <Paperclip size={14} weight="regular" />
          </button>
        )}

        {parentIds.size > 0 && (
          <button
            onClick={toggleAllChildren}
            title={allChildrenExpanded ? 'Collapse children' : 'Expand children'}
            style={{
              width: 28, height: 28,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: allChildrenExpanded ? colors.blueBg : 'transparent',
              color: allChildrenExpanded ? colors.blue : colors.textMuted,
              border: `1px solid ${allChildrenExpanded ? colors.blueBorder : colors.border}`,
              borderRadius: radii.md, cursor: 'pointer',
              transition: transitions.fast,
            }}
          >
            {allChildrenExpanded ? <ChevronDown size={14} weight="bold" /> : <ChevronRight size={14} weight="bold" />}
          </button>
        )}
      </Toolbar>

      <div style={{ padding: `0 ${spacing.xxl}px` }}>
      {projects.map(p => {
        const projectRoots = filteredItems
          .filter(i => !i.parentId && projectByItemId.get(i.id) === p)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        const isCollapsed = projectCollapsed[p.slug];

        if (searchQuery.trim() && projectRoots.length === 0) return null;

        return (
          <div key={p.slug} style={{ marginBottom: spacing.xl }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: spacing.sm,
                paddingBottom: spacing.sm, borderBottom: `1px solid ${colors.borderLight}`,
                marginBottom: spacing.sm, cursor: 'pointer',
              }}
              onClick={() => setProjectCollapsed(prev => ({ ...prev, [p.slug]: !prev[p.slug] }))}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', color: colors.textMuted, userSelect: 'none' }}>
                {isCollapsed ? <ChevronRight size={14} weight="bold" /> : <ChevronDown size={14} weight="bold" />}
              </span>
              <Link href={`/project/${p.slug}`} style={{
                fontWeight: 600, fontSize: fontSizes.lg, color: colors.text, textDecoration: 'none',
              }} onClick={e => e.stopPropagation()}>
                {p.projectName}
              </Link>
              <span style={{ fontSize: fontSizes.sm, color: colors.textMuted }}>
                {projectRoots.length} item{projectRoots.length !== 1 ? 's' : ''}
              </span>
            </div>
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {projectRoots.length === 0 ? (
                  <p style={{ fontSize: fontSizes.sm, color: colors.textMuted, paddingLeft: spacing.sm, fontStyle: 'italic' }}>
                    No items
                  </p>
                ) : (
                  projectRoots.map(item => renderItem(item, 0))
                )}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
