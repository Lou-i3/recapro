'use client';

import { useState, useRef, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { colors, fonts, fontSizes, spacing, buttonStyle, buttonPrimaryStyle, labelStyle } from '../../lib/theme';

interface MarkdownPanelProps {
  markdown: string;
  onChange: (markdown: string) => void;
  width: number;
  onResize: (width: number) => void;
}

export default function MarkdownPanel({ markdown, onChange, width, onResize }: MarkdownPanelProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(markdown || '');
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleToggle = () => {
    if (editing) {
      onChange(draft);
    } else {
      setDraft(markdown || '');
    }
    setEditing(!editing);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - e.clientX;
      const newWidth = Math.max(250, Math.min(800, startWidth.current + delta));
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width, onResize]);

  return (
    <div style={{
      width,
      minWidth: 0,
      borderLeft: `1px solid ${colors.borderLight}`,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
      background: colors.surfaceNotes,
    }}>
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          left: -3,
          top: 0,
          bottom: 0,
          width: 6,
          cursor: 'col-resize',
          zIndex: 10,
        }}
        onMouseEnter={e => e.currentTarget.style.background = colors.blue + '33'}
        onMouseLeave={e => { if (!dragging.current) e.currentTarget.style.background = 'transparent'; }}
      />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${spacing.sm}px ${spacing.lg}px`,
        borderBottom: `1px solid ${colors.borderLight}`,
        flexShrink: 0,
      }}>
        <span style={labelStyle}>Notes</span>
        <button
          onClick={handleToggle}
          style={editing ? buttonPrimaryStyle : buttonStyle}
        >
          {editing ? 'Enregistrer' : 'Modifier'}
        </button>
      </div>

      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: spacing.lg,
      }}>
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Notes en markdown…"
            style={{
              width: '100%',
              height: '100%',
              minHeight: 200,
              background: 'transparent',
              border: 'none',
              color: colors.text,
              fontSize: fontSizes.base,
              fontFamily: fonts.mono,
              lineHeight: 1.7,
              resize: 'none',
              outline: 'none',
            }}
          />
        ) : (
          <div style={{
            fontSize: fontSizes.base,
            lineHeight: 1.7,
            color: colors.text,
          }} className="markdown-content">
            {markdown ? (
              <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
            ) : (
              <p style={{ color: colors.textMuted, fontStyle: 'italic' }}>
                Aucune note pour ce projet. Cliquez sur « Modifier » pour en ajouter.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
