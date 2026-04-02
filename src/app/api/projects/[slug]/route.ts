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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  ensureDataDir();
  const { slug } = await params;
  const filePath = getProjectPath(slug);
  if (!filePath) return NextResponse.json({ error: 'Slug invalide' }, { status: 400 });
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 });

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  ensureDataDir();
  const { slug } = await params;
  const filePath = getProjectPath(slug);
  if (!filePath) return NextResponse.json({ error: 'Slug invalide' }, { status: 400 });
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 });

  const body = await request.json();
  const data = { ...body, slug, updatedAt: Date.now() };

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  ensureDataDir();
  const { slug } = await params;
  const filePath = getProjectPath(slug);
  if (!filePath) return NextResponse.json({ error: 'Slug invalide' }, { status: 400 });
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 });

  try {
    fs.unlinkSync(filePath);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
