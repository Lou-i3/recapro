'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { CATEGORIES, COMPLETED_STATUSES, HIDDEN_STATUSES, CATEGORY_PREFIX, emptyItem } from "../../lib/constants";
import { exportProjectJSON, importProjectJSON } from "../../lib/storage";
import { colors, categoryBg, fonts, fontSizes, spacing, radii, transitions, shadows, labelStyle, buttonStyle, buttonPrimaryStyle, buttonDashedStyle, inputStyle } from "../../lib/theme";
import EditableText from "./EditableText";
import ItemRow from "./ItemRow";
import type { Project, Item, CategoryId, ItemLink, LinkType } from "../../types";

interface ProjectViewProps {
  project: Project;
  onSave: (data: Partial<Project>) => void;
}

export default function ProjectView({ project, onSave }: ProjectViewProps) {
  const { projectName, sections, items } = project;

  const [viewMode, setViewMode] = useState<"bySection" | "byCategory">("bySection");
  const [showHidden, setShowHidden] = useState(false);
  const [newSection, setNewSection] = useState("");
  const [addingSectionOpen, setAddingSectionOpen] = useState(false);
  const [dragItem, setDragItem] = useState<Item | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [sectionMenu, setSectionMenu] = useState<string | null>(null);
  const [renamingSection, setRenamingSection] = useState<string | null>(null);
  const sectionMenuRef = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<Project>) => onSave({ ...project, ...patch });

  const setProjectName = (name: string) => update({ projectName: name });
  const setItems = (fn: Item[] | ((prev: Item[]) => Item[])) => {
    const next = typeof fn === "function" ? fn(items) : fn;
    update({ items: next });
  };
  const setSections = (fn: string[] | ((prev: string[]) => string[])) => {
    const next = typeof fn === "function" ? fn(sections) : fn;
    update({ sections: next });
  };

  const updateItem = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const deleteItem = (id: string) =>
    setItems((prev) => prev.filter((it) => it.id !== id && it.parentId !== id));

  const nextShortId = useCallback((categoryId: CategoryId, parentId: string | null, currentItems: Item[]) => {
    if (parentId) {
      const parent = currentItems.find(i => i.id === parentId);
      const siblingCount = currentItems.filter(i => i.parentId === parentId).length;
      return `${parent?.shortId || '?'}.${siblingCount + 1}`;
    }
    const prefix = CATEGORY_PREFIX[categoryId];
    const maxNum = currentItems
      .filter(i => i.category === categoryId && !i.parentId && i.shortId)
      .reduce((max, i) => {
        const n = parseInt(i.shortId.slice(1), 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
    return `${prefix}${maxNum + 1}`;
  }, []);

  const nextOrder = useCallback((categoryId: CategoryId, section: string, currentItems: Item[]) => {
    const groupItems = currentItems.filter(i => i.category === categoryId && i.section === section && !i.parentId);
    return groupItems.reduce((max, i) => Math.max(max, i.order || 0), 0) + 1;
  }, []);

  const addItem = (categoryId: CategoryId, section: string, parentId: string | null = null, extraLinks: ItemLink[] = []) => {
    setItems((prev) => {
      const newItem = {
        ...emptyItem(categoryId, section, parentId),
        shortId: nextShortId(categoryId, parentId, prev),
        order: nextOrder(categoryId, section, prev),
        links: extraLinks,
      };
      return [...prev, newItem];
    });
  };

  const addSection = () => {
    const name = newSection.trim();
    if (name && !sections.includes(name)) {
      setSections((prev) => [...prev, name]);
      setNewSection("");
      setAddingSectionOpen(false);
    }
  };

  const removeSection = (s: string) => {
    if (sections.length <= 1) return;
    const fallback = sections.find((x) => x !== s) || sections[0];
    setItems((prev) => prev.map((it) => (it.section === s ? { ...it, section: fallback } : it)));
    setSections((prev) => prev.filter((x) => x !== s));
  };

  const renameSection = (oldName: string, newName: string) => {
    const name = newName.trim();
    if (!name || name === oldName || sections.includes(name)) return;
    setSections((prev) => prev.map(s => s === oldName ? name : s));
    setItems((prev) => prev.map(it => it.section === oldName ? { ...it, section: name } : it));
  };

  useEffect(() => {
    if (!sectionMenu) return;
    const handle = (e: MouseEvent) => {
      if (sectionMenuRef.current && !sectionMenuRef.current.contains(e.target as Node)) setSectionMenu(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [sectionMenu]);

  const toggleCollapse = (key: string) =>
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const isCompleted = (item: Item) => COMPLETED_STATUSES.has(item.status);
  const isHidden = (item: Item) => HIDDEN_STATUSES.has(item.status);
  const filteredItems = showHidden ? items : items.filter((i) => !isHidden(i));

  const rootItems = items.filter(i => !i.parentId);
  const stats = {
    total: rootItems.length,
    done: rootItems.filter(i => isCompleted(i)).length,
    high: rootItems.filter(i => i.priority === "high" && !isCompleted(i)).length,
    blocked: rootItems.filter(i => i.status === "blocked").length,
  };
  const catStats = CATEGORIES.map(cat => {
    const catItems = rootItems.filter(i => i.category === cat.id);
    const done = catItems.filter(i => isCompleted(i)).length;
    return { ...cat, total: catItems.length, done, rate: catItems.length > 0 ? Math.round((done / catItems.length) * 100) : 0 };
  });
  const overallRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  // Compute reverse links: for each item, which other items link TO it
  const reverseLinks = useMemo(() => {
    const map: Record<string, { sourceId: string; type: LinkType }[]> = {};
    for (const item of items) {
      if (!item.links) continue;
      for (const link of item.links) {
        if (!map[link.targetId]) map[link.targetId] = [];
        map[link.targetId].push({ sourceId: item.id, type: link.type });
      }
    }
    return map;
  }, [items]);

  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  const scrollToItem = useCallback((itemId: string) => {
    setHighlightedItemId(itemId);
    setTimeout(() => {
      const el = document.getElementById(`item-${itemId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    setTimeout(() => setHighlightedItemId(null), 2500);
  }, []);

  const getChildren = (parentId: string) => filteredItems.filter(i => i.parentId === parentId);
  const getRootItems = (list: Item[]) => list.filter(i => !i.parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
  const getChildCount = (parentId: string) => items.filter(i => i.parentId === parentId).length;
  const getDoneChildCount = (parentId: string) => items.filter(i => i.parentId === parentId && isCompleted(i)).length;

  const handleDragStart = (e: React.DragEvent, item: Item) => {
    setDragItem(item);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent, targetCategory: CategoryId, targetSection: string) => {
    e.preventDefault();
    if (dragItem) {
      setItems((prev) => {
        const updated = prev.map(it => it.id === dragItem.id
          ? { ...it, category: targetCategory, section: targetSection }
          : it
        );
        // Reindex order for the target group
        let order = 1;
        return updated.map(it => {
          if (it.category === targetCategory && it.section === targetSection && !it.parentId) {
            return { ...it, order: order++ };
          }
          return it;
        });
      });
      setDragItem(null);
    }
  };

  const handleExport = () => {
    exportProjectJSON({ projectName, sections, items });
  };

  const handleImport = async () => {
    try {
      const data = await importProjectJSON();
      const patch: Partial<Project> = {};
      if (data.items) patch.items = data.items;
      if (data.sections) patch.sections = data.sections;
      if (data.projectName) patch.projectName = data.projectName;
      update(patch);
    } catch { /* user cancelled */ }
  };

  const renderItemWithChildren = (item: Item) => {
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
        allItems={items}
        reverseLinks={reverseLinks[item.id] || []}
        onScrollToItem={scrollToItem}
        highlighted={highlightedItemId === item.id}
        onAddLinkedItem={(categoryId, linkType) => {
          addItem(categoryId, item.section, null, [{ targetId: item.id, type: linkType }]);
        }}
        onAddLink={(link) => updateItem(item.id, { links: [...(item.links || []), link] })}
        onRemoveLink={(targetId, type) => updateItem(item.id, {
          links: (item.links || []).filter(l => !(l.targetId === targetId && l.type === type)),
        })}
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
            allItems={items}
            reverseLinks={reverseLinks[child.id] || []}
            onScrollToItem={scrollToItem}
            highlighted={highlightedItemId === child.id}
            onAddLinkedItem={() => {}}
            onAddLink={(link) => updateItem(child.id, { links: [...(child.links || []), link] })}
            onRemoveLink={(targetId, type) => updateItem(child.id, {
              links: (child.links || []).filter(l => !(l.targetId === targetId && l.type === type)),
            })}
          />
        ))}
      </ItemRow>
    );
  };

  const renderItems = (list: Item[], sectionName: string, categoryId: CategoryId) => {
    const roots = getRootItems(list);
    return (
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, categoryId, sectionName)}
        style={{ minHeight: 30 }}
      >
        {roots.map((item) => renderItemWithChildren(item))}
        <button
          onClick={() => addItem(categoryId, sectionName)}
          style={buttonDashedStyle}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.borderInput; e.currentTarget.style.color = colors.textSecondary; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.borderDashed; e.currentTarget.style.color = colors.dimmed; }}
        >
          + Add
        </button>
      </div>
    );
  };

  const renderBySection = () =>
    sections.map((section) => {
      const sectionItems = filteredItems.filter((i) => i.section === section);
      const collapsed = collapsedSections[section];
      const count = getRootItems(sectionItems).length;
      return (
        <div key={section} style={{ marginBottom: spacing.xxl }}>
          <div
            onClick={() => toggleCollapse(section)}
            style={{
              display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm,
              borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: spacing.sm,
              cursor: "pointer", userSelect: "none",
              position: "sticky", top: 0, zIndex: 5,
              background: colors.bgContent, paddingTop: spacing.sm,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: fontSizes.lg, letterSpacing: "0.01em" }}>
              {section}
            </span>
            <span style={{ fontSize: fontSizes.sm, color: colors.textMuted }}>
              {count} item{count !== 1 ? "s" : ""}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: fontSizes.xs, color: colors.textMuted, transition: transitions.fast }}>
              {collapsed ? "▶" : "▼"}
            </span>
          </div>
          {!collapsed && CATEGORIES.map((cat) => {
            const catItems = sectionItems.filter((i) => i.category === cat.id);
            const subKey = `${section}:${cat.id}`;
            const subCollapsed = collapsedSections[subKey];
            const subCount = getRootItems(catItems).length;
            if (subCount === 0 && catItems.length === 0) {
              return (
                <div key={cat.id} style={{ marginBottom: spacing.sm }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, cat.id, section)}
                >
                  <div
                    style={{ fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: 2, paddingLeft: spacing.xs, cursor: 'default' }}
                  >
                    {cat.icon} {cat.label}
                  </div>
                  <button onClick={() => addItem(cat.id, section)} style={{
                    ...buttonDashedStyle, padding: "3px 10px", fontSize: fontSizes.sm, borderColor: colors.borderLight,
                  }}>+</button>
                </div>
              );
            }
            return (
              <div key={cat.id} style={{
                marginBottom: spacing.md,
                background: categoryBg[cat.id] || 'transparent',
                borderRadius: radii.lg,
                padding: `${spacing.sm}px ${spacing.md}px`,
                borderLeft: `2px solid ${cat.color}22`,
              }}>
                <div
                  onClick={() => toggleCollapse(subKey)}
                  style={{
                    fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.xs,
                    cursor: 'pointer', userSelect: 'none',
                    display: 'flex', alignItems: 'center', gap: spacing.xs,
                  }}
                >
                  {cat.icon} {cat.label}
                  <span style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{subCount}</span>
                  <span style={{ marginLeft: 'auto', fontSize: fontSizes.xs, color: colors.textMuted }}>
                    {subCollapsed ? '▶' : '▼'}
                  </span>
                </div>
                {!subCollapsed && renderItems(catItems, section, cat.id)}
              </div>
            );
          })}
        </div>
      );
    });

  const renderByCategory = () =>
    CATEGORIES.map((cat) => {
      const catItems = filteredItems.filter((i) => i.category === cat.id);
      const collapsed = collapsedSections[cat.id];
      const count = getRootItems(catItems).length;
      return (
        <div key={cat.id} style={{ marginBottom: spacing.xxl }}>
          <div
            onClick={() => toggleCollapse(cat.id)}
            style={{
              display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm,
              borderBottom: `2px solid ${cat.color}33`, paddingBottom: spacing.sm,
              cursor: "pointer", userSelect: "none",
              position: "sticky", top: 0, zIndex: 5,
              background: colors.bgContent, paddingTop: spacing.sm,
            }}
          >
            <span style={{ fontSize: 18 }}>{cat.icon}</span>
            <span style={{ fontWeight: 700, fontSize: fontSizes.lg, color: cat.color }}>
              {cat.label}
            </span>
            <span style={{ fontSize: fontSizes.sm, color: colors.textMuted }}>{count}</span>
            <span style={{ marginLeft: 'auto', fontSize: fontSizes.xs, color: colors.textMuted, transition: transitions.fast }}>
              {collapsed ? "▶" : "▼"}
            </span>
          </div>
          {!collapsed && sections.map((section) => {
            const sItems = catItems.filter((i) => i.section === section);
            const subKey = `${cat.id}:${section}`;
            const subCollapsed = collapsedSections[subKey];
            const subCount = getRootItems(sItems).length;
            return (
              <div key={section} style={{ marginBottom: spacing.sm }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, cat.id, section)}
              >
                <div
                  onClick={() => toggleCollapse(subKey)}
                  style={{
                    fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: 2, paddingLeft: spacing.xs,
                    cursor: 'pointer', userSelect: 'none',
                    display: 'flex', alignItems: 'center', gap: spacing.xs,
                  }}
                >
                  📁 {section}
                  <span style={{ fontSize: fontSizes.xs }}>{subCount}</span>
                  <span style={{ marginLeft: 'auto', fontSize: fontSizes.xs }}>
                    {subCollapsed ? '▶' : '▼'}
                  </span>
                </div>
                {!subCollapsed && (getRootItems(sItems).length > 0 ? renderItems(sItems, section, cat.id) : (
                  <button onClick={() => addItem(cat.id, section)} style={{
                    ...buttonDashedStyle, padding: "3px 10px", fontSize: fontSizes.sm, borderColor: colors.borderLight,
                  }}>+</button>
                ))}
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
        <div style={{ marginBottom: spacing.lg }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>
            <EditableText
              value={projectName}
              onChange={setProjectName}
              placeholder="Project name"
            />
          </div>
          <div style={{ ...labelStyle, fontSize: fontSizes.xs }}>
            {new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        {/* Stats cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: spacing.sm, marginBottom: spacing.md,
        }}>
          <div style={{
            background: colors.surfaceStats, borderRadius: radii.lg,
            padding: `${spacing.md}px ${spacing.lg}px`,
            border: `1px solid ${colors.green}18`,
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

          {catStats.map(cat => (
            <div key={cat.id} style={{
              background: categoryBg[cat.id] || colors.surface2, borderRadius: radii.lg,
              padding: `${spacing.md}px ${spacing.lg}px`,
              border: `1px solid ${cat.color}18`,
              borderLeft: `3px solid ${cat.color}`,
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

      {/* Toolbar */}
      <div style={{ display: "flex", gap: spacing.sm, marginBottom: spacing.lg, flexWrap: "wrap", alignItems: "center" }}>
        {sections.map((s) => (
          <span key={s} style={{ position: 'relative', display: 'inline-flex' }}>
            {renamingSection === s ? (
              <input
                autoFocus
                defaultValue={s}
                onBlur={(e) => { renameSection(s, e.target.value); setRenamingSection(null); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { renameSection(s, (e.target as HTMLInputElement).value); setRenamingSection(null); }
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
                  Rename
                </button>
                <button
                  onClick={() => {
                    setSectionMenu(null);
                    const count = items.filter(i => i.section === s).length;
                    const msg = count > 0
                      ? `Delete section "${s}"? Its ${count} item${count > 1 ? 's' : ''} will be moved.`
                      : `Delete section "${s}"?`;
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
                  Delete
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
              placeholder="New section"
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

        <span style={{ flex: 1 }} />

        <div style={{
          display: 'inline-flex', borderRadius: radii.md, overflow: 'hidden',
          border: `1px solid ${colors.border}`,
        }}>
          {([{ id: 'bySection' as const, label: 'Sections' }, { id: 'byCategory' as const, label: 'Categories' }]).map(v => (
            <button
              key={v.id}
              onClick={() => setViewMode(v.id)}
              style={{
                padding: `3px ${spacing.md}px`,
                fontSize: fontSizes.sm, fontFamily: fonts.body,
                background: viewMode === v.id ? colors.surface3 : 'transparent',
                color: viewMode === v.id ? colors.text : colors.textMuted,
                border: 'none', cursor: 'pointer',
                transition: transitions.fast,
              }}
            >{v.label}</button>
          ))}
        </div>

        <button
          onClick={() => setShowHidden(!showHidden)}
          style={{
            padding: `3px ${spacing.md}px`,
            fontSize: fontSizes.sm, fontFamily: fonts.body,
            background: showHidden ? colors.blueBg : 'transparent',
            color: showHidden ? colors.blue : colors.textMuted,
            border: `1px solid ${showHidden ? colors.blueBorder : colors.border}`,
            borderRadius: radii.md, cursor: 'pointer',
            transition: transitions.fast,
          }}
        >
          {showHidden ? 'Showing closed' : 'Show closed'}
        </button>
      </div>

      {viewMode === "bySection" ? renderBySection() : renderByCategory()}

      <div style={{
        marginTop: 32, paddingTop: spacing.lg, borderTop: `1px solid ${colors.borderLight}`,
        display: "flex", gap: spacing.sm, justifyContent: "flex-end",
      }}>
        <button onClick={handleImport} style={buttonStyle}>
          📥 Import JSON
        </button>
        <button onClick={handleExport} style={buttonPrimaryStyle}>
          📤 Export JSON
        </button>
      </div>
    </div>
  );
}
