import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProject, saveProject } from '../lib/api';

function migrateItem(item) {
  if (item.status && item.parentId !== undefined) return item;
  const terminalMap = { decisions: "validated", actions: "done", questions: "answered" };
  const defaultMap = { decisions: "to-discuss", actions: "todo", questions: "to-ask" };
  return {
    ...item,
    status: item.status || (item.done ? (terminalMap[item.category] || "done") : (defaultMap[item.category] || "todo")),
    parentId: item.parentId ?? null,
  };
}

function migrateProject(data) {
  if (!data || !data.items) return data;
  const migrated = data.items.map(migrateItem);
  const needsMigration = migrated.some((item, i) => item !== data.items[i]);
  return needsMigration ? { ...data, items: migrated } : data;
}

export function useProject(slug) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef(null);
  const latestData = useRef(null);

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

  const save = useCallback((updatedData) => {
    const merged = { ...latestData.current, ...updatedData };
    setData(merged);
    latestData.current = merged;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveProject(slug, merged).catch(err =>
        console.error('Erreur sauvegarde:', err)
      );
    }, 300);
  }, [slug]);

  // Flush pending save on unmount
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
