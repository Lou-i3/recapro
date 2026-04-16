'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { CATEGORIES, COMPLETED_STATUSES, HIDDEN_STATUSES, CATEGORY_PREFIX, emptyItem } from "../../lib/constants";
import { exportProjectJSON, importProjectJSON } from "../../lib/storage";
import { colors, categoryBg, fonts, fontSizes, spacing, radii, transitions, shadows, labelStyle, buttonStyle, buttonPrimaryStyle, buttonDashedStyle, inputStyle, TOOLBAR_HEIGHT } from "../../lib/theme";
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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [collapsedChildren, setCollapsedChildren] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionMenu, setSectionMenu] = useState<string | null>(null);
  const [renamingSection, setRenamingSection] = useState<string | null>(null);
  const sectionMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const toggleItemExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const toggleChildrenCollapsed = useCallback((itemId: string) => {
    setCollapsedChildren(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

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

  const reparentItem = useCallback((itemId: string, newParentId: string) => {
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
  }, []);

  const makeRootItem = useCallback((itemId: string) => {
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
  }, [nextShortId, nextOrder]);

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

  // Cmd+K / Ctrl+K shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const isCompleted = (item: Item) => COMPLETED_STATUSES.has(item.status);
  const isHidden = (item: Item) => HIDDEN_STATUSES.has(item.status);
  const filteredItems = showHidden ? items : items.filter((i) => !isHidden(i));

  // Search filtering with parent/child inclusion
  const searchFilteredItems = useMemo(() => {
    if (!searchQuery.trim()) return filteredItems;
    const q = searchQuery.toLowerCase();
    const itemMap = new Map(filteredItems.map(i => [i.id, i]));

    // Find direct matches
    const directMatches = new Set<string>();
    for (const item of filteredItems) {
      if (
        item.text.toLowerCase().includes(q) ||
        item.shortId?.toLowerCase().includes(q) ||
        item.note?.toLowerCase().includes(q) ||
        item.owner?.toLowerCase().includes(q)
      ) {
        directMatches.add(item.id);
      }
    }

    // Include descendants of matches
    const includedIds = new Set(directMatches);
    const addDescendants = (parentId: string) => {
      for (const item of filteredItems) {
        if (item.parentId === parentId && !includedIds.has(item.id)) {
          includedIds.add(item.id);
          addDescendants(item.id);
        }
      }
    };
    for (const id of directMatches) addDescendants(id);

    // Include ancestors of matches
    const addAncestors = (itemId: string) => {
      const item = itemMap.get(itemId);
      if (item?.parentId && !includedIds.has(item.parentId)) {
        includedIds.add(item.parentId);
        addAncestors(item.parentId);
      }
    };
    for (const id of directMatches) addAncestors(id);

    return filteredItems.filter(i => includedIds.has(i.id));
  }, [filteredItems, searchQuery]);

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

  const getChildren = (parentId: string) => searchFilteredItems.filter(i => i.parentId === parentId);
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
      const updated = prev.map(it => it.id === dragItem.id
        ? { ...it, category: targetCategory, section: targetSection }
        : it
      );
      // Put dragged item at the end, then reindex
      const groupItems = updated
        .filter(it => it.category === targetCategory && it.section === targetSection && !it.parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const ordered = groupItems.filter(it => it.id !== dragItem.id);
      ordered.push(groupItems.find(it => it.id === dragItem.id)!);
      const orderMap = new Map<string, number>();
      ordered.forEach((it, i) => orderMap.set(it.id, i + 1));
      return updated.map(it => orderMap.has(it.id) ? { ...it, order: orderMap.get(it.id)! } : it);
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
      const sectionItems = searchFilteredItems.filter((i) => i.section === section);
      const collapsed = collapsedSections[section];
      const count = getRootItems(sectionItems).length;
      if (searchQuery.trim() && count === 0 && sectionItems.length === 0) return null;
      return (
        <div key={section} style={{ marginBottom: spacing.xxl }}>
          <div
            onClick={() => toggleCollapse(section)}
            style={{
              display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm,
              borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: spacing.sm,
              cursor: "pointer", userSelect: "none",
              position: "sticky", top: TOOLBAR_HEIGHT, zIndex: 5,
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
      const catItems = searchFilteredItems.filter((i) => i.category === cat.id);
      const collapsed = collapsedSections[cat.id];
      const count = getRootItems(catItems).length;
      if (searchQuery.trim() && count === 0 && catItems.length === 0) return null;
      return (
        <div key={cat.id} style={{ marginBottom: spacing.xxl }}>
          <div
            onClick={() => toggleCollapse(cat.id)}
            style={{
              display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm,
              borderBottom: `2px solid ${cat.color}33`, paddingBottom: spacing.sm,
              cursor: "pointer", userSelect: "none",
              position: "sticky", top: TOOLBAR_HEIGHT, zIndex: 5,
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

      {/* Section pills */}
      <div style={{ display: "flex", gap: spacing.sm, marginBottom: spacing.md, flexWrap: "wrap", alignItems: "center" }}>
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
      </div>

      {/* Sticky toolbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: colors.bgContent,
        borderBottom: `1px solid ${colors.borderLight}`,
        padding: `${spacing.sm}px 0`,
        marginBottom: spacing.md,
        display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 320 }}>
          <span style={{
            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
            color: colors.textMuted, fontSize: fontSizes.sm, pointerEvents: 'none',
          }}>🔍</span>
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search items… (${navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+K)`}
            style={{
              ...inputStyle,
              fontSize: fontSizes.sm,
              padding: '5px 8px 5px 28px',
              width: '100%',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: colors.textMuted,
                cursor: 'pointer', fontSize: fontSizes.sm, padding: '2px 4px',
              }}
            >✕</button>
          )}
        </div>

        <span style={{ flex: 1 }} />

        {/* Expand/collapse buttons */}
        {itemsWithContent.size > 0 && (
          <button
            onClick={toggleAllDetails}
            style={{
              padding: `3px ${spacing.sm}px`,
              fontSize: fontSizes.sm, fontFamily: fonts.body,
              background: 'transparent',
              color: colors.textMuted,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md, cursor: 'pointer',
              transition: transitions.fast,
            }}
            title={allDetailsOpen ? 'Close all details' : 'Open all details'}
          >
            {allDetailsOpen ? '📎 Close all' : '📎 Open all'}
          </button>
        )}

        {parentIds.size > 0 && (
          <button
            onClick={toggleAllChildren}
            style={{
              padding: `3px ${spacing.sm}px`,
              fontSize: fontSizes.sm, fontFamily: fonts.body,
              background: 'transparent',
              color: colors.textMuted,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md, cursor: 'pointer',
              transition: transitions.fast,
            }}
            title={allChildrenExpanded ? 'Collapse children' : 'Expand children'}
          >
            {allChildrenExpanded ? '▼ Collapse' : '▶ Expand'}
          </button>
        )}

        {/* View mode toggle */}
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

        {/* Show closed toggle */}
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
