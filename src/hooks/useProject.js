import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProject, saveProject } from '../lib/api';

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
      .then(d => { if (!cancelled) { setData(d); latestData.current = d; } })
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
