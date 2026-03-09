# Routing

Routing is provided by `@rooted/router`. The Vite plugin (`@rooted/router/manifest`) auto-discovers gate files and generates an import aggregator.

---

## Gates

A gate binds a component to a URL pattern. It renders its component only when the current path matches.

```ts
import { gate, token } from '@rooted/router'
import { Article } from './article.mts'

export const ArticleGate = gate`/articles/${token('id', Number)}/`(Article)
```

`gate` is a tagged-template function — the URL pattern comes first, the component is bound after. Use `token` interpolations to declare typed parameters.

### `token(key, Type)`

Declares a typed path parameter. `Type` is one of `Number`, `String`, `Boolean`, or `Date`.

The matched value is passed to the component via `options.gate`:

```ts
import { type GateParameters } from '@rooted/router'
import { type ArticleGate } from './_gates.mts'

export type ArticleOptions = {
  gate: GateParameters<typeof ArticleGate>
}

export const Article = component<ArticleOptions>({
  name: 'article',
  onMount({ options }) {
    console.log(options.gate.id) // number
  }
})
```

### `junction`

A junction renders its component only when a **child route is also active**. Navigating directly to the junction's own path falls through to `notFound`.

Use `junction` when the route is a layout or navigation point that exists solely to unlock child routes.

```ts
import { junction, token } from '@rooted/router'

// Renders Article only when a child route is active — not at /articles/123/ itself
export const ArticleGate = junction`/articles/${token('id', Number)}/`(Article)
```

### Child routes

A child gate references its parent as the **first interpolation** in its template string, preceded by a leading `/`. The child matches the parent's full pattern **plus** its own additional segment. Child gates receive the parent's params merged with their own.

```ts
export const ArticleGate  = junction`/articles/${token('id', Number)}/`(Article)
export const CommentsGate = gate`/${ArticleGate}/comments/`(Comments)
// CommentsGate matches /articles/123/comments/
```

The leading `/` is mandatory — `gate\`${ArticleGate}/comments/\`` (no leading slash) is a validation error.

### `wildcard(key)`

A `wildcard` interpolation matches one or more remaining path segments. It must be the last interpolation in the pattern and must be preceded by a `/`.

The matched path string is exposed on `options.gate[key]` as a `string`.

```ts
import { gate, wildcard } from '@rooted/router'

// Explicit key — options.gate.slug
export const ArchiveGate = gate`/archive/${wildcard('slug')}/`(Archive)

// Default key ('path') — options.gate.path
export const ArchiveGate = gate`/archive/${wildcard()}/`(Archive)
```

Unlike a junction, a gate with a wildcard **does** render at its own prefix path — the wildcard simply broadens what it matches.

---

## Route validation (dev mode)

In development, `gate` and `junction` validate the pattern at definition time and emit `console.error` for violations:

| Violation | Message |
|-----------|---------|
| Pattern does not start with `/` | `gate pattern must start with a slash` |
| Pattern does not end with `/` | `gate pattern must end with a slash` |
| Gate interpolation is not first | `Gate interpolation must be at the start of the pattern` |
| Gate interpolation not preceded by `/` | `Gate interpolation must be preceded by a leading slash` |
| Gate interpolation not followed by `/` | `Gate interpolation must be followed by a slash` |
| Wildcard is not the last interpolation | `Wildcard interpolation must be at the end of the pattern` |
| Wildcard not preceded by `/` | `Wildcard interpolation must be preceded by a slash` |

A junction with no child gates emits `console.warn` when mounted in a router (it will never render).

Validation is removed in production builds — invalid patterns fail silently.

---

## Child gate composition

Child gates (defined with `/${ParentGate}/`) are **not** auto-mounted by the router. The router only auto-mounts root gates — those whose pattern starts with a literal `/` with no parent gate interpolation.

A child gate must be composed explicitly by its parent component via `append`:

```ts
// _gates.mts
export const ArticlesGate = gate`/articles/`(Articles)                                    // root — auto-mounted
export const ArticleGate  = gate`/${ArticlesGate}/${token('id', Number)}/`(Article)       // child
export const CommentsGate = gate`/${ArticleGate}/comments/`(Comments)                    // grandchild

// articles.mts
onMount({ append }) {
    // ... render article list ...
    append(ArticleGate, {})    // self-managing: shows when URL matches /articles/:id/
}

// article.mts
onMount({ append }) {
    // ... render article detail ...
    append(CommentsGate, {})   // self-managing: shows when URL matches /articles/:id/comments/
}
```

All three gates can be exported from `_gates.mts` — the router simply skips the ones with a parent. Exporting child gates is still useful for type access (`GateParameters<typeof ArticleGate>`) and for other components to compose them.

**Deep-linking** works because parent gates mount synchronously: navigating directly to `/articles/123/comments/` causes `ArticlesGate` to render `Articles`, which immediately appends `ArticleGate`, which renders `Article`, which appends `CommentsGate` — all before the first paint.

---

## Router

```ts
import { router } from '@rooted/router'

const Router = router({
  home:     HomeComponent,
  notFound: NotFoundComponent,
  ArticleGate,
  CommentsGate,
})
```

- `home` — rendered at `/`
- `notFound` — rendered when no gate matches and the path is not `/`
- All other keys must be `BoundGateDefinition` values

Gates in the router self-manage their visibility via `popstate`. The router only coordinates `home` and `notFound`.

**Duplicate gates** (same reference under multiple keys) are silently deduplicated — the first key wins. In development a console warning is emitted.

**Type safety** — the router rejects gates whose component requires options beyond `gate`. Only gates whose component takes no options, or only a `gate` option, are accepted.

---

## Route manifest (Vite plugin)

The `generateRouteManifest` plugin discovers `_gates.mts` files and writes a single aggregator file that re-exports them all. The aggregator can be spread directly into `router()`.

### `vite.config.ts`

```ts
import { generateRouteManifest } from '@rooted/router/manifest'

export default defineConfig({
  plugins: [
    generateRouteManifest({
      glob: './src/**/_gates.mts',  // pattern to discover gate files
      root: './src/_routes.g.mts',  // output aggregator (gitignored)
    }),
  ],
})
```

### Usage

```ts
import { router } from '@rooted/router'
import { appRoutes } from './_routes.g.mts'

const Router = router({ home, notFound, ...appRoutes })
```

The aggregator is regenerated on `buildStart`. In dev mode, adding or removing a `_gates.mts` file triggers a regeneration and a full page reload.

The aggregator ensures duplicate names won't clash by hashing the filename. \ 
Generating something that looks like:

```json
{
  "Rcb8948a4_CategoriesGate": { ... },
  "Rcb8948a4_CategoryGate": { ... },
  "Rcb8948a4_RecipeGate": { ... },
  "R52252b9a_SearchGate": { ... }
}
```

### Convention

Each route directory owns a `_gates.mts` file that exports its gates:

```
src/
  article/
    _gates.mts      ← exports ArticleGate, CommentsGate
    article.mts
    comments.mts
```

Gates **must** be named exports (not default) so they can be spread into `router()`.

---

## Navigation

SPA navigation helpers are exported from `@rooted/router`.

### `navigate`

Pushes to the browser history and dispatches a `popstate` event so the router
re-evaluates the current URL — no full-page reload.

```ts
import { navigate } from '@rooted/router'

// Navigate to a URL
navigate('/categories/italian/')
```

A second overload pushes arbitrary history state without changing the URL
(useful for modal or drawer state that does not need its own path):

```ts
navigate({ modal: 'confirm', id: 42 })
```

### `Link`

`Link` is a built-in component that renders a client-side `<a>` element.
Clicks call `navigate` automatically; the listener is removed when the
component unmounts.

```ts
import { Link } from '@rooted/router'

// Text link
create(Link, { href: '/about/', children: 'About us' })

// Link wrapping richer content
create(Link, {
  href: '/categories/italian/',
  className: 'category-card',
  children: [
    create('div', { className: 'name', textContent: 'Italian' }),
    create('p',   { className: 'count', textContent: '3 recipes' }),
  ],
})
```

**`LinkOptions`**

| Property | Type | Required | Description |
|---|---|---|---|
| `href` | `string` | yes | Destination URL |
| `className` | `string` | no | CSS class applied to the `<a>` element |
| `children` | `string \| Node \| Node[]` | no | Link content — text, a single node, or an array of nodes |

`Link` is layout-transparent — the wrapper element uses `display: contents`
so the inner `<a>` participates directly in any flex or grid context.
