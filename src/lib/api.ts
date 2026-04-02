import type { Project, ProjectSummary } from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(err.error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export function fetchProjects(): Promise<ProjectSummary[]> {
  return request<ProjectSummary[]>('/projects');
}

export function fetchProject(slug: string): Promise<Project> {
  return request<Project>(`/projects/${slug}`);
}

export function createProject(data: { slug: string; projectName?: string; sections?: string[]; items?: Project['items']; markdown?: string }): Promise<Project> {
  return request<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function saveProject(slug: string, data: Partial<Project>): Promise<Project> {
  return request<Project>(`/projects/${slug}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteProject(slug: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/projects/${slug}`, {
    method: 'DELETE',
  });
}
