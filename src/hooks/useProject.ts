import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProject, saveProject } from '../lib/api';
import type { Project, Item } from '../types';
import { CATEGORY_PREFIX } from '../lib/constants';

function migrateItem(item: Item): Item {
  if (item.status && item.parentId !== undefined) return item;
  const terminalMap: Record<string, string> = { decisions: "validated", actions: "done", questions: "answered" };
  const defaultMap: Record<string, string> = { decisions: "to-discuss", actions: "todo", questions: "to-ask" };
  return {
    ...item,
    status: (item.status || ((item as unknown as { done?: boolean }).done ? (terminalMap[item.category] || "done") : (defaultMap[item.category] || "todo"))) as Item['status'],
    parentId: item.parentId ?? null,
  };
}

function migrateLinks(items: Item[]): Item[] {
  // Assign shortId, links, order to items that don't have them
  const counters: Record<string, number> = { decisions: 0, actions: 0, questions: 0 };
  // First pass: find existing max shortId numbers per category
  for (const item of items) {
    if (item.shortId && !item.parentId) {
      const num = parseInt(item.shortId.slice(1), 10);
      if (!isNaN(num) && num > (counters[item.category] || 0)) {
        counters[item.category] = num;
      }
    }
  }
  // Track order per group (section × category)
  const orderCounters: Record<string, number> = {};
  let changed = false;

  const migrated = items.map(item => {
    const patches: Partial<Item> = {};

    if (!item.links) { patches.links = []; changed = true; }
    if (typeof item.order !== 'number') {
      const groupKey = `${item.section}::${item.category}`;
      orderCounters[groupKey] = (orderCounters[groupKey] || 0) + 1;
      patches.order = orderCounters[groupKey];
      changed = true;
    }
    if (!item.shortId) {
      if (item.parentId) {
        // Sub-items get parent shortId + .N
        const parent = items.find(p => p.id === item.parentId);
        const parentShortId = parent?.shortId || '?';
        const siblingIndex = items.filter(s => s.parentId === item.parentId).indexOf(item) + 1;
        patches.shortId = `${parentShortId}.${siblingIndex}`;
      } else {
        counters[item.category] = (counters[item.category] || 0) + 1;
        patches.shortId = `${CATEGORY_PREFIX[item.category] || '?'}${counters[item.category]}`;
      }
      changed = true;
    }

    return Object.keys(patches).length > 0 ? { ...item, ...patches } : item;
  });

  return changed ? migrated : items;
}

function migrateProject(data: Project): Project {
  if (!data || !data.items) return data;
  let items = data.items.map(migrateItem);
  const needsStatusMigration = items.some((item, i) => item !== data.items[i]);
  items = migrateLinks(items);
  const needsLinkMigration = items !== data.items && !needsStatusMigration ? true : items.some((item, i) => item !== data.items[i]);
  return needsStatusMigration || needsLinkMigration ? { ...data, items } : data;
}

export function useProject(slug: string) {
  const [data, setData] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestData = useRef<Project | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    fetchProject(slug)
      .then(d => {
        const migrated = migrateProject(d);
        if (!cancelled) { setData(migrated); latestData.current = migrated; }
      })
      .catch(err => console.error('Error loading project:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  const save = useCallback((updatedData: Partial<Project>) => {
    const merged = { ...latestData.current, ...updatedData } as Project;
    setData(merged);
    latestData.current = merged;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveProject(slug, merged).catch(err =>
        console.error('Error saving:', err)
      );
    }, 300);
  }, [slug]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        if (latestData.current) {
          saveProject(slug, latestData.current).catch(() => {});
        }
      }
    };
  }, [slug]);

  return { data, loading, save };
}
