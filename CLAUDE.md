# Project Status Tracker

## Présentation

Application React de suivi de statut projet. Permet de gérer des éléments (décisions, actions, questions) organisés par sections et catégories, avec priorité, assignation, notes/annexes, drag & drop, et persistance locale.

## Stack technique

- **Framework** : React 18+ (Vite)
- **Langage** : JavaScript (JSX)
- **Style** : CSS-in-JS (inline styles), dark theme (#16161A)
- **Polices** : DM Sans (body), Space Mono (monospace/labels)
- **Persistance** : localStorage (clé `project-status-data`)
- **Build** : Vite

## Structure du projet

```
src/
├── App.jsx                  # Point d'entrée, render <ProjectStatus />
├── main.jsx                 # Mount React
├── index.css                # Reset CSS minimal + import fonts
├── components/
│   ├── ProjectStatus.jsx    # Composant principal (state, layout, views)
│   ├── ItemRow.jsx          # Ligne d'un élément (checkbox, texte, owner, note)
│   ├── EditableText.jsx     # Champ texte inline éditable (clic → input)
│   └── PriorityDot.jsx      # Sélecteur de priorité (pastille colorée)
├── lib/
│   ├── constants.js         # CATEGORIES, PRIORITY_LEVELS, DEFAULT_SECTIONS
│   └── storage.js           # loadData(), saveData(), loadProjects(), etc.
```

## Commandes

```bash
npm install        # Installer les dépendances
npm run dev        # Serveur de dev (http://localhost:5173)
npm run build      # Build production dans dist/
npm run preview    # Preview du build
```

## Conventions

- **Langue UI** : Français (labels, placeholders, messages)
- **Nommage** : camelCase pour variables/fonctions, PascalCase pour composants
- **Composants** : Functional components avec hooks, pas de classes
- **State** : useState/useEffect, pas de state manager externe pour l'instant
- **Styles** : Inline styles avec objets JS. Palette dark : fond `#16161A`, surfaces `rgba(255,255,255,0.04)`, texte `#E0DFE4`
- **Pas de TypeScript** pour l'instant (migration possible plus tard)

## Modèle de données

### Item
```js
{
  id: string,          // crypto.randomUUID()
  text: string,        // Contenu de l'élément
  done: boolean,       // Terminé ou non
  category: string,    // "decisions" | "actions" | "questions"
  section: string,     // Nom de la section (ex: "Général", "Technique")
  priority: string,    // "high" | "medium" | "low"
  owner: string,       // Assigné à (texte libre)
  note: string,        // Note/annexe
  createdAt: number    // Date.now()
}
```

### Données persistées (localStorage)
```js
{
  projectName: string,
  sections: string[],
  items: Item[]
}
```

## Roadmap / TODO

- [ ] **Multi-projets** : Sélecteur de projet, chaque projet a son propre jeu de données. Clé localStorage par projet (ex: `project-status-{slug}`). Possibilité de créer, renommer, supprimer, dupliquer un projet.
- [ ] **Import/Export amélioré** : Import fusionné (merge) vs remplacement, export partiel (par section/catégorie), format CSV en plus de JSON.
- [ ] **Persistance backend** : Option de sauvegarde fichier JSON sur disque (mode Electron ou API), ou sync avec un backend (Supabase, etc.)
- [ ] **Historique / audit** : Horodatage des modifications, log des changements de statut
- [ ] **Filtres avancés** : Par owner, par priorité, recherche texte
- [ ] **Drag & drop amélioré** : Réordonner les items au sein d'une même liste, réordonner les sections
- [ ] **Thème** : Toggle light/dark
- [ ] **Export Notion** : Générer des pages Notion via l'API à partir des données

## Notes pour Claude

- L'app est née comme prototype dans un artefact Claude.ai — le code initial est un monolithe JSX qu'on a découpé en composants.
- L'utilisateur travaille dans l'écosystème M365 (SharePoint, Power Platform) et pourrait vouloir intégrer ce tracker avec Power Automate ou Graph API à terme.
- Le format JSON d'export/import doit rester stable car il servira de contrat d'interface si on ajoute un backend ou des intégrations.
- Priorité court terme : le multi-projets et la flexibilité import/export.
