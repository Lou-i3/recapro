const API_BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export function fetchProjects() {
  return request('/projects');
}

export function fetchProject(slug) {
  return request(`/projects/${slug}`);
}

export function createProject({ slug, projectName, sections, items, markdown }) {
  return request('/projects', {
    method: 'POST',
    body: JSON.stringify({ slug, projectName, sections, items, markdown }),
  });
}

export function saveProject(slug, data) {
  return request(`/projects/${slug}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteProject(slug) {
  return request(`/projects/${slug}`, {
    method: 'DELETE',
  });
}
