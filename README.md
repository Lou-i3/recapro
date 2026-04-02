# Project Status Tracker

Application de suivi de statut projet. Gère des décisions, actions et questions organisées par sections, avec priorités, assignation, notes et sous-éléments.

## Démarrage

```bash
npm install
npm run dev
```

L'app est accessible sur http://localhost:3000.

## Fonctionnalités

- **Multi-projets** — créer, gérer et naviguer entre plusieurs projets
- **3 catégories** — Décisions, Actions, Questions, chacune avec ses propres statuts
- **Sections personnalisables** — organiser les éléments par thème (Général, Technique, Budget…)
- **Priorités et assignation** — haute/moyenne/basse, owner par élément
- **Sous-éléments** — items enfants avec suivi de complétion
- **Notes markdown** — panneau de notes par projet avec preview markdown
- **Drag & drop** — déplacer les items entre sections et catégories
- **Vues** — par section ou par catégorie, avec collapse/expand
- **Import/Export JSON** — sauvegarder et restaurer les données
- **Dashboard** — stats globales et activité récente

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- API Routes intégrées (stockage JSON sur le filesystem dans `data/`)
- Inline styles avec design tokens (dark theme)

## Structure

```
src/
├── app/                    # Pages et API Routes (Next.js App Router)
│   ├── api/projects/       # CRUD projets (GET, POST, PUT, DELETE)
│   ├── dashboard/          # Dashboard global
│   ├── project/[slug]/     # Vue projet
│   └── tasks/              # Vues tâches (par projet, en cours)
├── components/             # Composants React
│   ├── dashboard/          # StatsSection, ActivityFeed
│   ├── layout/             # Layout, Sidebar
│   └── project/            # ProjectView, ItemRow, EditableText, etc.
├── hooks/                  # useProject, useProjects, useAllProjects
├── lib/                    # constants, theme, api, storage
└── types/                  # Types TypeScript centraux
```

## Roadmap

- [ ] **Serveur MCP** — permettre à Claude d'interagir avec les données projet ([plan](docs/plan-mcp-server.md))
- [ ] **Import/Export amélioré** — merge, export partiel, format CSV
- [ ] **Historique / audit** — log des changements de statut
- [ ] **Filtres avancés** — par owner, priorité, recherche texte
- [ ] **Drag & drop amélioré** — réordonner les items et les sections
- [ ] **Thème** — toggle light/dark
- [ ] **Export Notion** — générer des pages Notion via l'API
- [ ] **Recherche** — barre de recherche globale avec raccourcis clavier permettant de filter les items par texte, owner, priorité, etc.