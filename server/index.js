import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const PORT = 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getProjectPath(slug) {
  // Sanitize slug to prevent path traversal
  const safe = slug.replace(/[^a-z0-9-]/g, '');
  if (!safe) return null;
  return path.join(DATA_DIR, `${safe}.json`);
}

// GET /api/projects — list all projects
app.get('/api/projects', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const projects = files.map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8'));
        return {
          slug: data.slug || f.replace('.json', ''),
          projectName: data.projectName || f.replace('.json', ''),
          itemCount: (data.items || []).length,
          doneCount: (data.items || []).filter(i => i.done).length,
          updatedAt: data.updatedAt || null,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:slug — get full project data
app.get('/api/projects/:slug', (req, res) => {
  const filePath = getProjectPath(req.params.slug);
  if (!filePath) return res.status(400).json({ error: 'Slug invalide' });
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Projet non trouvé' });

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects — create a new project
app.post('/api/projects', (req, res) => {
  const { slug, projectName, sections, items, markdown } = req.body;
  if (!slug) return res.status(400).json({ error: 'Slug requis' });

  const filePath = getProjectPath(slug);
  if (!filePath) return res.status(400).json({ error: 'Slug invalide' });
  if (fs.existsSync(filePath)) return res.status(409).json({ error: 'Ce projet existe déjà' });

  const data = {
    slug,
    projectName: projectName || slug,
    sections: sections || ['Général', 'Technique', 'Budget', 'Planning'],
    items: items || [],
    markdown: markdown || '',
    updatedAt: Date.now(),
  };

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:slug — update project data
app.put('/api/projects/:slug', (req, res) => {
  const filePath = getProjectPath(req.params.slug);
  if (!filePath) return res.status(400).json({ error: 'Slug invalide' });
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Projet non trouvé' });

  const data = { ...req.body, slug: req.params.slug, updatedAt: Date.now() };

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:slug — delete a project
app.delete('/api/projects/:slug', (req, res) => {
  const filePath = getProjectPath(req.params.slug);
  if (!filePath) return res.status(400).json({ error: 'Slug invalide' });
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Projet non trouvé' });

  try {
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static files in production
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[server] API running on http://localhost:${PORT}`);
});
