import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProject, saveProject } from '../lib/api';
import type { Project, Item } from '../types';

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

function migrateProject(data: Project): Project {
  if (!data || !data.items) return data;
  const migrated = data.items.map(migrateItem);
  const needsMigration = migrated.some((item, i) => item !== data.items[i]);
  return needsMigration ? { ...data, items: migrated } : data;
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
      .catch(err => console.error('Erreur chargement projet:', err))
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
        console.error('Erreur sauvegarde:', err)
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
