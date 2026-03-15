# Routing

Routing is provided by `@rooted/router`. The Vite plugin (`@rooted/router/manifest`) auto-discovers route files and generates an import aggregator.

---

## Routes

A route binds a URL pattern to a resolver that produces the element to render. The router renders the returned element only when the current path best-matches the route's pattern.

```ts
import { route, token } from '@rooted/router'
import { Article } from './article.mts'

export const ArticleRoute = route`/articles/${token('id', Number)}/`({
  resolve: ({ create, tokens }) => create(Article, { id: tokens.id })
})
```

`route` is a tagged-template function — the URL pattern comes first, then the route is completed by calling the returned builder with `{ resolve }`. Use `token` interpolations to declare typed parameters. The `resolve` function receives `{ create, tokens }` and returns the `Element` to render.

### `token(key, Type)`

Declares a typed path parameter. `Type` is one of `Number`, `String`, `Boolean`, or `Date`.

The matched and coerced value is available as `tokens[key]` inside the `resolve` function:

```ts
import { route, token } from '@rooted/router'
import { Article } from './article.mts'

export const ArticleRoute = route`/articles/${token('id', Number)}/`({
  resolve: ({ create, tokens }) => create(Article, { id: tokens.id })
  // tokens.id is typed as number
})
```

### Child routes

A child route composes its URL by interpolating a parent route as the **first interpolation** in its template string. The child matches the parent's full pattern **plus** its own additional segment. Child routes receive the parent's tokens merged with their own.

The parent route already ends with `/`, so the child template continues directly after the interpolation with no extra slash:

```ts
export const ArticlesRoute  = route`/articles/`({ resolve: ({ create }) => create(Articles) })
export const ArticleRoute   = route`${ArticlesRoute}${token('id', Number)}/`({
  resolve: ({ create, tokens }) => create(Article, { id: tokens.id })
})
// ArticleRoute matches /articles/123/
```

When a parent route is interpolated it must be the first thing in the template (no preceding text).

### `wildcard(key?)`

A `wildcard` interpolation matches a single path segment (up to the next `/`). It must be the last interpolation in the pattern and must be preceded by a `/`.

The matched path string is exposed on `tokens[key]` as a `string`. The default key is `'rest'`.

```ts
import { route, wildcard } from '@rooted/router'

// Default key 'rest' — tokens.rest
export const ArchiveRoute = route`/archive/${wildcard()}/`({
  resolve: ({ create, tokens }) => create(Archive, { slug: tokens.rest })
})

// Explicit key — tokens.query
export const SearchRoute = route`/search/${wildcard('query')}/`({
  resolve: ({ create }) => create(SearchPage)
})
```

---

### Suppression

When `resolve` returns `undefined`, the route is treated as a non-match. The router falls through to the next best candidate, and `notFound` renders if nothing else matches. Use suppression to guard routes based on data:

```ts
export const CategoryRoute = route`${CategoriesRoute}${token('slug', String)}/`({
  resolve: async ({ create, tokens }) => {
    const found = await filterCategory(tokens.slug)
    if (!found) return undefined
    return create(Categories)
  },
})
```

Returning `undefined` for an unknown slug causes the router to show `notFound` instead of mounting the component with broken state — no need to handle the not-found case inside the component itself.

---

## Best-match routing

The router mounts **all** registered routes and evaluates them on every navigation. Only the route whose pattern covers the most characters of the current URL renders its element — all other routes remain inactive.

The idiomatic pattern is to resolve child routes to the same **shell component** as their parent, and use gates inside that shell to show child content:

```ts
export const ArticlesRoute  = route`/articles/`({ resolve: ({ create }) => create(Articles) })
export const ArticleRoute   = route`${ArticlesRoute}${token('id', Number)}/`({ resolve: ({ create }) => create(Articles) })
export const ArticleGate    = gate(ArticleRoute, ({ id }) => create(ArticleContent, { id }))

// Inside the Articles shell component:
onMount({ append }) {
  append('ul', { /* article list */ })
  append(ArticleGate)  // activates when ArticleRoute matches
}
```

With this pattern the router selects the best-match route and renders `Articles`. Gates inside `Articles` then activate independently based on their own URL match:

```
/articles/      → ArticlesRoute is the best match → Articles renders, no gate active
/articles/123/  → ArticleRoute is the best match  → Articles renders, ArticleGate activates → ArticleContent shown
```

Deep-linking works directly — the best-match route is selected and renders the shell component, which then activates the appropriate gate.

---

## `gate(route, renderFn)`

`gate` is a plain function that subscribes a render function to a route's URL pattern and returns a self-managing component. The gate listens to `popstate` and calls its render function whenever the route matches the current URL, replacing the previous content when it changes, and removing it when the route no longer matches.

Use gates for **explicit embedded sub-content** inside a shell component:

```ts
import { route, gate, token } from '@rooted/router'
import { create } from '@rooted/components/elements'

export const ArticlesRoute = route`/articles/`({ resolve: ({ create }) => create(Articles) })
export const ArticleRoute  = route`${ArticlesRoute}${token('id', Number)}/`({ resolve: ({ create }) => create(Articles) })
export const ArticleGate   = gate(ArticleRoute, ({ id }) => create(ArticleContent, { id }))

// Inside the Articles shell component:
onMount({ append }) {
    append('ul', { /* article list */ })
    append(ArticleGate)  // self-managing: shows ArticleContent when ArticleRoute is active
}
```

The render function receives the fully typed token dictionary and returns one or more `Element` nodes. It may be `async` to enable lazy loading of the content module.

The router renders `Articles` at both `/articles/` and `/articles/123/` (best-match selects `ArticleRoute` at the deeper URL). `ArticleGate` inside the shell activates independently — it shows `ArticleContent` when `/articles/123/` matches and removes it when it does not.

---

## Route validation (dev mode)

In development, `route` validates the pattern at definition time and emits `console.error` for violations:

| Violation | Message |
|-----------|---------|
| Pattern does not start with `/` | `route pattern must start with a slash` |
| Pattern does not end with `/` | `route pattern must end with a slash` |
| Route interpolation is not first | `Route interpolation must be at the start of the pattern` |
| Route interpolation has preceding text | `Route interpolation must have no preceding text` |
| Route interpolation not followed by `/` or end of template | `Route interpolation must be followed by a slash` |
| Wildcard is not the last interpolation | `Wildcard interpolation must be at the end of the pattern` |
| Wildcard not preceded by `/` | `Wildcard interpolation must be preceded by a slash` |

Invalid patterns produce a route that always returns `{ success: false }` — they never match.

Validation is removed in production builds — invalid patterns fail silently.

At navigation time, a `console.warn` is emitted when a wildcard route and a specific route tie for the same URL:

```
[rooted/router] "ArchiveRoute" (wildcard) and "SpecificRoute" both matched "/archive/special/" —
wildcard takes precedence. If "SpecificRoute" is intentionally a sub-route of "ArchiveRoute",
remove it from the router config and export only a gate for it.
```

The wildcard always wins the tie. If the specific route is intentionally a sub-route, it should not be registered with the router — export only a `gate` for it and `append` it inside the wildcard route's shell component.

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
- All other keys should be `Route` values produced by `route`

**Best-match selection** — on each navigation the router renders only the route with the highest pattern coverage. If tokens change while the same route matches, the element is re-resolved with the new tokens.

**Duplicate routes** (same reference under multiple keys) are silently deduplicated — the first key wins. In development a console warning is emitted.

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
    _routes.mts      ← exports ArticleRoute, CommentsRoute, ArticleGate
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
  classes: 'category-card',
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
| `classes` | `CssClasses` | no | CSS classes applied to the `<a>` element |
| `children` | `string \| Node \| Node[]` | no | Link content — text, a single node, or an array of nodes |

`Link` is layout-transparent — the wrapper element uses `display: contents`
so the inner `<a>` participates directly in any flex or grid context.
