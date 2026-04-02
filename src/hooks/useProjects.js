import { useState, useEffect, useCallback } from 'react';
import { fetchProjects, createProject as apiCreate, deleteProject as apiDelete } from '../lib/api';

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      console.error('Erreur chargement projets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createProject = useCallback(async (name) => {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      || `projet-${Date.now()}`;

    const data = await apiCreate({ slug, projectName: name });
    await refresh();
    return data;
  }, [refresh]);

  const removeProject = useCallback(async (slug) => {
    await apiDelete(slug);
    await refresh();
  }, [refresh]);

  return { projects, loading, refresh, createProject, removeProject };
}
