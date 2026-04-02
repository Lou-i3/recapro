import { useState, useRef, useEffect } from "react";
import { CATEGORIES, TERMINAL_STATUSES, emptyItem } from "../../lib/constants";
import { exportProjectJSON, importProjectJSON } from "../../lib/storage";
import { colors, fonts, fontSizes, spacing, radii, transitions, shadows, labelStyle, buttonStyle, buttonPrimaryStyle, buttonDashedStyle, inputStyle } from "../../lib/theme";
import EditableText from "./EditableText";
import ItemRow from "./ItemRow";

export default function ProjectView({ project, onSave }) {
  const { projectName, sections, items } = project;

  const [viewMode, setViewMode] = useState("bySection");
  const [filterDone, setFilterDone] = useState(false);
  const [newSection, setNewSection] = useState("");
  const [addingSectionOpen, setAddingSectionOpen] = useState(false);
  const [dragItem, setDragItem] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [sectionMenu, setSectionMenu] = useState(null);
  const [renamingSection, setRenamingSection] = useState(null);
  const sectionMenuRef = useRef(null);

  const update = (patch) => onSave({ ...project, ...patch });

  const setProjectName = (name) => update({ projectName: name });
  const setItems = (fn) => {
    const next = typeof fn === "function" ? fn(items) : fn;
    update({ items: next });
  };
  const setSections = (fn) => {
    const next = typeof fn === "function" ? fn(sections) : fn;
    update({ sections: next });
  };

  const updateItem = (id, patch) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const deleteItem = (id) =>
    setItems((prev) => prev.filter((it) => it.id !== id && it.parentId !== id));
  const addItem = (categoryId, section, parentId = null) =>
    setItems((prev) => [...prev, emptyItem(categoryId, section, parentId)]);

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

  const renameSection = (oldName, newName) => {
    const name = newName.trim();
    if (!name || name === oldName || sections.includes(name)) return;
    setSections((prev) => prev.map(s => s === oldName ? name : s));
    setItems((prev) => prev.map(it => it.section === oldName ? { ...it, section: name } : it));
  };

  // Close section menu on outside click
  useEffect(() => {
    if (!sectionMenu) return;
    const handle = (e) => {
      if (sectionMenuRef.current && !sectionMenuRef.current.contains(e.target)) setSectionMenu(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [sectionMenu]);

  const toggleCollapse = (key) =>
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const isTerminal = (item) => TERMINAL_STATUSES.has(item.status);
  const filteredItems = filterDone ? items.filter((i) => !isTerminal(i)) : items;

  // Root items only (no parentId) for counting
  const rootItems = items.filter(i => !i.parentId);
  const stats = {
    total: rootItems.length,
    done: rootItems.filter(i => isTerminal(i)).length,
    high: rootItems.filter(i => i.priority === "high" && !isTerminal(i)).length,
    blocked: rootItems.filter(i => i.status === "blocked").length,
  };
  const catStats = CATEGORIES.map(cat => {
    const catItems = rootItems.filter(i => i.category === cat.id);
    const done = catItems.filter(i => isTerminal(i)).length;
    return { ...cat, total: catItems.length, done, rate: catItems.length > 0 ? Math.round((done / catItems.length) * 100) : 0 };
  });
  const overallRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  // ─── Helpers for parent/child grouping ───
  const getChildren = (parentId) => filteredItems.filter(i => i.parentId === parentId);
  const getRootItems = (list) => list.filter(i => !i.parentId);
  const getChildCount = (parentId) => items.filter(i => i.parentId === parentId).length;
  const getDoneChildCount = (parentId) => items.filter(i => i.parentId === parentId && isTerminal(i)).length;

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
      const patch = {};
      if (data.items) patch.items = data.items;
      if (data.sections) patch.sections = data.sections;
      if (data.projectName) patch.projectName = data.projectName;
      update(patch);
    } catch {}
  };

  // ─── Render a single item with its children ───
  const renderItemWithChildren = (item, sectionName, categoryId) => {
    const childItems = getChildren(item.id);
    return (
      <ItemRow
        key={item.id}
        item={item}
        onUpdate={(patch) => updateItem(item.id, patch)}
        onDelete={() => deleteItem(item.id)}
        sections={sections}
        categories={CATEGORIES}
        dragHandlers={{ onDragStart: (e) => handleDragStart(e, item) }}
        childCount={getChildCount(item.id)}
        doneCount={getDoneChildCount(item.id)}
        onAddChild={() => addItem(item.category, item.section, item.id)}
        isChild={false}
      >
        {childItems.map(child => (
          <ItemRow
            key={child.id}
            item={child}
            onUpdate={(patch) => updateItem(child.id, patch)}
            onDelete={() => deleteItem(child.id)}
            sections={sections}
            categories={CATEGORIES}
            dragHandlers={{}}
            childCount={0}
            doneCount={0}
            onAddChild={() => {}}
            isChild={true}
          />
        ))}
      </ItemRow>
    );
  };

  // ─── Render items list ───
  const renderItems = (list, sectionName, categoryId) => {
    const roots = getRootItems(list);
    return (
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, categoryId, sectionName)}
        style={{ minHeight: 30 }}
      >
        {roots.map((item) => renderItemWithChildren(item, sectionName, categoryId))}
        <button
          onClick={() => addItem(categoryId, sectionName)}
          style={buttonDashedStyle}
          onMouseEnter={(e) => { e.target.style.borderColor = colors.borderInput; e.target.style.color = colors.textSecondary; }}
          onMouseLeave={(e) => { e.target.style.borderColor = colors.borderDashed; e.target.style.color = colors.dimmed; }}
        >
          + Ajouter
        </button>
      </div>
    );
  };

  // ─── View: by section ───
  const renderBySection = () =>
    sections.map((section) => {
      const sectionItems = filteredItems.filter((i) => i.section === section);
      const collapsed = collapsedSections[section];
      return (
        <div key={section} style={{ marginBottom: spacing.xxl }}>
          <div style={{
            display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm,
            borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: spacing.sm,
          }}>
            <span onClick={() => toggleCollapse(section)}
              style={{ cursor: "pointer", fontSize: fontSizes.sm, color: colors.textMuted, userSelect: "none" }}>
              {collapsed ? "▶" : "▼"}
            </span>
            <span style={{ fontWeight: 600, fontSize: fontSizes.lg, letterSpacing: "0.01em" }}>
              {section}
            </span>
            <span style={{ fontSize: fontSizes.sm, color: colors.textMuted, marginLeft: spacing.xs }}>
              {getRootItems(sectionItems).length} élément{getRootItems(sectionItems).length !== 1 ? "s" : ""}
            </span>
          </div>
          {!collapsed && CATEGORIES.map((cat) => {
            const catItems = sectionItems.filter((i) => i.category === cat.id);
            if (getRootItems(catItems).length === 0 && catItems.length === 0) {
              return (
                <div key={cat.id} style={{ marginBottom: spacing.sm }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, cat.id, section)}
                >
                  <div style={{ fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: 2, paddingLeft: spacing.xs }}>
                    {cat.icon} {cat.label}
                  </div>
                  <button onClick={() => addItem(cat.id, section)} style={{
                    ...buttonDashedStyle, padding: "3px 10px", fontSize: fontSizes.sm, borderColor: colors.borderLight,
                  }}>+</button>
                </div>
              );
            }
            return (
              <div key={cat.id} style={{ marginBottom: spacing.md }}>
                <div style={{ fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.xs, paddingLeft: spacing.xs }}>
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
        <div key={cat.id} style={{ marginBottom: spacing.xxl }}>
          <div style={{
            display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm,
            borderBottom: `2px solid ${cat.color}33`, paddingBottom: spacing.sm,
          }}>
            <span onClick={() => toggleCollapse(cat.id)} style={{ cursor: "pointer", fontSize: fontSizes.sm, color: colors.textMuted }}>
              {collapsed ? "▶" : "▼"}
            </span>
            <span style={{ fontSize: 18 }}>{cat.icon}</span>
            <span style={{ fontWeight: 700, fontSize: fontSizes.lg, color: cat.color }}>
              {cat.label}
            </span>
            <span style={{ fontSize: fontSizes.sm, color: colors.textMuted }}>{getRootItems(catItems).length}</span>
          </div>
          {!collapsed && sections.map((section) => {
            const sItems = catItems.filter((i) => i.section === section);
            return (
              <div key={section} style={{ marginBottom: spacing.sm }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, cat.id, section)}
              >
                <div style={{ fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: 2, paddingLeft: spacing.xs }}>
                  📁 {section}
                </div>
                {getRootItems(sItems).length > 0 ? renderItems(sItems, section, cat.id) : (
                  <button onClick={() => addItem(cat.id, section)} style={{
                    ...buttonDashedStyle, padding: "3px 10px", fontSize: fontSizes.sm, borderColor: colors.borderLight,
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
      flex: 1,
      minWidth: 0,
      lineHeight: 1.6,
      fontSize: fontSizes.base,
    }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xxl }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.lg }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>
              <EditableText
                value={projectName}
                onChange={setProjectName}
                placeholder="Nom du projet"
              />
            </div>
            <div style={{ ...labelStyle, fontSize: fontSizes.xs }}>
              {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <div style={{ display: "flex", gap: spacing.sm, alignItems: "center", flexShrink: 0 }}>
            <button onClick={() => setViewMode(viewMode === "bySection" ? "byCategory" : "bySection")}
              style={buttonStyle}>
              {viewMode === "bySection" ? "Par section" : "Par catégorie"}
            </button>
            <label style={{
              fontSize: fontSizes.sm, color: colors.textSecondary,
              display: "flex", alignItems: "center", gap: spacing.xs, cursor: "pointer",
            }}>
              <input type="checkbox" checked={filterDone} onChange={() => setFilterDone(!filterDone)}
                style={{ accentColor: colors.blue }} />
              Masquer terminés
            </label>
          </div>
        </div>

        {/* Stats cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: spacing.sm, marginBottom: spacing.md,
        }}>
          {/* Overall progress */}
          <div style={{
            background: colors.surface2, borderRadius: radii.lg,
            padding: `${spacing.md}px ${spacing.lg}px`,
            border: `1px solid ${colors.borderLight}`,
          }}>
            <div style={{ ...labelStyle, fontSize: fontSizes.xs, marginBottom: spacing.sm }}>Progress</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: colors.blue, lineHeight: 1 }}>
                {overallRate}%
              </span>
              <span style={{ fontSize: fontSizes.xs, color: colors.textMuted, fontFamily: fonts.mono }}>
                {stats.done}/{stats.total}
              </span>
            </div>
            <div style={{
              height: 4, background: colors.surface1, borderRadius: 2,
              marginTop: spacing.sm, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${overallRate}%`,
                background: `linear-gradient(90deg, ${colors.blue}, ${colors.green})`,
                borderRadius: 2, transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {/* Per-category mini cards */}
          {catStats.map(cat => (
            <div key={cat.id} style={{
              background: colors.surface2, borderRadius: radii.lg,
              padding: `${spacing.md}px ${spacing.lg}px`,
              borderLeft: `3px solid ${cat.color}`,
              border: `1px solid ${colors.borderLight}`,
              borderLeftColor: cat.color,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: spacing.sm }}>
                <span style={{ fontSize: 12 }}>{cat.icon}</span>
                <span style={{ ...labelStyle, fontSize: fontSizes.xs, margin: 0 }}>{cat.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: colors.text, lineHeight: 1 }}>
                  {cat.total}
                </span>
                {cat.done > 0 && (
                  <span style={{ fontSize: fontSizes.xs, color: colors.green, fontFamily: fonts.mono }}>
                    {cat.done} done
                  </span>
                )}
              </div>
              {cat.total > 0 && (
                <div style={{
                  height: 3, background: colors.surface1, borderRadius: 2,
                  marginTop: spacing.sm, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: `${cat.rate}%`,
                    background: cat.color, borderRadius: 2,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              )}
            </div>
          ))}

          {/* Alerts */}
          {(stats.high > 0 || stats.blocked > 0) && (
            <div style={{
              background: colors.surface2, borderRadius: radii.lg,
              padding: `${spacing.md}px ${spacing.lg}px`,
              border: `1px solid ${colors.borderLight}`,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: spacing.xs,
            }}>
              <div style={{ ...labelStyle, fontSize: fontSizes.xs, marginBottom: 2 }}>Alerts</div>
              {stats.high > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors.red, flexShrink: 0 }} />
                  <span style={{ fontSize: fontSizes.sm, color: colors.red, fontFamily: fonts.mono }}>
                    {stats.high} high priority
                  </span>
                </div>
              )}
              {stats.blocked > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors.red, flexShrink: 0 }} />
                  <span style={{ fontSize: fontSizes.sm, color: colors.red, fontFamily: fonts.mono }}>
                    {stats.blocked} blocked
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section manager */}
      <div style={{ display: "flex", gap: spacing.sm, marginBottom: spacing.lg, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: fontSizes.sm, color: colors.textMuted, marginRight: spacing.xs }}>Sections :</span>
        {sections.map((s) => (
          <span key={s} style={{ position: 'relative', display: 'inline-flex' }}>
            {renamingSection === s ? (
              <input
                autoFocus
                defaultValue={s}
                onBlur={(e) => { renameSection(s, e.target.value); setRenamingSection(null); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { renameSection(s, e.target.value); setRenamingSection(null); }
                  if (e.key === 'Escape') setRenamingSection(null);
                }}
                style={{ ...inputStyle, fontSize: fontSizes.sm, width: 130, padding: "2px 8px" }}
              />
            ) : (
              <button
                onClick={() => setSectionMenu(sectionMenu === s ? null : s)}
                style={{
                  background: colors.surface2, borderRadius: radii.sm,
                  padding: `2px ${spacing.sm}px`, fontSize: fontSizes.sm, color: colors.textSecondary,
                  border: sectionMenu === s ? `1px solid ${colors.border}` : '1px solid transparent',
                  cursor: 'pointer', fontFamily: fonts.body, transition: transitions.fast,
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = colors.border}
                onMouseLeave={e => { if (sectionMenu !== s) e.currentTarget.style.borderColor = 'transparent'; }}
              >
                {s}
              </button>
            )}
            {sectionMenu === s && (
              <div ref={sectionMenuRef} style={{
                position: 'absolute', left: 0, top: '100%', marginTop: 4,
                background: colors.bgSurface, border: `1px solid ${colors.border}`,
                borderRadius: radii.lg, padding: spacing.xs,
                zIndex: 30, boxShadow: shadows.md, minWidth: 150,
              }}>
                <button
                  onClick={() => { setSectionMenu(null); setRenamingSection(s); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'none', border: 'none', color: colors.textSecondary,
                    cursor: 'pointer', padding: `${spacing.xs + 2}px ${spacing.md}px`,
                    fontSize: fontSizes.sm, borderRadius: radii.sm,
                    fontFamily: fonts.body, transition: transitions.fast,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = colors.surface2}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  Renommer
                </button>
                <button
                  onClick={() => {
                    setSectionMenu(null);
                    const count = items.filter(i => i.section === s).length;
                    const msg = count > 0
                      ? `Supprimer la section « ${s} » ? Ses ${count} élément${count > 1 ? 's' : ''} seront déplacés.`
                      : `Supprimer la section « ${s} » ?`;
                    if (window.confirm(msg)) removeSection(s);
                  }}
                  disabled={sections.length <= 1}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'none', border: 'none',
                    color: sections.length <= 1 ? colors.dimmed : colors.red,
                    cursor: sections.length <= 1 ? 'not-allowed' : 'pointer',
                    padding: `${spacing.xs + 2}px ${spacing.md}px`,
                    fontSize: fontSizes.sm, borderRadius: radii.sm,
                    fontFamily: fonts.body, transition: transitions.fast,
                  }}
                  onMouseEnter={e => { if (sections.length > 1) e.currentTarget.style.background = colors.surface2; }}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  Supprimer
                </button>
              </div>
            )}
          </span>
        ))}
        {addingSectionOpen ? (
          <span style={{ display: "inline-flex", gap: spacing.xs }}>
            <input
              autoFocus
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addSection(); if (e.key === "Escape") setAddingSectionOpen(false); }}
              placeholder="Nouvelle section"
              style={{ ...inputStyle, fontSize: fontSizes.sm, width: 130, padding: "3px 8px" }}
            />
            <button onClick={addSection} style={{ ...buttonPrimaryStyle, padding: "3px 10px" }}>
              OK
            </button>
          </span>
        ) : (
          <button onClick={() => setAddingSectionOpen(true)} style={{
            ...buttonDashedStyle, width: 'auto', padding: "2px 10px", fontSize: fontSizes.sm,
          }}>+ Section</button>
        )}
      </div>

      {/* Main content */}
      {viewMode === "bySection" ? renderBySection() : renderByCategory()}

      {/* Footer actions */}
      <div style={{
        marginTop: 32, paddingTop: spacing.lg, borderTop: `1px solid ${colors.borderLight}`,
        display: "flex", gap: spacing.sm, justifyContent: "flex-end",
      }}>
        <button onClick={handleImport} style={buttonStyle}>
          📥 Importer JSON
        </button>
        <button onClick={handleExport} style={buttonPrimaryStyle}>
          📤 Exporter JSON
        </button>
      </div>
    </div>
  );
}
