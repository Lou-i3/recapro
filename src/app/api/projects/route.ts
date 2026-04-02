import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getProjectPath(slug: string): string | null {
  const safe = slug.replace(/[^a-z0-9-]/g, '');
  if (!safe) return null;
  return path.join(DATA_DIR, `${safe}.json`);
}

export async function GET() {
  ensureDataDir();
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const projects = files.map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8'));
        return {
          slug: data.slug || f.replace('.json', ''),
          projectName: data.projectName || f.replace('.json', ''),
          itemCount: (data.items || []).length,
          doneCount: (data.items || []).filter((i: { done?: boolean }) => i.done).length,
          updatedAt: data.updatedAt || null,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
    return NextResponse.json(projects);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  ensureDataDir();
  const body = await request.json();
  const { slug, projectName, sections, items, markdown } = body;
  if (!slug) return NextResponse.json({ error: 'Slug requis' }, { status: 400 });

  const filePath = getProjectPath(slug);
  if (!filePath) return NextResponse.json({ error: 'Slug invalide' }, { status: 400 });
  if (fs.existsSync(filePath)) return NextResponse.json({ error: 'Ce projet existe déjà' }, { status: 409 });

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
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
