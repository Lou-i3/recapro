import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { colors, fonts, fontSizes, spacing, radii, transitions, buttonStyle, buttonPrimaryStyle, labelStyle } from '../../lib/theme';

export default function MarkdownPanel({ markdown, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(markdown || '');

  const handleToggle = () => {
    if (editing) {
      onChange(draft);
    } else {
      setDraft(markdown || '');
    }
    setEditing(!editing);
  };

  return (
    <div style={{
      width: '40%',
      minWidth: 280,
      borderLeft: `1px solid ${colors.borderLight}`,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
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
