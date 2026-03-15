# Recipe Book — Rooted Example App

A vertical-slice example application built with [`@rooted/components`](../../packages/components) and [`@rooted/router`](../../packages/router).

## Why a Recipe Book?

A recipe book is a content-rich domain that maps naturally to every routing primitive that Rooted provides:

| Rooted feature | How it's used |
|---|---|
| `route` + `resolve` | Every route uses the builder pattern: `route\`/path/\`({ resolve: ({ create, tokens }) => ... })` |
| `gate` | `CategoryGate` renders the `Category` component inside the `Categories` shell |
| `token('slug', String)` | Category URL slug: `/categories/italian/` |
| `token('id', Number)` | Recipe ID: `/recipe/1/` |
| `wildcard('query')` | Search: `/search/pasta/` |
| Suppression | `CategoryRoute.resolve` returns `undefined` for unknown slugs → router shows `notFound` |
| Scoped component styles | Each component declares its own CSS via `component({ styles })` |
| `signal` cleanup | Navigation listeners are tied to the component lifetime |
| `generateRouteManifest` | Vite plugin auto-discovers all `_routes.mts` files |

The domain is realistic enough to show meaningful architecture without being complex enough to distract from the framework itself.

## Data approach

Mock recipe data lives in individual Markdown files under `src/recipes/content/`. Each file has YAML frontmatter (title, category, tags, timings, difficulty) and a Markdown body (ingredients + instructions).

These files are imported as raw strings using Vite's built-in `?raw` suffix — no extra Vite plugin needed:

```ts
import pastaRaw from './content/pasta-carbonara.md?raw'
```

`src/recipes/_data.mts` parses every file with [`gray-matter`](https://github.com/jonschlinkert/gray-matter) (frontmatter) and [`marked`](https://marked.js.org/) (Markdown → HTML string), then exports a typed `Recipe[]` array. Category data is derived from the same source in `src/categories/_data.mts`.

The HTML body is rendered via `element.innerHTML` inside the recipe component — safe because the content comes from version-controlled Markdown files, not user input.

## File structure

```
src/
├── application.mts         # App entry: nav bar + router bootstrap
├── style.css               # Global CSS custom properties and base reset
├── navigate.mts            # SPA navigate() helper (pushState + popstate)
│
├── home/
│   └── home.mts            # Featured recipes grid (passed as router home:)
│
├── categories/
│   ├── _routes.mts          # CategoriesRoute, CategoryRoute, CategoryGate
│   ├── categories.mts      # All-categories grid (shell for CategoryGate)
│   ├── category.mts        # Category detail component
│   └── _data.mts           # Category list derived from recipes
│
├── recipes/
│   ├── _routes.mts          # RecipeRoute
│   ├── recipe.mts          # Recipe detail component
│   ├── _data.mts           # Parses .md files → Recipe[]
│   └── content/            # One .md file per recipe
│       ├── pasta-carbonara.md
│       ├── chicken-tikka-masala.md
│       ├── chocolate-lava-cake.md
│       ├── caesar-salad.md
│       └── beef-tacos.md
│
└── search/
    ├── _routes.mts          # SearchRoute (wildcard)
    └── search.mts          # Search results filtered from Recipe[]
```

Each slice owns its own routes, components, and data. The router is assembled automatically by the `generateRouteManifest` Vite plugin, which discovers all `_routes.mts` files and generates `src/_routes.g.mts`.

## Running the app

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:5173` in your browser.

## Routes

| URL | What you see |
|---|---|
| `/` | Home page with featured recipes |
| `/categories/` | All category cards |
| `/categories/italian/` | Category detail with `CategoryGate` active |
| `/recipe/1/` | Recipe detail |
| `/search/pasta/` | Search results matching "pasta" |
| `/categories/unknown/` | Falls through to `notFound` (suppression) |
