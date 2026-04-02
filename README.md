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
- **Sub-items** — child items with completion tracking
- **Short IDs** — stable, readable IDs per item (D1, A5, Q3)
- **Item linking** — typed relationships: depends on, stems from, related to
- **Dependency indicators** — visual status on dependency links with unblock suggestions
- **Markdown notes** — per-project notes panel with markdown preview
- **Drag & drop** — move items between sections and categories
- **Views** — by section or by category, with collapse/expand
- **Import/Export JSON** — save and restore data
- **Dashboard** — global stats and recent activity

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- Built-in API Routes (JSON storage on filesystem in `data/`)
- Inline styles with design tokens (dark theme)

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
│   └── project/            # ProjectView, ItemRow, LinkSection, EditableText, etc.
├── hooks/                  # useProject, useProjects, useAllProjects
├── lib/                    # constants, theme, api, storage
└── types/                  # Central TypeScript types
```

## Roadmap

- [ ] **MCP Server** — allow Claude to interact with project data ([plan](docs/plan-mcp-server.md))
- [ ] **Enhanced import/export** — merge, partial export, CSV format
- [ ] **History / audit** — log status changes
- [ ] **Advanced filters** — by owner, priority, text search
- [ ] **Enhanced drag & drop** — reorder items and sections
- [ ] **Theme** — light/dark toggle
- [ ] **Notion export** — generate Notion pages via API
- [ ] **Search** — global search bar with keyboard shortcuts to filter items by text, owner, priority, etc.
