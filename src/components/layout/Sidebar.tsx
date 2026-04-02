'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type CSSProperties } from 'react';
import { colors, fonts, fontSizes, spacing, radii, shadows, transitions, inputStyle } from '../../lib/theme';
import type { Project, ProjectSummary } from '../../types';

const linkStyle: CSSProperties = {
  display: 'block',
  padding: `${spacing.sm}px ${spacing.lg}px`,
  color: colors.textSecondary,
  textDecoration: 'none',
  borderRadius: radii.md,
  fontSize: fontSizes.md,
  fontFamily: fonts.body,
  transition: transitions.fast,
  margin: `0 ${spacing.sm}px`,
};

const activeLinkStyle: CSSProperties = {
  ...linkStyle,
  color: colors.text,
  background: colors.surface3,
};

const subLinkStyle: CSSProperties = {
  ...linkStyle,
  paddingLeft: 28,
  fontSize: fontSizes.base,
};

const activeSubLinkStyle: CSSProperties = {
  ...subLinkStyle,
  color: colors.text,
  background: colors.surface2,
};

const sectionTitle: CSSProperties = {
  fontSize: fontSizes.xs,
  fontFamily: fonts.mono,
  color: colors.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  padding: `${spacing.xl}px ${spacing.lg}px ${spacing.xs}px`,
  userSelect: 'none',
};

interface SidebarProps {
  projects: ProjectSummary[];
  onCreateProject: (name: string) => Promise<Project>;
  onDeleteProject: (slug: string) => Promise<void>;
  onCollapse: () => void;
}

export default function Sidebar({ projects, onCreateProject, onDeleteProject, onCollapse }: SidebarProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const project = await onCreateProject(name);
      setNewName('');
      setCreating(false);
      router.push(`/project/${project.slug}`);
    } catch (err) {
      console.error(err);
    }
  };

  const styleFor = (path: string, isSub: boolean): CSSProperties => {
    const isActive = pathname === path;
    return isActive
      ? (isSub ? activeSubLinkStyle : activeLinkStyle)
      : (isSub ? subLinkStyle : linkStyle);
  };

  return (
    <nav style={{
      width: 230,
      minWidth: 230,
      height: '100vh',
      background: colors.bgSidebar,
      borderRight: `1px solid ${colors.borderLight}`,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      position: 'sticky',
      top: 0,
    }}>
      <div style={{
        padding: `${spacing.xl}px ${spacing.lg}px ${spacing.md}px`,
        fontFamily: fonts.mono,
        fontSize: fontSizes.lg,
        fontWeight: 700,
        color: colors.text,
        letterSpacing: '-0.02em',
      }}>
        Project Status
      </div>

      <Link href="/dashboard" style={styleFor('/dashboard', false)}>
        Dashboard
      </Link>

      <div style={sectionTitle}>Mes tâches</div>
      <Link href="/tasks/by-project" style={styleFor('/tasks/by-project', true)}>
        Par projet
      </Link>
      <Link href="/tasks/in-progress" style={styleFor('/tasks/in-progress', true)}>
        En cours
      </Link>

      <div style={sectionTitle}>Mes projets</div>
      {projects.map(p => (
        <div key={p.slug} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Link
            href={`/project/${p.slug}`}
            style={{ ...styleFor(`/project/${p.slug}`, true), flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {p.projectName}
          </Link>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === p.slug ? null : p.slug); }}
            style={{
              background: 'none', border: 'none', color: colors.textMuted,
              cursor: 'pointer', fontSize: fontSizes.sm, padding: `${spacing.xs}px ${spacing.sm}px`,
              flexShrink: 0, opacity: 0.6, transition: transitions.fast,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
          >⋯</button>
          {menuOpen === p.slug && (
            <div style={{
              position: 'absolute', right: spacing.sm, top: '100%', zIndex: 30,
              background: colors.bgSurface, border: `1px solid ${colors.border}`,
              borderRadius: radii.lg, padding: spacing.xs, minWidth: 130,
              boxShadow: shadows.md,
            }}>
              <button
                onClick={() => {
                  if (window.confirm(`Supprimer « ${p.projectName} » ?`)) {
                    onDeleteProject(p.slug);
                    setMenuOpen(null);
                    router.push('/dashboard');
                  }
                }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'none', border: 'none', color: colors.red,
                  cursor: 'pointer', padding: `${spacing.sm}px ${spacing.md}px`,
                  fontSize: fontSizes.base, borderRadius: radii.sm,
                  fontFamily: fonts.body, transition: transitions.fast,
                }}
                onMouseEnter={e => e.currentTarget.style.background = colors.surface2}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Supprimer
              </button>
            </div>
          )}
        </div>
      ))}

      {creating ? (
        <div style={{ padding: `${spacing.xs}px ${spacing.lg}px` }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setCreating(false); setNewName(''); }
            }}
            placeholder="Nom du projet…"
            style={{ ...inputStyle, width: '100%', fontSize: fontSizes.base }}
          />
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          style={{
            ...subLinkStyle,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.blue,
            textAlign: 'left',
            padding: `${spacing.sm}px 28px`,
          }}
        >
          + Nouveau projet
        </button>
      )}

      <div style={{ flex: 1 }} />

      <button
        onClick={onCollapse}
        style={{
          display: 'flex', alignItems: 'center', gap: spacing.sm,
          padding: `${spacing.md}px ${spacing.lg}px`,
          background: 'none', border: 'none',
          borderTop: `1px solid ${colors.borderLight}`,
          color: colors.textMuted,
          cursor: 'pointer',
          fontSize: fontSizes.sm,
          fontFamily: fonts.body,
          transition: transitions.fast,
          width: '100%',
          textAlign: 'left',
        }}
        onMouseEnter={e => e.currentTarget.style.color = colors.text}
        onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}
      >
        <span style={{ fontSize: fontSizes.md }}>◀</span>
        Réduire
      </button>
    </nav>
  );
}
