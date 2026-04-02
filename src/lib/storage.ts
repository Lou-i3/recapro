import type { Project } from '../types';

const STORAGE_PREFIX = "project-status";
const PROJECT_INDEX_KEY = `${STORAGE_PREFIX}-index`;

// ─── Single project (current implementation) ───

export function loadProjectData(projectSlug = "default"): Project | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}-${projectSlug}`);
    if (raw) return JSON.parse(raw) as Project;
  } catch { /* ignore */ }
  return null;
}

export function saveProjectData(data: Project, projectSlug = "default"): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}-${projectSlug}`, JSON.stringify(data));
  } catch { /* ignore */ }
}

// ─── Project index (for future multi-project) ───

interface ProjectIndexEntry {
  slug: string;
  name: string;
  createdAt: number;
}

export function loadProjectIndex(): ProjectIndexEntry[] {
  try {
    const raw = localStorage.getItem(PROJECT_INDEX_KEY);
    if (raw) return JSON.parse(raw) as ProjectIndexEntry[];
  } catch { /* ignore */ }
  return [{ slug: "default", name: "Mon Projet", createdAt: Date.now() }];
}

export function saveProjectIndex(index: ProjectIndexEntry[]): void {
  try {
    localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(index));
  } catch { /* ignore */ }
}

// ─── Export / Import ───

export function exportProjectJSON(data: Pick<Project, 'projectName' | 'sections' | 'items'>): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const filename = (data.projectName || "project").replace(/\s+/g, "_");
  a.href = url;
  a.download = `${filename}_status.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importProjectJSON(): Promise<Partial<Project>> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return reject(new Error("No file selected"));
      const reader = new FileReader();
      reader.onload = (ev: ProgressEvent<FileReader>) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as Partial<Project>;
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Read error"));
      reader.readAsText(file);
    };
    input.click();
  });
}

// ─── Migration helper: old key → new key ───

export function migrateFromLegacyKey(): boolean {
  try {
    const legacy = localStorage.getItem("project-status-data");
    if (legacy && !localStorage.getItem(`${STORAGE_PREFIX}-default`)) {
      localStorage.setItem(`${STORAGE_PREFIX}-default`, legacy);
      localStorage.removeItem("project-status-data");
      return true;
    }
  } catch { /* ignore */ }
  return false;
}
