# Plan : Serveur MCP pour Project Status Tracker

## Objectif

Créer un serveur MCP (Model Context Protocol) pour que Claude (Desktop et Code) puisse lire et modifier les données projet directement via des outils dédiés, sans passer par l'interface web.

## Architecture

```
mcp/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts    # Entry point, enregistre les outils, lance le transport stdio
    └── data.ts     # Accès filesystem (lecture/écriture des JSON dans data/)
```

Le serveur accède directement aux fichiers JSON dans `data/` — pas besoin que le serveur Next.js tourne.

## Outils MCP exposés

| Outil | Description | Paramètres |
|---|---|---|
| `list_projects` | Liste tous les projets avec stats | — |
| `get_project` | Données complètes d'un projet | `slug` |
| `create_project` | Créer un nouveau projet | `slug`, `projectName?`, `sections?` |
| `add_item` | Ajouter un item à un projet | `slug`, `text`, `category`, `section`, `priority?`, `owner?`, `note?`, `parentId?` |
| `update_item` | Modifier un item | `slug`, `itemId`, champs à modifier (`text?`, `status?`, `priority?`, `owner?`, `note?`, `section?`, `category?`) |
| `delete_item` | Supprimer un item et ses enfants | `slug`, `itemId` |
| `get_project_stats` | Stats détaillées d'un projet | `slug` |

## Implémentation

### 1. `mcp/package.json`
- deps : `@modelcontextprotocol/sdk`, `zod`, `tsx`
- `"type": "module"`

### 2. `mcp/src/data.ts` — Couche d'accès données
- Résout le chemin `data/` relativement à `import.meta.url`
- Réutilise les types de `../../src/types/index.ts` et les constantes de `../../src/lib/constants.ts`
- Fonctions : `sanitizeSlug()`, `listProjects()`, `getProject()`, `writeProject()` (écriture atomique via .tmp + rename), `deleteProject()`

### 3. `mcp/src/index.ts` — Serveur MCP
- Utilise `McpServer` + `StdioServerTransport` du SDK
- Enregistre les 7 outils avec validation Zod
- Chaque handler appelle les fonctions de `data.ts`
- Retourne les résultats en JSON formaté

### 4. Configuration

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`) :
```json
{
  "mcpServers": {
    "project-status": {
      "command": "npx",
      "args": ["tsx", "/Users/rouaultlouis/github/project-status/mcp/src/index.ts"]
    }
  }
}
```

**Claude Code** (`.claude/settings.local.json`) :
```json
{
  "mcpServers": {
    "project-status": {
      "command": "npx",
      "args": ["tsx", "mcp/src/index.ts"],
      "cwd": "/Users/rouaultlouis/github/project-status"
    }
  }
}
```

## Fichiers réutilisés
- `src/types/index.ts` — types Item, Project, CategoryId, PriorityId, etc.
- `src/lib/constants.ts` — COMPLETED_STATUSES, DEFAULT_STATUS, DEFAULT_SECTIONS, STATUS_BY_CATEGORY, emptyItem()

## Vérification
1. `cd mcp && npm install`
2. Configurer Claude Desktop ou Claude Code avec la config MCP ci-dessus
3. Redémarrer Claude
4. Tester : demander à Claude de lister les projets, lire un projet, ajouter un item
5. Vérifier que les changements apparaissent dans l'app web (`npm run dev`)
