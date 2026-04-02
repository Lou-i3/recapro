'use client';

import { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { colors, radii, transitions } from "../../lib/theme";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}

export default function EditableText({ value, onChange, placeholder, className, multiline }: EditableTextProps) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value) onChange(draft.trim());
  };

  if (!editing) {
    if (multiline && value) {
      return (
        <div
          className={`${className || ''} markdown-content`}
          onClick={() => setEditing(true)}
          style={{ cursor: "text", minWidth: 40, fontSize: 'inherit', lineHeight: 1.6 }}
          title="Click to edit"
        >
          <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown>
        </div>
      );
    }
    return (
      <span
        className={`${className || ''} markdown-content`}
        onClick={() => setEditing(true)}
        style={{ cursor: "text", minWidth: 40, display: "inline-block" }}
        title="Cliquer pour modifier"
      >
        {value ? (
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <span>{children}</span>,
            }}
          >{value}</Markdown>
        ) : (
          <span style={{ color: colors.dimmed, fontStyle: "italic" }}>{placeholder}</span>
        )}
      </span>
    );
  }

  const sharedStyle = {
    font: "inherit",
    color: "inherit",
    background: colors.surface2,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.sm,
    padding: "3px 8px",
    width: "100%",
    outline: "none",
    transition: transitions.fast,
  };

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        placeholder={placeholder}
        className={className}
        style={{ ...sharedStyle, resize: "vertical", minHeight: 60 }}
      />
    );
  }

  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      }}
      placeholder={placeholder}
      className={className}
      style={{ ...sharedStyle, resize: "none" }}
    />
  );
}
