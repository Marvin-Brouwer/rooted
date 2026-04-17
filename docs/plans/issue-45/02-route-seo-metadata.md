# Stage 02 — Route SEO metadata (foundation)

**Status:** not started
**Depends on:** nothing (but should be done before stages 03 and 07)
**Risk:** medium

## Why second

Every downstream stage (03, 07) reads from route SEO metadata. Must be stable before those stages start.

## New public type

Add to `packages/router/src/route.metadata.mts`:

```ts
export type RouteSeoMetadata = {
  /** Overrides <title> and og:title for this route. */
  title?: string
  /** Overrides <meta name="description"> and og:description. */
  description?: string
  /** When true, injects <meta name="robots" content="noindex">. Default: false. */
  noIndex?: boolean
  /** When true, skips this route in sitemap generation. Default: false. */
  excludeFromSitemap?: boolean
  /**
   * Overrides og:image for this route.
   * Absolute URL or root-relative path.
   * Defaults to the generated PWA icon (pwa-512x512.png).
   */
  image?: string
  /** Sitemap changefreq field. */
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  /** Sitemap priority field (0.0–1.0). */
  priority?: number
}
```

## Changes to `RouteMetadata<T>`

Add one optional field:

```ts
export type RouteMetadata<T extends ...> = {
  // ... all existing fields unchanged ...
  readonly seo?: RouteSeoMetadata   // ← new
}
```

## Changes to `route.mts`

The `RouteBuilder` currently accepts `{ resolve }`. Extend the definition object:

```ts
// Before
export type RouteBuilder<T extends RouteParameter[]> =
  (definition: { resolve: RouteResolver<T> }) => Route<…>

// After
export type RouteBuilder<T extends RouteParameter[]> =
  (definition: { resolve: RouteResolver<T>; seo?: RouteSeoMetadata }) => Route<…>
```

Inside the `route` function, store `definition.seo` into the metadata symbol:

```ts
return (({ resolve, seo }) => {
  return {
    [routeMetadata]: {
      // ... existing fields ...
      seo,
    },
    // ...
  }
}) as RouteBuilder<T>
```

## Recipe-book update (example usage)

Add `seo` to representative routes in the recipe-book to exercise the feature:

```ts
// examples/recipe-book/src/navigation/_routes.mts (HomeRoute)
seo: {
  title: 'Rooted Recipe Book',
  description: 'A curated collection of recipes — Italian, Indian, Mexican and more.',
}

// examples/recipe-book/src/search/_routes.mts
seo: {
  title: 'Search recipes',
  description: 'Find recipes by keyword, category, or ingredient.',
}
```

## Critical files

- `packages/router/src/route.metadata.mts` (add `RouteSeoMetadata` type, add `seo?` to `RouteMetadata`)
- `packages/router/src/route.mts` (pass `seo` through to metadata, extend `RouteBuilder` definition)
- Public re-export barrel for `@rooted/router` (re-export `RouteSeoMetadata`)
- `examples/recipe-book/src/**/_routes.mts` (add seo to a representative set of routes)
- `packages/router/src/__tests__/route.seo.test.mts` (new unit tests)

## Test cases

- Route with `seo` defined: `getMetadata().seo` returns the object.
- Route without `seo`: `getMetadata().seo` is `undefined`.
- Parent/child route: child `seo` is independent of parent `seo`.
- `errorRoute` has `seo: undefined`.

## Verification

`pnpm eslint`, `pnpm build:dev`, `pnpm test`. TypeScript must accept existing recipe-book routes unchanged (all new fields are optional).
