import { useState } from "react";
import EditableText from "./EditableText";
import PriorityDot from "./PriorityDot";

export default function ItemRow({ item, onUpdate, onDelete, sections, categories, dragHandlers }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      draggable
      {...dragHandlers}
      style={{
        background: item.done ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
        borderRadius: 8,
        padding: "8px 12px",
        marginBottom: 4,
        opacity: item.done ? 0.5 : 1,
        borderLeft: `3px solid ${(categories.find(c => c.id === item.category) || categories[0]).color}`,
        transition: "opacity 0.2s, background 0.2s",
        cursor: "grab",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => onUpdate({ done: !item.done })}
          style={{ accentColor: "#4EA8DE", cursor: "pointer", flexShrink: 0 }}
        />
        <PriorityDot priority={item.priority} onChange={(p) => onUpdate({ priority: p })} />
        <EditableText
          value={item.text}
          onChange={(t) => onUpdate({ text: t })}
          placeholder="Nouvel élément…"
        />
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <EditableText
            value={item.owner}
            onChange={(o) => onUpdate({ owner: o })}
            placeholder="@"
          />
          <button onClick={() => setExpanded(!expanded)} style={{
            background: "none", border: "none", color: item.note ? "#C77DBA" : "rgba(255,255,255,0.25)",
            cursor: "pointer", fontSize: 14, padding: "2px 4px",
          }} title="Annexe / note">
            📎
          </button>
          <button onClick={onDelete} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.2)",
            cursor: "pointer", fontSize: 13, padding: "2px 4px",
          }} title="Supprimer">✕</button>
        </span>
      </div>
      {expanded && (
        <div style={{ marginTop: 8, marginLeft: 28 }}>
          <EditableText
            value={item.note}
            onChange={(n) => onUpdate({ note: n })}
            placeholder="Ajouter une note / annexe…"
            multiline
          />
          <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, opacity: 0.4 }}>Déplacer vers :</span>
            <select
              value={item.category}
              onChange={(e) => onUpdate({ category: e.target.value })}
              style={{
                fontSize: 11, background: "#1E1E24", color: "#ccc", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 4, padding: "2px 6px",
              }}
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
            <select
              value={item.section}
              onChange={(e) => onUpdate({ section: e.target.value })}
              style={{
                fontSize: 11, background: "#1E1E24", color: "#ccc", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 4, padding: "2px 6px",
              }}
            >
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
