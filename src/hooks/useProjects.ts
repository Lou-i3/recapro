import { useState, useEffect, useCallback } from 'react';
import { fetchProjects, createProject as apiCreate, deleteProject as apiDelete } from '../lib/api';
import type { Project, ProjectSummary } from '../types';

export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createProject = useCallback(async (name: string): Promise<Project> => {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      || `project-${Date.now()}`;

    const data = await apiCreate({ slug, projectName: name });
    await refresh();
    return data;
  }, [refresh]);

  const removeProject = useCallback(async (slug: string) => {
    await apiDelete(slug);
    await refresh();
  }, [refresh]);

  return { projects, loading, refresh, createProject, removeProject };
}
