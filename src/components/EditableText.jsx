import { useState, useEffect, useRef } from "react";

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
    return (
      <span
        className={className}
        onClick={() => setEditing(true)}
        style={{ cursor: "text", minWidth: 40, display: "inline-block" }}
        title="Cliquer pour modifier"
      >
        {value || <span style={{ opacity: 0.35, fontStyle: "italic" }}>{placeholder}</span>}
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
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 4,
        padding: "2px 6px",
        width: "100%",
        resize: multiline ? "vertical" : "none",
        minHeight: multiline ? 60 : undefined,
        outline: "none",
      }}
    />
  );
}
