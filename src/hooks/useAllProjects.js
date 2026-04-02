import { useState, useEffect } from 'react';
import { fetchProjects, fetchProject } from '../lib/api';

export function useAllProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const index = await fetchProjects();
        const full = await Promise.all(
          index.map(p => fetchProject(p.slug).catch(() => null))
        );
        if (!cancelled) setProjects(full.filter(Boolean));
      } catch (err) {
        console.error('Erreur chargement projets:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { projects, loading };
}
