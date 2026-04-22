import { useState, useCallback } from 'react';

export function useItemHierarchy() {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [collapsedChildren, setCollapsedChildren] = useState<Set<string>>(new Set());

  const toggleItemExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const toggleChildrenCollapsed = useCallback((itemId: string) => {
    setCollapsedChildren(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  return {
    expandedItems,
    collapsedChildren,
    setExpandedItems,
    setCollapsedChildren,
    toggleItemExpanded,
    toggleChildrenCollapsed,
  };
}
