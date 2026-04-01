const STORAGE_PREFIX = "project-status";
const PROJECT_INDEX_KEY = `${STORAGE_PREFIX}-index`;

// ─── Single project (current implementation) ───

export function loadProjectData(projectSlug = "default") {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}-${projectSlug}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveProjectData(data, projectSlug = "default") {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}-${projectSlug}`, JSON.stringify(data));
  } catch {}
}

// ─── Project index (for future multi-project) ───

export function loadProjectIndex() {
  try {
    const raw = localStorage.getItem(PROJECT_INDEX_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [{ slug: "default", name: "Mon Projet", createdAt: Date.now() }];
}

export function saveProjectIndex(index) {
  try {
    localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(index));
  } catch {}
}

// ─── Export / Import ───

export function exportProjectJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const filename = (data.projectName || "projet").replace(/\s+/g, "_");
  a.href = url;
  a.download = `${filename}_status.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importProjectJSON() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return reject(new Error("No file selected"));
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
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

export function migrateFromLegacyKey() {
  try {
    const legacy = localStorage.getItem("project-status-data");
    if (legacy && !localStorage.getItem(`${STORAGE_PREFIX}-default`)) {
      localStorage.setItem(`${STORAGE_PREFIX}-default`, legacy);
      localStorage.removeItem("project-status-data");
      return true;
    }
  } catch {}
  return false;
}
