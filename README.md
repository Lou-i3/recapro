# RécaPro

Project status tracking application. Manages decisions, actions and questions organized by sections, with priorities, assignment, notes, sub-items, and item linking.

## Getting started

```bash
npm install
npm run dev
```

The app is available at http://localhost:3000.

## Features

- **Multi-project** — create, manage and navigate between multiple projects
- **3 categories** — Decisions, Actions, Questions, each with their own statuses
- **Custom sections** — organize items by theme (General, Technical, Budget…)
- **Priorities & assignment** — high/medium/low, owner per item
- **Sub-items** — unlimited nesting depth with completion tracking
- **Short IDs** — stable, readable IDs per item (D1, A5, Q3, D1.1…)
- **Item linking** — typed relationships: depends on, stems from, related to
- **Contextual link creation** — category-aware quick-create buttons (Q→D→A workflow), hybrid search+create picker
- **Link display** — grouped by type (Stems from, Leads to, Depends on, Blocks, Related) with status indicators, section badges, and category colors
- **Dependency indicators** — visual status on dependency links with unblock suggestions
- **Search & filter** — real-time search on text, shortId, notes, owner (⌘K shortcut), parent/child inclusion
- **Sticky toolbar** — search, sections dropdown, view mode, show hidden, expand/collapse all — always visible on scroll, shared between project view and task pages
- **Markdown notes** — per-project notes panel with markdown preview
- **Drag & drop** — reorder items within any level, reparent by dropping on an item (3-zone detection)
- **Reparenting** — move items between parents via drag & drop or context menu (Make child of… / Make root item)
- **Views** — by section or by category, with collapse/expand
- **Expand/collapse all** — open/close all item details or all parent-child hierarchies
- **Import/Export JSON** — save and restore data
- **Dashboard** — global stats and recent activity

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- Built-in API Routes (JSON storage on filesystem in `data/`)
- Inline styles with design tokens (dark theme)
- Phosphor Icons (`@phosphor-icons/react`) for UI controls
- `react-markdown` + `remark-gfm` for markdown rendering

## Structure

```
src/
├── app/                    # Pages and API Routes (Next.js App Router)
│   ├── api/projects/       # CRUD projects (GET, POST, PUT, DELETE)
│   ├── dashboard/          # Global dashboard
│   ├── project/[slug]/     # Project view
│   └── tasks/              # Task views (by project, in progress)
├── components/             # React components
│   ├── dashboard/          # StatsSection, ActivityFeed
│   ├── layout/             # Layout, Sidebar
│   ├── project/            # ProjectView, ItemRow, ItemPicker, LinkSection, EditableText, etc.
│   └── ui/                 # Toolbar (shared), icons (Phosphor re-exports)
├── hooks/                  # useProject, useProjects, useAllProjects, useSearchAndFilter, useItemHierarchy, useItemLinks
├── lib/                    # constants, theme, api, storage
└── types/                  # Central TypeScript types
```

## Roadmap

- [ ] **Sort items** — sort by priority (high → low) or last-update (desc), applied within each section×category group. Sort-by-date requires adding `updatedAt: number` to `Item` and bumping it on all mutations (update/add/drag/reparent/link ops) — invasive, needs careful propagation
- [ ] **Filters** — by priority, owner, status, category. Should live in the Toolbar (icon + popover or dedicated "Filters (N)" button)
- [ ] **Sort & filters on task pages** — same controls as ProjectView
- [ ] **MCP Server** — allow Claude to interact with project data ([plan](docs/plan-mcp-server.md))
- [ ] **My Day feature** — checkbox on `ItemRow` + dashboard section listing today's focus items. Store `markedForTodayAt: number` timestamp, auto-filter to today only (rolling reset at midnight, no manual clear needed)

- [ ] **Enhanced import/export** — merge, partial export, CSV format
- [ ] **History / audit** — log status changes
- [ ] **Theme** — light/dark toggle
- [ ] **Notion export** — generate Notion pages via API
- [ ] **Auto-suggest decisions** — propose creating a decision when a question is marked as answered
- [ ] **Replace priority glyphs** — priorities still use unicode shapes (▲◆▽) on `PriorityDot`; could swap to Phosphor icons for visual consistency with the rest of the UI
- [ ] **Collapse/expand state persistence** — remember collapsed sections across sessions
