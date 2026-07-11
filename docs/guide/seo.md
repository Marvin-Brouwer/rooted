# SEO

SEO in rooted has two halves:

1. **Per-route metadata.** Each route declares its `title`, `description`, and a few sitemap fields. The router applies these at runtime as the page changes.
2. **Build-time tooling.** When you build for production, rooted writes `sitemap.xml`, `robots.txt`, and `llms.txt` based on the routes it finds. It also injects per-route meta tags into the static HTML shipped for each route.

Both halves are wired through `@rooted/application`'s `rootedManifest` helper. You don't have to touch them separately.

## Per-route metadata

Add a `seo` field next to `resolve` when you declare a route.

```ts
import { route, token } from '@rooted/router/routes'

export const RecipeRoute = route`/recipe/${token('id', Number)}/`({
  resolve: ({ create, tokens }) => create(Recipe, { id: tokens.id }),
  seo: {
    title: 'Recipe',
    description: 'A recipe from the rooted recipe book.',
    image: '/og/recipe.png',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
})
```

The full set of fields:

| Field | What it does |
|-------|--------------|
| `title` | Sets `<title>` and `og:title`. |
| `description` | Sets `<meta name="description">` and `og:description`. |
| `image` | Absolute URL or root-relative path for `og:image`. Falls back to the generated PWA icon. |
| `noIndex` | If `true`, injects `<meta name="robots" content="noindex">`. |
| `excludeFromSitemap` | If `true`, the route is left out of `sitemap.xml`. |
| `changeFrequency` | Sitemap `<changefreq>`. One of `always`, `hourly`, `daily`, `weekly`, `monthly`, `yearly`, `never`. |
| `priority` | Sitemap `<priority>`. A number between `0.0` and `1.0`. |

Routes without a `seo` field are still listed in the sitemap, just without per-route metadata.

A route only counts as static when its pattern has no dynamic segments, with one exception: [constant-values tokens](./routing.md#constant-values) like `token('plan', ['free', 'pro', 'team'])` unroll into one prerendered page and one sitemap entry per listed value. Routes with a typed token or wildcard stay dynamic and are skipped.

## How metadata reaches the page

Two paths:

- **At build time**, the SEO plugin renders one HTML file per static route. Each file gets the route's `<title>`, description, canonical link, and Open Graph tags injected. Crawlers see the right tags without running JavaScript.
- **At runtime**, when the router navigates to a new route, it updates `document.title` and the existing meta tags in place. This happens inside the router; you don't have to wire it up.

You can pass router-specific SEO options through the router itself:

```ts
create(Router, {
  seo: {
    deploymentUrl: 'https://example.com/',
    titleSuffix: ' | My App',
    defaultOgImage: '/og/site.png',
  },
})
```

`titleSuffix` is appended to every runtime title that comes from a route's `seo.title`. `deploymentUrl` is used to build absolute canonical URLs for dynamic routes. `defaultOgImage` is the fallback when a route has no `seo.image`.

## Build-time tooling

Wire up the manifest in `vite.config.mts`:

```ts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'

import { seo } from './src/seo.mts'

export default rootedManifest({
  webManifest: {
    id: 'my-app',
    url: 'https://example.com/',
    name: 'My App',
    short_name: 'App',
    description: 'A rooted demo app.',
    theme_color: '#ffffff',
    background_color: '#faf7f2',
    display: 'standalone',
  },
  seo,
  plugins: [
    generateRouteManifest({
      glob: './src/**/_routes.mts',
      routeManifestPath: './src/_routes.g.mts',
    }),
  ],
})
```

The `webManifest` is the standard PWA manifest. `webManifest.url` is the deployment origin. Both are reused by the SEO plugin.

## `seo` options

```ts
import type { SeoOptions } from '@rooted/application'

export const seo: SeoOptions = {
  titleSuffix: ' | My App',     // appended to every route title
  defaultOgImage: '/og/site.png', // used when a route has no seo.image
  robots: { /* see RobotsOptions */ },  // or false to skip robots.txt
  llmsTxt: { /* see below */ },         // or false to skip llms.txt
}
```

## `llms.txt`

`llms.txt` is a Markdown file that summarises the site for language models. The default behaviour writes a list of every static route with a `title`. You can override the section structure when you have a real content backend:

```ts
import type { SeoOptions } from '@rooted/application'

export const seo: SeoOptions = {
  llmsTxt: {
    intro: 'My app is a recipe book. Browse by category or search by ingredient.',
    sections: [
      {
        title: 'Recipes',
        entries: [
          { title: 'Pasta carbonara', url: 'https://example.com/recipe/1/', description: 'Classic Roman pasta.' },
          { title: 'Chicken tikka',   url: 'https://example.com/recipe/2/' },
        ],
      },
      {
        title: 'Categories',
        entries: [
          { title: 'Italian', url: 'https://example.com/categories/italian/' },
          { title: 'Indian',  url: 'https://example.com/categories/indian/' },
        ],
      },
    ],
  },
}
```

In a real app, generate `entries` from your data source.

Set `llmsTxt: false` to skip the file entirely.

## Adding extra sitemaps

The SEO plugin exposes a small inter-plugin API for registering additional sitemaps (for example one for icons or a content sitemap generated from a CMS). You retrieve it through the resolved Vite config:

```ts
import type { SeoApi } from '@rooted/application'

const seoPlugin = resolvedConfig.plugins.find(p => p.name === 'rooted:seo')
const seoApi = (seoPlugin as { api?: SeoApi } | undefined)?.api
seoApi?.addSitemap({
  name: 'icons',
  entries: [
    { loc: 'https://example.com/pwa-512x512.png' },
  ],
})
```

This is most useful from another Vite plugin's `configResolved` or `buildStart` hook.

## What you don't have to do

- You don't write `sitemap.xml` yourself. It is generated from the routes discovered by the manifest plugin.
- You don't write `robots.txt` yourself. The defaults are sensible. Pass `seo.robots` to override them.
- You don't have to update `<meta>` tags by hand. The router does it when navigating.

If you need behaviour rooted's tooling doesn't support, the surface area is small. The relevant code is in [`packages/application/plugins`](../../packages/application/plugins).
