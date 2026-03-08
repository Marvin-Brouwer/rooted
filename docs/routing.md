# Routing

Routing is provided by `@rooted/router`. The Vite plugin (`@rooted/router/manifest`) auto-discovers gate files and generates an import aggregator.

---

## Gates

A gate binds a component to a URL pattern. It renders its component only when the current path matches.

```ts
import { gate, token } from '@rooted/router'
import { Article } from './article.mts'

export const ArticleGate = gate(Article)`/articles/${token('id', Number)}/`
```

### `gate(Component)`

Returns a tagged template function. The template string is the URL pattern.

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

### `.exact`

By default a gate renders whenever the path **starts with** its pattern — meaning child routes can append further segments. With `.exact`, the gate only renders when the path has **additional segments beyond its own pattern**. The gate's own path returns 404.

```ts
// Renders at /articles/123/anything — not at /articles/123/
export const ArticleGate = gate(Article).exact`/articles/${token('id', Number)}/`
```

Use `.exact` when the gate exists only to unlock child routes (e.g. a layout with required sub-navigation).

### `.append(Component)`

Creates a child gate that matches the parent pattern **plus** an additional segment. The child is also registered in the router independently.

```ts
export const ArticleGate  = gate(Article).exact`/articles/${token('id', Number)}/`
export const CommentsGate = ArticleGate.append(Comments)`/comments/`
// matches /articles/123/comments/
```

Child gates receive the parent's params merged with their own.

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
import * as appRoutes from './_routes.g.mts'

const Router = router({ home, notFound, ...appRoutes })
```

The aggregator is regenerated on `buildStart`. In dev mode, adding or removing a `_gates.mts` file triggers a regeneration and a full page reload.

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
