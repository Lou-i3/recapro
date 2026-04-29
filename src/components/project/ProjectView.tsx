'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { CATEGORIES, COMPLETED_STATUSES, HIDDEN_STATUSES, CATEGORY_PREFIX, emptyItem } from "../../lib/constants";
import { exportProjectJSON, importProjectJSON } from "../../lib/storage";
import { colors, categoryBg, fonts, fontSizes, spacing, radii, transitions, shadows, labelStyle, buttonStyle, buttonPrimaryStyle, buttonDashedStyle, inputStyle } from "../../lib/theme";
import EditableText from "./EditableText";
import ItemRow from "./ItemRow";
import Toolbar from "../ui/Toolbar";
import { Paperclip, ChevronDown, ChevronRight, ChevronUp, FolderSimple, Pencil, X } from "../ui/icons";
import { useSearchAndFilter } from "../../hooks/useSearchAndFilter";
import { useItemHierarchy } from "../../hooks/useItemHierarchy";
import { useItemLinks } from "../../hooks/useItemLinks";
import type { Project, Item, CategoryId, ItemLink, LinkType } from "../../types";

interface ProjectViewProps {
  project: Project;
  onSave: (data: Partial<Project>) => void;
  notesButton?: React.ReactNode;
}

export default function ProjectView({ project, onSave, notesButton }: ProjectViewProps) {
  const { projectName, sections, items } = project;

  // Always keep a ref to the latest items to avoid stale closure bugs in callbacks
  const latestItemsRef = useRef<Item[]>(items);
  latestItemsRef.current = items;

  const { filteredItems, searchQuery, setSearchQuery, showHidden, setShowHidden } =
    useSearchAndFilter(items);
  const {
    expandedItems, collapsedChildren,
    setExpandedItems, setCollapsedChildren,
    toggleItemExpanded, toggleChildrenCollapsed,
  } = useItemHierarchy();
  const { reverseLinks } = useItemLinks(items);

  const [viewMode, setViewMode] = useState<"bySection" | "byCategory">("bySection");
  const [newSection, setNewSection] = useState("");
  const [addingSectionOpen, setAddingSectionOpen] = useState(false);
  const [dragItem, setDragItem] = useState<Item | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [renamingSection, setRenamingSection] = useState<string | null>(null);
  const sectionsMenuRef = useRef<HTMLDivElement>(null);

  // Use onSave directly so patches merge with latestData.current in useProject,
  // avoiding stale project fields being spread on top of current state.
  const update = (patch: Partial<Project>) => onSave(patch);

  const setProjectName = (name: string) => update({ projectName: name });
  // setItems uses the ref so it always operates on the latest items,
  // even when called from memoized callbacks that closed over old state.
  const setItems = (fn: Item[] | ((prev: Item[]) => Item[])) => {
    const next = typeof fn === "function" ? fn(latestItemsRef.current) : fn;
    onSave({ items: next });
  };
  const setSections = (fn: string[] | ((prev: string[]) => string[])) => {
    const next = typeof fn === "function" ? fn(sections) : fn;
    update({ sections: next });
  };

  const updateItem = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const deleteItem = (id: string) =>
    setItems((prev) => {
      const idsToRemove = new Set<string>();
      const collectDescendants = (parentId: string) => {
        idsToRemove.add(parentId);
        prev.filter(it => it.parentId === parentId).forEach(child => collectDescendants(child.id));
      };
      collectDescendants(id);
      return prev.filter(it => !idsToRemove.has(it.id));
    });

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

  // Reassign shortIds for all children of a parent recursively
  const reassignChildShortIds = (allItems: Item[], parentId: string, parentShortId: string): Item[] => {
    let idx = 0;
    return allItems.map(item => {
      if (item.parentId === parentId) {
        idx++;
        const newShortId = `${parentShortId}.${idx}`;
        return { ...item, shortId: newShortId };
      }
      return item;
    });
  };

  const reparentItem = (itemId: string, newParentId: string) => {
    setItems((prev) => {
      const item = prev.find(i => i.id === itemId);
      const newParent = prev.find(i => i.id === newParentId);
      if (!item || !newParent) return prev;
      if (item.category !== newParent.category) return prev;

      // Prevent circular reparenting
      let check: Item | undefined = newParent;
      while (check?.parentId) {
        if (check.parentId === itemId) return prev; // would create a cycle
        check = prev.find(i => i.id === check!.parentId);
      }

      const siblingCount = prev.filter(i => i.parentId === newParentId && i.id !== itemId).length;
      const newShortId = `${newParent.shortId}.${siblingCount + 1}`;

      let updated = prev.map(i => {
        if (i.id === itemId) {
          return { ...i, parentId: newParentId, section: newParent.section, shortId: newShortId };
        }
        return i;
      });

      // Reassign shortIds for children of the reparented item
      updated = reassignChildShortIds(updated, itemId, newShortId);
      return updated;
    });
  };

  const makeRootItem = (itemId: string) => {
    setItems((prev) => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;

      const newShortId = nextShortId(item.category, null, prev.filter(i => i.id !== itemId));
      const newOrder = nextOrder(item.category, item.section, prev);

      let updated = prev.map(i => {
        if (i.id === itemId) {
          return { ...i, parentId: null, shortId: newShortId, order: newOrder };
        }
        return i;
      });

      updated = reassignChildShortIds(updated, itemId, newShortId);
      return updated;
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
    const hasOrphans = items.some((it) => it.section === s);
    const remaining = sections.filter((x) => x !== s);
    const nextSections = hasOrphans && !remaining.includes("No section")
      ? [...remaining, "No section"]
      : remaining;
    onSave({
      ...project,
      sections: nextSections,
      items: items.map((it) => (it.section === s ? { ...it, section: "No section" } : it)),
    });
  };

  const renameSection = (oldName: string, newName: string) => {
    const name = newName.trim();
    if (!name || name === oldName || sections.includes(name)) return;
    onSave({
      ...project,
      sections: sections.map((s) => (s === oldName ? name : s)),
      items: items.map((it) => (it.section === oldName ? { ...it, section: name } : it)),
    });
  };

  useEffect(() => {
    if (!sectionsOpen) return;
    const handle = (e: MouseEvent) => {
      if (sectionsMenuRef.current && !sectionsMenuRef.current.contains(e.target as Node)) {
        setSectionsOpen(false);
        setRenamingSection(null);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [sectionsOpen]);

  const toggleCollapse = (key: string) =>
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const isCompleted = (item: Item) => COMPLETED_STATUSES.has(item.status);

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

  // Expand/collapse all details (items with content)
  const itemsWithContent = useMemo(() => {
    return new Set(items.filter(item => {
      const hasLinks = (item.links?.length || 0) > 0 || (reverseLinks[item.id]?.length || 0) > 0;
      return hasLinks || !!item.note;
    }).map(i => i.id));
  }, [items, reverseLinks]);

  const allDetailsOpen = useMemo(() => {
    if (itemsWithContent.size === 0) return false;
    return [...itemsWithContent].every(id => expandedItems.has(id));
  }, [itemsWithContent, expandedItems]);

  const toggleAllDetails = useCallback(() => {
    if (allDetailsOpen) {
      setExpandedItems(new Set());
    } else {
      setExpandedItems(new Set(itemsWithContent));
    }
  }, [allDetailsOpen, itemsWithContent]);

  // Expand/collapse all parent-child hierarchies
  const parentIds = useMemo(() => {
    return new Set(items.filter(i => i.parentId).map(i => i.parentId!));
  }, [items]);

  const allChildrenExpanded = useMemo(() => {
    if (parentIds.size === 0) return true;
    return [...parentIds].every(id => !collapsedChildren.has(id));
  }, [parentIds, collapsedChildren]);

  const toggleAllChildren = useCallback(() => {
    if (allChildrenExpanded) {
      setCollapsedChildren(new Set(parentIds));
    } else {
      setCollapsedChildren(new Set());
    }
  }, [allChildrenExpanded, parentIds]);

  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  const scrollToItem = useCallback((itemId: string) => {
    const targetItem = items.find(i => i.id === itemId);
    if (!targetItem) return;

    // If item is hidden by "show closed" filter, enable it
    if (!showHidden && HIDDEN_STATUSES.has(targetItem.status)) {
      setShowHidden(true);
    }

    // Expand collapsed sections/categories containing the target
    setCollapsedSections(prev => {
      const next = { ...prev };
      const section = targetItem.section;
      const category = targetItem.category;
      if (viewMode === 'bySection') {
        if (next[section]) next[section] = false;
        const subKey = `${section}:${category}`;
        if (next[subKey]) next[subKey] = false;
      } else {
        if (next[category]) next[category] = false;
        const subKey = `${category}:${section}`;
        if (next[subKey]) next[subKey] = false;
      }
      return next;
    });

    // Expand parent-child hierarchies for the target
    setCollapsedChildren(prev => {
      const next = new Set(prev);
      let current = targetItem;
      while (current.parentId) {
        next.delete(current.parentId);
        const parent = items.find(i => i.id === current.parentId);
        if (!parent) break;
        current = parent;
      }
      return next;
    });

    // Expand the target item's details panel
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });

    // Highlight and scroll after state updates render
    setHighlightedItemId(itemId);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(`item-${itemId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    setTimeout(() => setHighlightedItemId(null), 2500);
  }, [items, showHidden, viewMode]);

  const getChildren = (parentId: string) => filteredItems.filter(i => i.parentId === parentId);
  const getRootItems = (list: Item[]) => list.filter(i => !i.parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
  const getChildCount = (parentId: string) => items.filter(i => i.parentId === parentId).length;
  const getDoneChildCount = (parentId: string) => items.filter(i => i.parentId === parentId && isCompleted(i)).length;

  type DropZone = 'before' | 'on' | 'after';
  const [dropInfo, setDropInfo] = useState<{ targetId: string; zone: DropZone } | null>(null);

  const handleDragStart = (e: React.DragEvent, item: Item) => {
    e.stopPropagation();
    setDragItem(item);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleItemDragOver = (e: React.DragEvent, targetItem: Item) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragItem || dragItem.id === targetItem.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const ratio = y / rect.height;
    let zone: DropZone;
    if (ratio < 0.25) zone = 'before';
    else if (ratio > 0.75) zone = 'after';
    else zone = 'on';

    // Only allow reparenting on same category
    if (zone === 'on' && dragItem.category !== targetItem.category) zone = 'before';

    setDropInfo({ targetId: targetItem.id, zone });
  };

  // Drop handler for items (reorder or reparent)
  const handleDropOnItem = (e: React.DragEvent, targetItem: Item) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragItem || dragItem.id === targetItem.id) {
      setDragItem(null);
      setDropInfo(null);
      return;
    }

    // Recompute zone from mouse position to avoid stale state
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const ratio = y / rect.height;
    let zone: DropZone;
    if (ratio < 0.25) zone = 'before';
    else if (ratio > 0.75) zone = 'after';
    else zone = 'on';
    if (zone === 'on' && dragItem.category !== targetItem.category) zone = 'before';

    if (zone === 'on') {
      // Reparent: make dragged item a child of targetItem
      if (dragItem.category === targetItem.category) {
        reparentItem(dragItem.id, targetItem.id);
        // Ensure the target item's children are visible after reparenting
        setCollapsedChildren(prev => {
          const next = new Set(prev);
          next.delete(targetItem.id);
          return next;
        });
      }
    } else {
      // Reorder: insert before or after target, within the same sibling group
      setItems((prev) => {
        const targetParentId = targetItem.parentId;
        // Move dragged item to same parent/section/category as target
        const updated = prev.map(it => it.id === dragItem.id
          ? { ...it, category: targetItem.category, section: targetItem.section, parentId: targetParentId }
          : it
        );
        // Get siblings: items sharing the same parent (or all roots if parentId is null)
        const siblings = updated
          .filter(it =>
            it.parentId === targetParentId &&
            it.category === targetItem.category &&
            it.section === targetItem.section
          )
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        const ordered = siblings.filter(it => it.id !== dragItem.id);
        const targetIdx = ordered.findIndex(it => it.id === targetItem.id);
        const insertIdx = zone === 'before' ? targetIdx : targetIdx + 1;
        const draggedItem = siblings.find(it => it.id === dragItem.id);
        if (draggedItem) ordered.splice(insertIdx, 0, draggedItem);
        const orderMap = new Map<string, number>();
        ordered.forEach((it, i) => orderMap.set(it.id, i + 1));

        // Also reassign shortIds if the item moved to a new parent
        let result = updated.map(it => orderMap.has(it.id) ? { ...it, order: orderMap.get(it.id)! } : it);
        if (dragItem.parentId !== targetParentId) {
          const movedItem = result.find(it => it.id === dragItem.id);
          if (movedItem) {
            const newShortId = targetParentId
              ? `${result.find(it => it.id === targetParentId)?.shortId || '?'}.${ordered.findIndex(it => it.id === dragItem.id) + 1}`
              : nextShortId(movedItem.category, null, result.filter(it => it.id !== dragItem.id));
            result = result.map(it => it.id === dragItem.id ? { ...it, shortId: newShortId } : it);
            result = reassignChildShortIds(result, dragItem.id, newShortId);
          }
        }
        return result;
      });
    }
    setDragItem(null);
    setDropInfo(null);
  };

  // Drop on empty zone (append to end of group)
  const handleDrop = (e: React.DragEvent, targetCategory: CategoryId, targetSection: string) => {
    e.preventDefault();
    setDropInfo(null);
    if (!dragItem) return;

    setItems((prev) => {
      const wasChild = dragItem.parentId !== null;
      const updated = prev.map(it => it.id === dragItem.id
        ? { ...it, category: targetCategory, section: targetSection, parentId: null }
        : it
      );
      // Put dragged item at the end, then reindex
      const groupItems = updated
        .filter(it => it.category === targetCategory && it.section === targetSection && !it.parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const ordered = groupItems.filter(it => it.id !== dragItem.id);
      const dragged = groupItems.find(it => it.id === dragItem.id);
      if (dragged) ordered.push(dragged);
      const orderMap = new Map<string, number>();
      ordered.forEach((it, i) => orderMap.set(it.id, i + 1));
      let result = updated.map(it => orderMap.has(it.id) ? { ...it, order: orderMap.get(it.id)! } : it);

      // Promoted child → root: reassign its shortId and cascade to descendants
      if (wasChild) {
        const newShortId = nextShortId(targetCategory, null, result.filter(it => it.id !== dragItem.id));
        result = result.map(it => it.id === dragItem.id ? { ...it, shortId: newShortId } : it);
        result = reassignChildShortIds(result, dragItem.id, newShortId);
      }
      return result;
    });
    setDragItem(null);
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

  const removeLinkFromItem = (itemId: string, targetId: string, type: LinkType) => {
    update({
      items: items.map(it => {
        if (it.id !== itemId) return it;
        return { ...it, links: (it.links || []).filter(l => !(l.targetId === targetId && l.type === type)) };
      }),
    });
  };

  const renderItemRecursive = (item: Item, depth: number = 0) => {
    const childItems = getChildren(item.id);
    return (
      <ItemRow
        key={item.id}
        item={item}
        onUpdate={(patch) => updateItem(item.id, patch)}
        onDelete={() => deleteItem(item.id)}
        sections={sections}
        categories={CATEGORIES}
        dragHandlers={{
          onDragStart: (e) => handleDragStart(e, item),
          onDragOver: (e) => handleItemDragOver(e, item),
          onDragLeave: () => setDropInfo(null),
          onDrop: (e) => handleDropOnItem(e, item),
        }}
        isDropTarget={dropInfo?.targetId === item.id && dragItem?.id !== item.id}
        dropZone={dropInfo?.targetId === item.id ? dropInfo.zone : undefined}
        childCount={getChildCount(item.id)}
        doneCount={getDoneChildCount(item.id)}
        onAddChild={() => addItem(item.category, item.section, item.id)}
        depth={depth}
        expanded={expandedItems.has(item.id)}
        onToggleExpanded={() => toggleItemExpanded(item.id)}
        childrenOpen={!collapsedChildren.has(item.id)}
        onToggleChildren={() => toggleChildrenCollapsed(item.id)}
        allItems={items}
        reverseLinks={reverseLinks[item.id] || []}
        onScrollToItem={scrollToItem}
        highlighted={highlightedItemId === item.id}
        onCreateAndLink={(categoryId, section, text, linkType, direction) => {
          const newItem = {
            ...emptyItem(categoryId, section, null),
            text,
            shortId: nextShortId(categoryId, null, items),
            order: nextOrder(categoryId, section, items),
          };
          if (direction === 'forward') {
            // Link stored on the new item, pointing to current item
            newItem.links = [{ targetId: item.id, type: linkType }];
            update({ items: [...items, newItem] });
          } else {
            // Link stored on current item, pointing to new item
            update({
              items: [...items, newItem].map(it =>
                it.id === item.id ? { ...it, links: [...(it.links || []), { targetId: newItem.id, type: linkType }] } : it
              ),
            });
          }
        }}
        onAddLink={(link) => updateItem(item.id, { links: [...(item.links || []), link] })}
        onAddReverseLink={(targetId, link) => {
          update({
            items: items.map(it =>
              it.id === targetId ? { ...it, links: [...(it.links || []), link] } : it
            ),
          });
        }}
        onRemoveLink={(targetId, type) => removeLinkFromItem(item.id, targetId, type)}
        onRemoveLinkFromSource={removeLinkFromItem}
        onReparent={(newParentId) => reparentItem(item.id, newParentId)}
        onMakeRoot={() => makeRootItem(item.id)}
      >
        {childItems.map(child => renderItemRecursive(child, depth + 1))}
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
        {roots.map((item) => renderItemRecursive(item))}
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
      if (searchQuery.trim() && count === 0 && sectionItems.length === 0) return null;
      return (
        <div key={section} style={{ marginBottom: spacing.xxl }}>
          <div
            onClick={() => toggleCollapse(section)}
            style={{
              display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm,
              borderBottom: `1px solid ${colors.borderLight}`,
              cursor: "pointer", userSelect: "none",
              position: "sticky", top: 'var(--toolbar-self-h, 48px)', zIndex: 5,
              background: colors.bgContent,
              padding: `${spacing.sm}px ${spacing.xxl}px`,
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
          {!collapsed && <div style={{ padding: `0 ${spacing.xxl}px` }}>{CATEGORIES.map((cat) => {
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
          })}</div>}
        </div>
      );
    });

  const renderByCategory = () =>
    CATEGORIES.map((cat) => {
      const catItems = filteredItems.filter((i) => i.category === cat.id);
      const collapsed = collapsedSections[cat.id];
      const count = getRootItems(catItems).length;
      if (searchQuery.trim() && count === 0 && catItems.length === 0) return null;
      return (
        <div key={cat.id} style={{ marginBottom: spacing.xxl }}>
          <div
            onClick={() => toggleCollapse(cat.id)}
            style={{
              display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm,
              borderBottom: `2px solid ${cat.color}33`,
              cursor: "pointer", userSelect: "none",
              position: "sticky", top: 'var(--toolbar-self-h, 48px)', zIndex: 5,
              background: colors.bgContent,
              padding: `${spacing.sm}px ${spacing.xxl}px`,
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
          {!collapsed && <div style={{ padding: `0 ${spacing.xxl}px` }}>{sections.map((section) => {
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
          })}</div>}
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
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: spacing.md,
        marginBottom: spacing.lg,
        padding: `${spacing.xxl}px ${spacing.xxl}px 0`,
      }}>
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.text, lineHeight: 1.2, marginBottom: 2 }}>
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
        {notesButton && (
          <div style={{ flexShrink: 0 }}>
            {notesButton}
          </div>
        )}
      </div>

      <Toolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showHidden={showHidden}
        onShowHiddenChange={setShowHidden}
      >
        {itemsWithContent.size > 0 && (
          <button
            onClick={toggleAllDetails}
            title={allDetailsOpen ? 'Close all details' : 'Open all details'}
            style={{
              width: 28, height: 28,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: allDetailsOpen ? colors.blueBg : 'transparent',
              color: allDetailsOpen ? colors.blue : colors.textMuted,
              border: `1px solid ${allDetailsOpen ? colors.blueBorder : colors.border}`,
              borderRadius: radii.md, cursor: 'pointer',
              transition: transitions.fast,
            }}
          >
            <Paperclip size={14} weight="regular" />
          </button>
        )}

        {parentIds.size > 0 && (
          <button
            onClick={toggleAllChildren}
            title={allChildrenExpanded ? 'Collapse children' : 'Expand children'}
            style={{
              width: 28, height: 28,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: allChildrenExpanded ? colors.blueBg : 'transparent',
              color: allChildrenExpanded ? colors.blue : colors.textMuted,
              border: `1px solid ${allChildrenExpanded ? colors.blueBorder : colors.border}`,
              borderRadius: radii.md, cursor: 'pointer',
              transition: transitions.fast,
            }}
          >
            {allChildrenExpanded ? <ChevronDown size={14} weight="bold" /> : <ChevronRight size={14} weight="bold" />}
          </button>
        )}

        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            onClick={() => setSectionsOpen(v => !v)}
            title="Manage sections"
            style={{
              height: 28,
              padding: `0 ${spacing.md}px`,
              fontSize: fontSizes.sm, fontFamily: fonts.body,
              background: sectionsOpen ? colors.surface3 : 'transparent',
              color: sectionsOpen ? colors.text : colors.textMuted,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md, cursor: 'pointer',
              transition: transitions.fast,
              display: 'inline-flex', alignItems: 'center', gap: spacing.xs,
            }}
          >
            <FolderSimple size={14} weight="regular" />
            Sections
            {sectionsOpen ? <ChevronUp size={14} weight="bold" /> : <ChevronDown size={14} weight="bold" />}
          </button>
          {sectionsOpen && (
            <div ref={sectionsMenuRef} style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 4,
              background: colors.bgSurface, border: `1px solid ${colors.border}`,
              borderRadius: radii.lg, padding: spacing.xs,
              zIndex: 30, boxShadow: shadows.md, minWidth: 240,
            }}>
              {sections.map((s) => {
                const itemCount = items.filter(i => i.section === s).length;
                const isRenaming = renamingSection === s;
                return (
                  <div key={s} style={{
                    display: 'flex', alignItems: 'center', gap: spacing.xs,
                    padding: `${spacing.xs + 2}px ${spacing.sm}px`,
                    borderRadius: radii.sm,
                  }}
                    onMouseEnter={e => { if (!isRenaming) e.currentTarget.style.background = colors.surface2; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                  >
                    {isRenaming ? (
                      <input
                        autoFocus
                        defaultValue={s}
                        onBlur={(e) => { renameSection(s, e.target.value); setRenamingSection(null); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { renameSection(s, (e.target as HTMLInputElement).value); setRenamingSection(null); }
                          if (e.key === 'Escape') setRenamingSection(null);
                        }}
                        style={{ ...inputStyle, fontSize: fontSizes.sm, flex: 1, padding: '2px 8px' }}
                      />
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary }}>{s}</span>
                        <span style={{ fontSize: fontSizes.xs, color: colors.textMuted, fontFamily: fonts.mono }}>
                          {itemCount}
                        </span>
                        <button
                          onClick={() => setRenamingSection(s)}
                          title="Rename"
                          style={{
                            background: 'none', border: 'none', color: colors.textMuted,
                            cursor: 'pointer', padding: '2px 4px',
                            display: 'inline-flex', alignItems: 'center',
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = colors.text}
                          onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}
                        >
                          <Pencil size={14} weight="regular" />
                        </button>
                        <button
                          onClick={() => {
                            const msg = itemCount > 0
                              ? `Delete section "${s}"? Its ${itemCount} item${itemCount > 1 ? 's' : ''} will be moved.`
                              : `Delete section "${s}"?`;
                            if (window.confirm(msg)) removeSection(s);
                          }}
                          disabled={sections.length <= 1}
                          title={sections.length <= 1 ? 'Cannot delete last section' : 'Delete'}
                          style={{
                            background: 'none', border: 'none',
                            color: sections.length <= 1 ? colors.dimmed : colors.textMuted,
                            cursor: sections.length <= 1 ? 'not-allowed' : 'pointer',
                            padding: '2px 4px',
                            display: 'inline-flex', alignItems: 'center',
                          }}
                          onMouseEnter={e => { if (sections.length > 1) e.currentTarget.style.color = colors.red; }}
                          onMouseLeave={e => e.currentTarget.style.color = sections.length <= 1 ? colors.dimmed : colors.textMuted}
                        >
                          <X size={14} weight="bold" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}

              <div style={{ height: 1, background: colors.borderLight, margin: `${spacing.xs}px 0` }} />

              {addingSectionOpen ? (
                <div style={{ display: 'flex', gap: spacing.xs, padding: `${spacing.xs}px ${spacing.sm}px` }}>
                  <input
                    autoFocus
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addSection();
                      if (e.key === "Escape") { setAddingSectionOpen(false); setNewSection(""); }
                    }}
                    placeholder="New section"
                    style={{ ...inputStyle, fontSize: fontSizes.sm, flex: 1, padding: "3px 8px" }}
                  />
                  <button onClick={addSection} style={{ ...buttonPrimaryStyle, padding: "3px 10px" }}>
                    OK
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingSectionOpen(true)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'none', border: 'none', color: colors.textSecondary,
                    cursor: 'pointer', padding: `${spacing.xs + 2}px ${spacing.sm}px`,
                    fontSize: fontSizes.sm, borderRadius: radii.sm,
                    fontFamily: fonts.body, transition: transitions.fast,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = colors.surface2}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  + Add section
                </button>
              )}
            </div>
          )}
        </span>

        <div style={{
          display: 'inline-flex', height: 28, borderRadius: radii.md, overflow: 'hidden',
          border: `1px solid ${colors.border}`,
        }}>
          {([{ id: 'bySection' as const, label: 'Sections' }, { id: 'byCategory' as const, label: 'Categories' }]).map(v => (
            <button
              key={v.id}
              onClick={() => setViewMode(v.id)}
              style={{
                padding: `0 ${spacing.md}px`,
                fontSize: fontSizes.sm, fontFamily: fonts.body,
                background: viewMode === v.id ? colors.surface3 : 'transparent',
                color: viewMode === v.id ? colors.text : colors.textMuted,
                border: 'none', cursor: 'pointer',
                transition: transitions.fast,
              }}
            >{v.label}</button>
          ))}
        </div>
      </Toolbar>

      {/* Stats cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md,
        padding: `0 ${spacing.xxl}px`,
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

      {viewMode === "bySection" ? renderBySection() : renderByCategory()}

      <div style={{
        marginTop: 32, paddingTop: spacing.lg, borderTop: `1px solid ${colors.borderLight}`,
        display: "flex", gap: spacing.sm, justifyContent: "flex-end",
        paddingInline: spacing.xxl,
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
