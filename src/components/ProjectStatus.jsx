import { useState, useEffect } from "react";
import { CATEGORIES, DEFAULT_SECTIONS, emptyItem } from "../lib/constants";
import { loadProjectData, saveProjectData, exportProjectJSON, importProjectJSON, migrateFromLegacyKey } from "../lib/storage";
import EditableText from "./EditableText";
import ItemRow from "./ItemRow";

export default function ProjectStatus() {
  // Migrate legacy data on first load
  useEffect(() => { migrateFromLegacyKey(); }, []);

  const saved = loadProjectData();
  const [projectName, setProjectName] = useState(saved?.projectName || "Mon Projet");
  const [sections, setSections] = useState(saved?.sections || [...DEFAULT_SECTIONS]);
  const [items, setItems] = useState(saved?.items || []);
  const [viewMode, setViewMode] = useState("bySection");
  const [filterDone, setFilterDone] = useState(false);
  const [newSection, setNewSection] = useState("");
  const [addingSectionOpen, setAddingSectionOpen] = useState(false);
  const [dragItem, setDragItem] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({});

  // Persist on change
  useEffect(() => {
    saveProjectData({ projectName, sections, items });
  }, [projectName, sections, items]);

  const updateItem = (id, patch) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const deleteItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));
  const addItem = (categoryId, section) =>
    setItems((prev) => [...prev, emptyItem(categoryId, section)]);

  const addSection = () => {
    const name = newSection.trim();
    if (name && !sections.includes(name)) {
      setSections((prev) => [...prev, name]);
      setNewSection("");
      setAddingSectionOpen(false);
    }
  };

  const removeSection = (s) => {
    if (sections.length <= 1) return;
    const fallback = sections.find((x) => x !== s) || sections[0];
    setItems((prev) => prev.map((it) => (it.section === s ? { ...it, section: fallback } : it)));
    setSections((prev) => prev.filter((x) => x !== s));
  };

  const toggleCollapse = (key) =>
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const filteredItems = filterDone ? items.filter((i) => !i.done) : items;

  const stats = {
    total: items.length,
    done: items.filter((i) => i.done).length,
    high: items.filter((i) => i.priority === "high" && !i.done).length,
  };

  // ─── Drag & drop ───
  const handleDragStart = (e, item) => {
    setDragItem(item);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, targetCategory, targetSection) => {
    e.preventDefault();
    if (dragItem) {
      updateItem(dragItem.id, { category: targetCategory, section: targetSection });
      setDragItem(null);
    }
  };

  // ─── Export / Import ───
  const handleExport = () => {
    exportProjectJSON({ projectName, sections, items });
  };

  const handleImport = async () => {
    try {
      const data = await importProjectJSON();
      if (data.items) setItems(data.items);
      if (data.sections) setSections(data.sections);
      if (data.projectName) setProjectName(data.projectName);
    } catch {}
  };

  // ─── Render items list ───
  const renderItems = (list, sectionName, categoryId) => (
    <div
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, categoryId, sectionName)}
      style={{ minHeight: 30 }}
    >
      {list.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          onUpdate={(patch) => updateItem(item.id, patch)}
          onDelete={() => deleteItem(item.id)}
          sections={sections}
          categories={CATEGORIES}
          dragHandlers={{
            onDragStart: (e) => handleDragStart(e, item),
          }}
        />
      ))}
      <button
        onClick={() => addItem(categoryId, sectionName)}
        style={{
          background: "none", border: "1px dashed rgba(255,255,255,0.1)",
          borderRadius: 6, color: "rgba(255,255,255,0.3)", cursor: "pointer",
          padding: "4px 12px", fontSize: 12, width: "100%", marginTop: 2,
          transition: "border-color 0.2s, color 0.2s",
        }}
        onMouseEnter={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.3)"; e.target.style.color = "rgba(255,255,255,0.5)"; }}
        onMouseLeave={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.color = "rgba(255,255,255,0.3)"; }}
      >
        + Ajouter
      </button>
    </div>
  );

  // ─── View: by section ───
  const renderBySection = () =>
    sections.map((section) => {
      const sectionItems = filteredItems.filter((i) => i.section === section);
      const collapsed = collapsedSections[section];
      return (
        <div key={section} style={{ marginBottom: 24 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
            borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6,
          }}>
            <span onClick={() => toggleCollapse(section)}
              style={{ cursor: "pointer", fontSize: 11, opacity: 0.4, userSelect: "none" }}>
              {collapsed ? "▶" : "▼"}
            </span>
            <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "0.02em" }}>
              {section}
            </span>
            <span style={{ fontSize: 11, opacity: 0.3, marginLeft: 4 }}>
              {sectionItems.length} élément{sectionItems.length !== 1 ? "s" : ""}
            </span>
            <button onClick={() => removeSection(section)} style={{
              marginLeft: "auto", background: "none", border: "none",
              color: "rgba(255,255,255,0.15)", cursor: "pointer", fontSize: 11,
            }} title="Supprimer la section">✕</button>
          </div>
          {!collapsed && CATEGORIES.map((cat) => {
            const catItems = sectionItems.filter((i) => i.category === cat.id);
            if (catItems.length === 0) {
              return (
                <div key={cat.id} style={{ marginBottom: 6 }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, cat.id, section)}
                >
                  <div style={{ fontSize: 12, opacity: 0.35, marginBottom: 2, paddingLeft: 4 }}>
                    {cat.icon} {cat.label}
                  </div>
                  <button onClick={() => addItem(cat.id, section)} style={{
                    background: "none", border: "1px dashed rgba(255,255,255,0.06)",
                    borderRadius: 6, color: "rgba(255,255,255,0.2)", cursor: "pointer",
                    padding: "3px 10px", fontSize: 11, width: "100%",
                  }}>+</button>
                </div>
              );
            }
            return (
              <div key={cat.id} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.45, marginBottom: 3, paddingLeft: 4 }}>
                  {cat.icon} {cat.label}
                </div>
                {renderItems(catItems, section, cat.id)}
              </div>
            );
          })}
        </div>
      );
    });

  // ─── View: by category ───
  const renderByCategory = () =>
    CATEGORIES.map((cat) => {
      const catItems = filteredItems.filter((i) => i.category === cat.id);
      const collapsed = collapsedSections[cat.id];
      return (
        <div key={cat.id} style={{ marginBottom: 24 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
            borderBottom: `2px solid ${cat.color}33`, paddingBottom: 6,
          }}>
            <span onClick={() => toggleCollapse(cat.id)} style={{ cursor: "pointer", fontSize: 11, opacity: 0.4 }}>
              {collapsed ? "▶" : "▼"}
            </span>
            <span style={{ fontSize: 18 }}>{cat.icon}</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: cat.color }}>
              {cat.label}
            </span>
            <span style={{ fontSize: 11, opacity: 0.3 }}>{catItems.length}</span>
          </div>
          {!collapsed && sections.map((section) => {
            const sItems = catItems.filter((i) => i.section === section);
            return (
              <div key={section} style={{ marginBottom: 8 }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, cat.id, section)}
              >
                <div style={{ fontSize: 11, opacity: 0.35, marginBottom: 2, paddingLeft: 4 }}>
                  📁 {section}
                </div>
                {sItems.length > 0 ? renderItems(sItems, section, cat.id) : (
                  <button onClick={() => addItem(cat.id, section)} style={{
                    background: "none", border: "1px dashed rgba(255,255,255,0.06)",
                    borderRadius: 6, color: "rgba(255,255,255,0.2)", cursor: "pointer",
                    padding: "3px 10px", fontSize: 11, width: "100%",
                  }}>+</button>
                )}
              </div>
            );
          })}
        </div>
      );
    });

  return (
    <div style={{
      minHeight: "100vh",
      padding: "24px 20px",
      maxWidth: 800,
      margin: "0 auto",
      lineHeight: 1.5,
      fontSize: 13,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4, fontSize: 22, fontWeight: 700 }}>
          <EditableText
            value={projectName}
            onChange={setProjectName}
            placeholder="Nom du projet"
          />
        </div>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 11, opacity: 0.35,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          Statut Projet — {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap",
        padding: "10px 14px", background: "rgba(255,255,255,0.03)",
        borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)",
      }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
          📊 {stats.done}/{stats.total} terminé{stats.done !== 1 ? "s" : ""}
        </span>
        {stats.high > 0 && (
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#E25D5D" }}>
            🔴 {stats.high} priorité{stats.high !== 1 ? "s" : ""} haute{stats.high !== 1 ? "s" : ""}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button onClick={() => setViewMode(viewMode === "bySection" ? "byCategory" : "bySection")}
            style={{
              background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 4,
              color: "#aaa", cursor: "pointer", padding: "3px 10px", fontSize: 11,
            }}>
            {viewMode === "bySection" ? "📁 Par section" : "🏷️ Par catégorie"}
          </button>
          <label style={{ fontSize: 11, opacity: 0.5, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <input type="checkbox" checked={filterDone} onChange={() => setFilterDone(!filterDone)}
              style={{ accentColor: "#4EA8DE" }} />
            Masquer terminés
          </label>
        </div>
      </div>

      {/* Section manager */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, opacity: 0.35, marginRight: 4 }}>Sections :</span>
        {sections.map((s) => (
          <span key={s} style={{
            background: "rgba(255,255,255,0.05)", borderRadius: 4,
            padding: "2px 8px", fontSize: 11,
          }}>{s}</span>
        ))}
        {addingSectionOpen ? (
          <span style={{ display: "inline-flex", gap: 4 }}>
            <input
              autoFocus
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addSection(); if (e.key === "Escape") setAddingSectionOpen(false); }}
              placeholder="Nouvelle section"
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 4, color: "#ccc", padding: "2px 8px", fontSize: 11, width: 120,
                outline: "none",
              }}
            />
            <button onClick={addSection} style={{
              background: "#4EA8DE", border: "none", borderRadius: 4,
              color: "#fff", cursor: "pointer", padding: "2px 8px", fontSize: 11,
            }}>OK</button>
          </span>
        ) : (
          <button onClick={() => setAddingSectionOpen(true)} style={{
            background: "none", border: "1px dashed rgba(255,255,255,0.15)",
            borderRadius: 4, color: "rgba(255,255,255,0.3)", cursor: "pointer",
            padding: "2px 8px", fontSize: 11,
          }}>+ Section</button>
        )}
      </div>

      {/* Main content */}
      {viewMode === "bySection" ? renderBySection() : renderByCategory()}

      {/* Footer actions */}
      <div style={{
        marginTop: 32, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", gap: 8, justifyContent: "flex-end",
      }}>
        <button onClick={handleImport} style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 6, color: "#aaa", cursor: "pointer", padding: "6px 14px", fontSize: 11,
        }}>📥 Importer JSON</button>
        <button onClick={handleExport} style={{
          background: "rgba(78,168,222,0.15)", border: "1px solid rgba(78,168,222,0.3)",
          borderRadius: 6, color: "#4EA8DE", cursor: "pointer", padding: "6px 14px", fontSize: 11,
        }}>📤 Exporter JSON</button>
      </div>
    </div>
  );
}
