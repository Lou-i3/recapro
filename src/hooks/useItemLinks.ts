import { useMemo, useCallback } from 'react';
import type { Item, LinkType } from '../types';

export type LinkDirection = 'forward' | 'reverse';

export interface ResolvedLink {
  item: Item;
  type: LinkType;
  direction: LinkDirection;
}

export interface LinkGroup {
  key: string;
  label: string;
  links: ResolvedLink[];
}

export interface LinksForItem {
  count: number;
  resolvedLinks: ResolvedLink[];
  linkGroups: LinkGroup[];
}

export interface ReverseLinkEntry {
  sourceId: string;
  type: LinkType;
}

export function useItemLinks(allItems: Item[]) {
  const itemById = useMemo(
    () => new Map(allItems.map(i => [i.id, i])),
    [allItems]
  );

  const reverseLinks = useMemo(() => {
    const map: Record<string, ReverseLinkEntry[]> = {};
    for (const item of allItems) {
      for (const link of item.links || []) {
        if (!map[link.targetId]) map[link.targetId] = [];
        map[link.targetId].push({ sourceId: item.id, type: link.type });
      }
    }
    return map;
  }, [allItems]);

  const getLinksForItem = useCallback((item: Item): LinksForItem => {
    const resolvedLinks: ResolvedLink[] = [];

    for (const link of item.links || []) {
      const target = itemById.get(link.targetId);
      if (target) resolvedLinks.push({ item: target, type: link.type, direction: 'forward' });
    }
    for (const rl of reverseLinks[item.id] || []) {
      const source = itemById.get(rl.sourceId);
      if (source) resolvedLinks.push({ item: source, type: rl.type, direction: 'reverse' });
    }

    const groups: LinkGroup[] = [
      { key: 'stems-from-fwd', label: 'Stems from', links: resolvedLinks.filter(l => l.type === 'stems-from' && l.direction === 'forward') },
      { key: 'stems-from-rev', label: 'Leads to',   links: resolvedLinks.filter(l => l.type === 'stems-from' && l.direction === 'reverse') },
      { key: 'depends-on-fwd', label: 'Depends on', links: resolvedLinks.filter(l => l.type === 'depends-on' && l.direction === 'forward') },
      { key: 'depends-on-rev', label: 'Blocks',     links: resolvedLinks.filter(l => l.type === 'depends-on' && l.direction === 'reverse') },
      { key: 'related',        label: 'Related',    links: resolvedLinks.filter(l => l.type === 'related') },
    ];
    const linkGroups = groups.filter(g => g.links.length > 0);

    return { count: resolvedLinks.length, resolvedLinks, linkGroups };
  }, [itemById, reverseLinks]);

  return { reverseLinks, getLinksForItem };
}
