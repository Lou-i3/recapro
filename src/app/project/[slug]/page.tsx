'use client';

import { useState, use } from 'react';
import { useProject } from '../../../hooks/useProject';
import ProjectView from '../../../components/project/ProjectView';
import MarkdownPanel from '../../../components/project/MarkdownPanel';
import { colors, fonts, fontSizes, spacing, radii } from '../../../lib/theme';

export default function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data, loading, save } = useProject(slug);
  const [notesVisible, setNotesVisible] = useState(true);
  const [notesWidth, setNotesWidth] = useState(400);

  if (loading) return <div style={{ color: colors.textMuted }}>Chargement…</div>;
  if (!data) return <div style={{ color: colors.red }}>Projet non trouvé</div>;

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ flex: 1, overflow: 'auto', padding: spacing.xxl, minWidth: 0, background: colors.bgContent }}>
        <ProjectView project={data} onSave={save} />
      </div>

      {notesVisible ? (
        <MarkdownPanel
          markdown={data.markdown || ''}
          onChange={(md) => save({ markdown: md })}
          width={notesWidth}
          onResize={setNotesWidth}
        />
      ) : null}

      <button
        onClick={() => setNotesVisible(v => !v)}
        title={notesVisible ? 'Masquer les notes' : 'Afficher les notes'}
        style={{
          position: 'absolute',
          top: spacing.sm,
          right: notesVisible ? notesWidth + spacing.sm : spacing.sm,
          background: colors.surface3,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.sm,
          color: notesVisible ? colors.textSecondary : colors.textMuted,
          cursor: 'pointer',
          padding: `${spacing.xs}px ${spacing.sm}px`,
          fontSize: fontSizes.sm,
          fontFamily: fonts.mono,
          transition: 'right 0.15s ease, color 0.15s ease',
          zIndex: 5,
        }}
        onMouseEnter={e => e.currentTarget.style.color = colors.text}
        onMouseLeave={e => e.currentTarget.style.color = notesVisible ? colors.textSecondary : colors.textMuted}
      >
        {notesVisible ? 'Notes ✕' : 'Notes ▸'}
      </button>
    </div>
  );
}
