import { useState, useEffect } from 'react';
import { fetchProjects, fetchProject } from '../lib/api';
import type { Project } from '../types';

export function useAllProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const index = await fetchProjects();
        const full = await Promise.all(
          index.map(p => fetchProject(p.slug).catch(() => null))
        );
        if (!cancelled) setProjects(full.filter((p): p is Project => p !== null));
      } catch (err) {
        console.error('Error loading projects:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { projects, loading };
}
