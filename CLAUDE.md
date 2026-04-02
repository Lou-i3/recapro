# Project Status Tracker

## Présentation

Application Next.js de suivi de statut projet. Gère des éléments (décisions, actions, questions) organisés par sections et catégories, avec priorité, assignation, notes markdown, sous-éléments, drag & drop, et persistance filesystem.

## Stack technique

- **Framework** : Next.js 16 (App Router)
- **Langage** : TypeScript (strict)
- **UI** : React 19, functional components avec hooks
- **Style** : Inline styles avec design tokens (`src/lib/theme.ts`), dark theme
- **Polices** : DM Sans (body), Space Mono (monospace/labels)
- **Persistance** : Fichiers JSON dans `data/` via API Routes
- **Build** : Next.js (Turbopack en dev)

## Structure du projet

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (html, body, ClientLayout)
│   ├── page.tsx                # Redirect → /dashboard
│   ├── globals.css             # Reset CSS + styles markdown
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
│   │   ├── Layout.tsx          # Client layout (contextes, sidebar, main)
│   │   └── Sidebar.tsx         # Navigation, gestion projets
│   ├── project/
│   │   ├── ProjectView.tsx     # Vue principale projet (items, sections, stats)
│   │   ├── ItemRow.tsx         # Ligne d'un élément (status, priorité, owner, menu)
│   │   ├── EditableText.tsx    # Texte inline éditable avec preview markdown
│   │   ├── StatusBadge.tsx     # Sélecteur de statut par catégorie
│   │   ├── PriorityDot.tsx     # Sélecteur de priorité
│   │   └── MarkdownPanel.tsx   # Panneau notes markdown resizable
│   └── dashboard/
│       ├── StatsSection.tsx    # Stats globales et par projet
│       └── ActivityFeed.tsx    # Activité récente
├── hooks/
│   ├── useProject.ts           # Fetch + save debounced d'un projet
│   ├── useProjects.ts          # Liste projets (CRUD)
│   └── useAllProjects.ts       # Tous les projets avec données complètes
├── lib/
│   ├── constants.ts            # CATEGORIES, PRIORITY_LEVELS, STATUS_BY_CATEGORY, emptyItem()
│   ├── theme.ts                # Design tokens (colors, fonts, spacing, style presets)
│   ├── api.ts                  # Client fetch wrapper (/api/projects)
│   └── storage.ts              # localStorage legacy + export/import JSON
└── types/
    └── index.ts                # Types centraux (Item, Project, CategoryId, etc.)
```

## Commandes

```bash
npm install        # Installer les dépendances
npm run dev        # Serveur de dev (http://localhost:3000)
npm run build      # Build production
npm run start      # Serveur production
npm run typecheck  # Vérification TypeScript (tsc --noEmit)
```

## Conventions

- **Langue UI** : Français (labels, placeholders, messages)
- **Nommage** : camelCase pour variables/fonctions, PascalCase pour composants
- **Composants** : Functional components avec hooks, `"use client"` sur tous les composants interactifs
- **State** : useState/useEffect/useCallback, Context API pour état global (ProjectsContext, LayoutContext)
- **Styles** : Inline styles avec objets JS typés (`CSSProperties`). Tokens dans `theme.ts`
- **Navigation** : `next/link` et `next/navigation` (useRouter, usePathname, useParams)
- **API** : Route Handlers Next.js dans `src/app/api/`

## Modèle de données

### Item
```ts
{
  id: string;           // crypto.randomUUID()
  text: string;
  status: ItemStatus;   // Dépend de la catégorie (ex: "todo", "in-progress", "done")
  category: CategoryId; // "decisions" | "actions" | "questions"
  section: string;      // Section personnalisée
  priority: PriorityId; // "high" | "medium" | "low"
  owner: string;
  note: string;
  parentId: string | null;  // Sous-éléments
  createdAt: number;
}
```

### Project
```ts
{
  slug: string;
  projectName: string;
  sections: string[];
  items: Item[];
  markdown?: string;    // Notes projet en markdown
  updatedAt?: number;
}
```

### Statuts par catégorie
- **Decisions** : to-discuss → to-validate → validated → closed
- **Actions** : todo → in-progress → to-review → done / blocked → closed
- **Questions** : to-ask → to-adjust → answered → closed

## Notes pour Claude

- Les données sont stockées dans `data/{slug}.json`. Le dossier `data/` est ignoré par git.
- Le format JSON d'export/import doit rester stable (contrat d'interface pour intégrations futures).
- L'utilisateur travaille dans l'écosystème M365 et pourrait vouloir intégrer avec Power Automate ou Graph API.
- Voir `docs/` pour les plans d'implémentation des prochaines features.
