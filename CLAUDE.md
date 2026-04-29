# RécaPro

## Overview

Next.js project status tracking app. Manages items (decisions, actions, questions) organized by sections and categories, with priority, assignment, markdown notes, sub-items, item linking, drag & drop, and filesystem persistence.

## Tech stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict)
- **UI**: React 19, functional components with hooks
- **Styling**: Inline styles with design tokens (`src/lib/theme.ts`), dark theme
- **Fonts**: Lato (body), Space Mono (monospace/labels)
- **Icons**: `@phosphor-icons/react` (re-exported with cleaner names from `src/components/ui/icons.tsx`)
- **Markdown**: `react-markdown` + `remark-gfm`
- **Persistence**: JSON files in `data/` via API Routes

## Project structure

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (html, body, ClientLayout)
│   ├── page.tsx                # Redirect → /dashboard
│   ├── globals.css             # CSS reset + markdown styles
│   ├── api/projects/
│   │   ├── route.ts            # GET (list), POST (create)
│   │   └── [slug]/route.ts     # GET, PUT, DELETE
│   ├── dashboard/page.tsx
│   ├── project/[slug]/page.tsx
│   └── tasks/
│       ├── by-project/page.tsx
│       └── in-progress/page.tsx
├── components/
│   ├── layout/
│   │   ├── Layout.tsx          # Client layout (contexts, sidebar, main)
│   │   └── Sidebar.tsx         # Navigation, project management
│   ├── project/
│   │   ├── ProjectView.tsx     # Main project view (header, Toolbar, stats cards, sections/categories, items)
│   │   ├── ItemRow.tsx         # Item row (status, priority, owner, menu, links, reparenting)
│   │   ├── ItemPicker.tsx      # Reusable hybrid search+create picker (used by links, reparenting)
│   │   ├── LinkSection.tsx     # Link panel (grouped display, contextual quick-create, indicators)
│   │   ├── EditableText.tsx    # Inline editable text with markdown preview
│   │   ├── StatusBadge.tsx     # Status selector per category
│   │   ├── PriorityDot.tsx     # Priority selector
│   │   └── MarkdownPanel.tsx   # Resizable markdown notes panel
│   ├── ui/
│   │   ├── Toolbar.tsx         # Shared sticky toolbar (search + show-hidden toggle + children slot)
│   │   └── icons.tsx           # Re-exports Phosphor icons under shorter aliases
│   └── dashboard/
│       ├── StatsSection.tsx    # Global and per-project stats
│       └── ActivityFeed.tsx    # Recent activity
├── hooks/
│   ├── useProject.ts           # Fetch + debounced save for a project
│   ├── useProjects.ts          # Projects list (CRUD)
│   ├── useAllProjects.ts       # All projects with full data
│   ├── useSearchAndFilter.ts   # Search + hidden-status filter with ancestor/descendant inclusion
│   ├── useItemHierarchy.ts     # Expanded/collapsed state for items and their children
│   └── useItemLinks.ts         # Reverse link index + getLinksForItem (groups + count)
├── lib/
│   ├── constants.ts            # CATEGORIES, PRIORITY_LEVELS, STATUS_BY_CATEGORY, LINK_LABELS, QUICK_LINK_BY_CATEGORY, emptyItem()
│   ├── theme.ts                # Design tokens (colors, fonts, spacing, style presets, TOOLBAR_HEIGHT)
│   ├── api.ts                  # Client fetch wrapper (/api/projects)
│   └── storage.ts              # localStorage legacy + export/import JSON
└── types/
    └── index.ts                # Central types (Item, ItemLink, LinkType, Project, CategoryId, etc.)
```

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Dev server (http://localhost:3000)
npm run build      # Production build
npm run start      # Production server
npm run typecheck  # TypeScript check (tsc --noEmit)
```

## Conventions

- **UI language**: English (labels, placeholders, messages)
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Components**: Functional components with hooks, `"use client"` on all interactive components
- **State**: useState/useEffect/useCallback, Context API for global state (ProjectsContext, LayoutContext)
- **Styles**: Inline styles with typed JS objects (`CSSProperties`). Tokens in `theme.ts`
- **Navigation**: `next/link` and `next/navigation` (useRouter, usePathname, useParams)
- **API**: Next.js Route Handlers in `src/app/api/`

## Data model

### Item
```ts
{
  id: string;           // crypto.randomUUID()
  text: string;
  status: ItemStatus;   // Depends on category (e.g. "todo", "in-progress", "done")
  category: CategoryId; // "decisions" | "actions" | "questions"
  section: string;      // Custom section
  priority: PriorityId; // "high" | "medium" | "low"
  owner: string;
  note: string;
  parentId: string | null;  // Sub-items
  createdAt: number;
  shortId: string;      // Stable readable ID (e.g. "D3", "A7", "Q2")
  links: ItemLink[];    // Typed links to other items
  order: number;        // Position within section×category group
}
```

### ItemLink
```ts
{
  targetId: string;
  type: LinkType;       // "depends-on" | "stems-from" | "related"
}
```

### Project
```ts
{
  slug: string;
  projectName: string;
  sections: string[];
  items: Item[];
  markdown?: string;    // Project notes in markdown
  updatedAt?: number;
}
```

### Statuses by category
- **Decisions**: to-discuss → to-validate → validated → closed
- **Actions**: todo → in-progress → to-review → done / blocked → closed
- **Questions**: to-ask → to-adjust → answered → closed

### Link types
- **depends-on**: hard dependency (forward: "depends on", reverse: "blocks")
- **stems-from**: causal origin (forward: "stems from", reverse: "leads to")
- **related**: soft association (bidirectional: "related to")

### Contextual quick-create links (QUICK_LINK_BY_CATEGORY)
- **From Decision**: Action from this, Question about this, From question…
- **From Action**: From decision…, Blocked by…
- **From Question**: Decision from this, Action from this
- Primary workflow: Question → Decision → Action (bidirectional navigation)

## Key architectural patterns

- **Shared hooks** (`src/hooks/`): three hooks consumed by ProjectView and both task pages:
  - `useSearchAndFilter(items, hiddenStatuses?)` — search + hidden-status filter. Default `HIDDEN_STATUSES` (closed, done); task pages pass `COMPLETED_STATUSES` to also hide validated/answered. Search matches text/shortId/note/owner (case-insensitive) and includes ancestors + descendants of matches so context is preserved
  - `useItemHierarchy()` — `expandedItems` / `collapsedChildren` Sets, with per-id toggles and bulk setters (for "expand all" / "collapse all")
  - `useItemLinks(allItems)` — builds reverse-link index once; `getLinksForItem(item)` returns `{ count, resolvedLinks, linkGroups }` grouped as Stems from / Leads to / Depends on / Blocks / Related
- **Recursive rendering**: `renderItemRecursive(item, depth)` in ProjectView — unlimited nesting depth, all items have the same capabilities
- **Sticky Toolbar** (`components/ui/Toolbar.tsx`): single sticky block at `top: 0`, `z-index: 10`, measures itself via `ResizeObserver` and writes `--toolbar-self-h` on `:root`. Section headers in ProjectView stick at `top: var(--toolbar-self-h, 48px)`, `z-index: 5`. Page titles, subtitles and action buttons (e.g. project Notes button) live ABOVE the Toolbar as non-sticky content — passed in by the parent (e.g. `ProjectPage` builds the Notes button and passes it to `ProjectView` via the `notesButton` prop).
- **Toolbar props**: `searchQuery`, `onSearchChange`, `showHidden`, `onShowHiddenChange`, `hideLabel?` (default `"closed"`; task pages pass `"completed"`), `children?` (slot rendered between the search input and the show-hidden toggle, used for extra buttons like Sections / view-mode / detail toggles). No title/subtitle props — title rendering is the caller's responsibility. Includes a global `⌘/Ctrl+K` keyboard shortcut to focus the search input.
- **Toolbar controls style**: icon-only buttons (28×28px, square, rounded, Phosphor icons) for toggles — `Paperclip` for details, `ChevronDown`/`ChevronRight` for children expand-all, `Eye`/`EyeSlash` for show-hidden. Active state uses `colors.blueBg` background + `colors.blue` foreground. Search input and segmented view-mode control keep their original shapes.
- **Section dropdown** (ProjectView): replaces the old pills bar. A `<FolderSimple/> Sections <ChevronUp/Down/>` button in the Toolbar `children` slot opens a popover listing each section with inline rename (`Pencil` icon) + delete (`X` icon) + "+ Add section" footer. State: `sectionsOpen` + `renamingSection` + `newSection` + `addingSectionOpen`. Outside-click closes via `sectionsMenuRef`.
- **ItemPicker**: reusable hybrid component (search existing + create new inline) used by contextual link buttons, "Link existing", and the "Make child of…" menu.
- **Drag & drop zones**: 3-zone detection in `handleItemDragOver` (top 25% = before, middle 50% = reparent, bottom 25% = after); zone is recalculated in the drop handler to avoid stale state. Reparenting only allowed within the same category — cross-category drops on the middle zone fall back to "before".
- **Reparenting**: via drag & drop (zone "on") or via the item menu ("Make child of…" / "Make root item"). Same-category constraint, circular-reference prevention, `shortId` reassignment on reparent (and cascade to descendants). Dropping a child onto an empty zone promotes it to a root and reassigns its `shortId` accordingly.

## Notes for Claude

- Data is stored in `data/{slug}.json`. The `data/` folder is gitignored.
- JSON export/import format must remain stable (interface contract for future integrations).
- The user works in the M365 ecosystem and may want to integrate with Power Automate or Graph API.
- See `docs/` for implementation plans for upcoming features.
