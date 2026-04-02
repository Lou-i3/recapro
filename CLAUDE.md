# RécaPro

## Overview

Next.js project status tracking app. Manages items (decisions, actions, questions) organized by sections and categories, with priority, assignment, markdown notes, sub-items, item linking, drag & drop, and filesystem persistence.

## Tech stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict)
- **UI**: React 19, functional components with hooks
- **Styling**: Inline styles with design tokens (`src/lib/theme.ts`), dark theme
- **Fonts**: DM Sans (body), Space Mono (monospace/labels)
- **Persistence**: JSON files in `data/` via API Routes
- **Build**: Next.js (Turbopack in dev)

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
│   │   ├── ProjectView.tsx     # Main project view (items, sections, stats)
│   │   ├── ItemRow.tsx         # Item row (status, priority, owner, menu, links)
│   │   ├── LinkSection.tsx     # Link panel (chips, search, quick create, indicators)
│   │   ├── EditableText.tsx    # Inline editable text with markdown preview
│   │   ├── StatusBadge.tsx     # Status selector per category
│   │   ├── PriorityDot.tsx     # Priority selector
│   │   └── MarkdownPanel.tsx   # Resizable markdown notes panel
│   └── dashboard/
│       ├── StatsSection.tsx    # Global and per-project stats
│       └── ActivityFeed.tsx    # Recent activity
├── hooks/
│   ├── useProject.ts           # Fetch + debounced save for a project
│   ├── useProjects.ts          # Projects list (CRUD)
│   └── useAllProjects.ts       # All projects with full data
├── lib/
│   ├── constants.ts            # CATEGORIES, PRIORITY_LEVELS, STATUS_BY_CATEGORY, LINK_LABELS, emptyItem()
│   ├── theme.ts                # Design tokens (colors, fonts, spacing, style presets)
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

## Notes for Claude

- Data is stored in `data/{slug}.json`. The `data/` folder is gitignored.
- JSON export/import format must remain stable (interface contract for future integrations).
- The user works in the M365 ecosystem and may want to integrate with Power Automate or Graph API.
- See `docs/` for implementation plans for upcoming features.
