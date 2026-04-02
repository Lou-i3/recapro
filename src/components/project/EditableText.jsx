import { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { colors, radii, transitions } from "../../lib/theme";

export default function EditableText({ value, onChange, placeholder, className, multiline }) {
  const ref = useRef(null);
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
          title="Cliquer pour modifier"
        >
          <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown>
        </div>
      );
    }
    return (
      <span
        className={className}
        onClick={() => setEditing(true)}
        style={{ cursor: "text", minWidth: 40, display: "inline-block" }}
        title="Cliquer pour modifier"
      >
        {value || <span style={{ color: colors.dimmed, fontStyle: "italic" }}>{placeholder}</span>}
      </span>
    );
  }

  const Tag = multiline ? "textarea" : "input";
  return (
    <Tag
      ref={ref}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !multiline) commit();
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      }}
      placeholder={placeholder}
      className={className}
      style={{
        font: "inherit",
        color: "inherit",
        background: colors.surface2,
        border: `1px solid ${colors.borderInput}`,
        borderRadius: radii.sm,
        padding: "3px 8px",
        width: "100%",
        resize: multiline ? "vertical" : "none",
        minHeight: multiline ? 60 : undefined,
        outline: "none",
        transition: transitions.fast,
      }}
    />
  );
}
