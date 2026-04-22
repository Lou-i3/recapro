import { useState, useMemo } from 'react';
import type { Item } from '../types';
import { HIDDEN_STATUSES } from '../lib/constants';

export function useSearchAndFilter(items: Item[], hiddenStatuses: Set<string> = HIDDEN_STATUSES) {
  const [showHidden, setShowHidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    const base = showHidden ? items : items.filter(i => !hiddenStatuses.has(i.status));

    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();

    const itemMap = new Map(base.map(i => [i.id, i]));
    const directMatches = new Set<string>();

    for (const item of base) {
      if (
        item.text.toLowerCase().includes(q) ||
        item.shortId?.toLowerCase().includes(q) ||
        item.note?.toLowerCase().includes(q) ||
        item.owner?.toLowerCase().includes(q)
      ) {
        directMatches.add(item.id);
      }
    }

    const includedIds = new Set(directMatches);

    const addDescendants = (parentId: string) => {
      for (const item of base) {
        if (item.parentId === parentId && !includedIds.has(item.id)) {
          includedIds.add(item.id);
          addDescendants(item.id);
        }
      }
    };

    const addAncestors = (itemId: string) => {
      const item = itemMap.get(itemId);
      if (item?.parentId && !includedIds.has(item.parentId)) {
        includedIds.add(item.parentId);
        addAncestors(item.parentId);
      }
    };

    for (const id of directMatches) {
      addDescendants(id);
      addAncestors(id);
    }

    return base.filter(i => includedIds.has(i.id));
  }, [items, showHidden, searchQuery, hiddenStatuses]);

  return { filteredItems, searchQuery, setSearchQuery, showHidden, setShowHidden };
}
