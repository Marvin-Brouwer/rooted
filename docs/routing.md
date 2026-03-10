# Routing

Routing is provided by `@rooted/router`. The Vite plugin (`@rooted/router/manifest`) auto-discovers route files and generates an import aggregator.

---

## Routes

A route binds a URL pattern to a destination component. The router renders the destination component only when the current path best-matches the route's pattern.

```ts
import { route, token } from '@rooted/router'
import { Article } from './article.mts'

export const ArticleRoute = route`/articles/${token('id', Number)}/`(Article)
```

`route` is a tagged-template function — the URL pattern comes first, the component is bound after. Use `token` interpolations to declare typed parameters.

### `token(key, Type)`

Declares a typed path parameter. `Type` is one of `Number`, `String`, `Boolean`, or `Date`.

The matched value is passed to the component via `options.gate`:

```ts
import { type GateParameters } from '@rooted/router'
import { type ArticleRoute } from './_routes.mts'

export type ArticleOptions = {
  gate: GateParameters<typeof ArticleRoute>
}

export const Article = component<ArticleOptions>({
  name: 'article',
  onMount({ options }) {
    console.log(options.gate.id) // number
  }
})
```

### Child routes

A child route composes its URL by interpolating a parent route as the **first interpolation** in its template string. The child matches the parent's full pattern **plus** its own additional segment. Child routes receive the parent's params merged with their own.

```ts
export const ArticleRoute  = route`/articles/${token('id', Number)}/`(Article)
export const CommentsRoute = route`${ArticleRoute}/comments/`(Comments)
// CommentsRoute matches /articles/123/comments/
```

When a parent route is interpolated it must be the first thing in the template (no preceding text). The child's own segment starts with the slash that follows the interpolation.

### `wildcard(key)`

A `wildcard` interpolation matches one or more remaining path segments. It must be the last interpolation in the pattern and must be preceded by a `/`.

The matched path string is exposed on `options.gate[key]` as a `string`.

```ts
import { route, wildcard } from '@rooted/router'

// Explicit key — options.gate.slug
export const ArchiveRoute = route`/archive/${wildcard('slug')}/`(Archive)

// Default key ('path') — options.gate.path
export const ArchiveRoute = route`/archive/${wildcard()}/`(Archive)
```

---

## Best-match routing

The router mounts **all** registered routes and evaluates them on every navigation. Only the route whose pattern covers the most characters of the current URL renders its component — all other routes remain inactive. If a child route matches, its parent route does not render.

```
/articles/          → ArticleRoute does not match — no ID segment
/articles/123/      → ArticleRoute matches (end = 14) — Article renders
/articles/123/comments/  → CommentsRoute matches (end = 22) — Comments renders
                          ArticleRoute is not rendered
```

This means each route component is a self-contained page. Deep-linking to any URL works directly — the best-match route is selected and rendered standalone.

---

## `gate(RouteRef, Component)`

`gate` is a plain function that subscribes a component to a route's URL pattern and returns a self-managing component. The gate listens to `popstate` and shows or removes its component whenever the route matches (or stops matching) the current URL.

Use gates for **explicit embedded sub-content** inside a route component — for example, a detail panel shown alongside a list when a sub-URL is active:

```ts
import { route, gate, token } from '@rooted/router'

export const ArticlesRoute = route`/articles/`(Articles)
export const ArticleRoute  = route`${ArticlesRoute}/${token('id', Number)}/`(Article)
export const ArticleGate   = gate(ArticleRoute, Article)

// Inside the Articles component:
onMount({ append }) {
    append('ul', { /* article list */ })
    append(ArticleGate, {})  // self-managing: shows Article when ArticleRoute is active
}
```

Note that with best-match routing, if `ArticleRoute` is also registered with the router, the router will render `Article` standalone at `/articles/123/` — the `Articles` component (and its appended `ArticleGate`) will not be active at that URL. Gates are most useful when the parent route is intended to be the only match at the relevant URL, or for UIs that keep a parent context visible alongside sub-content.

---

## Route validation (dev mode)

In development, `route` validates the pattern at definition time and emits `console.error` for violations:

| Violation | Message |
|-----------|---------|
| Pattern does not start with `/` | `route pattern must start with a slash` |
| Pattern does not end with `/` | `route pattern must end with a slash` |
| Route interpolation is not first | `Route interpolation must be at the start of the pattern` |
| Route interpolation has preceding text | `Route interpolation must have no preceding text` |
| Route interpolation not followed by `/` | `Route interpolation must be followed by a slash` |
| Wildcard is not the last interpolation | `Wildcard interpolation must be at the end of the pattern` |
| Wildcard not preceded by `/` | `Wildcard interpolation must be preceded by a slash` |

Validation is removed in production builds — invalid patterns fail silently.

---

## Router

```ts
import { router } from '@rooted/router'

const Router = router({
  home:     HomeComponent,
  notFound: NotFoundComponent,
  ArticleRoute,
  CommentsRoute,
})
```

- `home` — rendered at `/`
- `notFound` — rendered when no route matches and the path is not `/`
- All other keys should be `RouteDefinition` values produced by `route`

`BoundGateDefinition` values (from `gate()`) may also be spread into the router config — they are silently ignored; gates are for explicit composition via `append()`, not top-level mounting.

**Best-match selection** — on each navigation the router renders only the route with the highest pattern coverage. If params change while the same route matches, the component is remounted with the new params.

**Duplicate routes** (same reference under multiple keys) are silently deduplicated — the first key wins. In development a console warning is emitted.

**Type safety** — the router rejects routes whose component requires options beyond `gate`. Only routes whose component takes no options, or only a `gate` option, are accepted.

---

## Route manifest (Vite plugin)

The `generateRouteManifest` plugin discovers `_routes.mts` files and writes a single aggregator file that re-exports them all. The aggregator can be spread directly into `router()`.

### `vite.config.ts`

```ts
import { generateRouteManifest } from '@rooted/router/manifest'

export default defineConfig({
  plugins: [
    generateRouteManifest({
      glob: './src/**/_routes.mts',  // pattern to discover route files
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

The aggregator is regenerated on `buildStart`. In dev mode, adding or removing a `_routes.mts` file triggers a regeneration and a full page reload.

The aggregator ensures duplicate names won't clash by hashing the filename. \
Generating something that looks like:

```json
{
  "Rcb8948a4_CategoriesRoute": { ... },
  "Rcb8948a4_CategoryRoute": { ... },
  "Rcb8948a4_RecipeRoute": { ... },
  "R52252b9a_SearchRoute": { ... }
}
```

### Convention

Each route directory owns a `_routes.mts` file that exports its routes (and optionally gates):

```
src/
  article/
    _routes.mts      ← exports ArticleRoute, CommentsRoute
    article.mts
    comments.mts
```

Routes **must** be named exports (not default) so they can be spread into `router()`.

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
