# Stage 05 — Sitemap-index refactor + plugin API

**Status:** not started
**Depends on:** nothing (stage 02 changefreq/priority fields useful but not blocking)
**Risk:** medium

## Why fifth

Changes the sitemap output shape. Stages 06 and 07 consume the new API. Must ship first.

## Behaviour to preserve

When no additional sitemaps are registered: output is still a single `sitemap.xml` (no index). Existing deployments are unaffected.

## New output when extras are registered

```
dist/
  sitemap.xml          ← static routes (unchanged content)
  sitemap-index.xml    ← index listing sitemap.xml + all extra files
  sitemap-icons.xml    ← registered by pwaAssetsPlugin (stage 06)
  sitemap-images.xml   ← registered by responsive-images plugin (stage 06)
```

### `sitemap-index.xml` format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap.xml</loc>
    <lastmod>2026-04-17</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-icons.xml</loc>
    <lastmod>2026-04-17</lastmod>
  </sitemap>
</sitemapindex>
```

## Plugin-to-plugin API (`SeoApi`)

### New file `packages/application/src/seo.api.mts`

```ts
export type SitemapEntry = {
  loc: string
  lastmod?: string   // YYYY-MM-DD
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number  // 0.0–1.0
  images?: Array<{ loc: string; title?: string; caption?: string }>
}

export type AdditionalSitemap = {
  name: string          // becomes sitemap-<name>.xml
  entries: SitemapEntry[]
}

export type SeoApi = {
  addSitemap(sitemap: AdditionalSitemap): void
}
```

### Usage by other plugins

```ts
const seoPlug = config.plugins.find(p => p.name === 'rooted:seo') as { api?: SeoApi } | undefined
seoPlug?.api?.addSitemap({ name: 'icons', entries: […] })
```

Call from `configResolved` or `buildStart` (both run before `closeBundle` where the sitemap is written).

## Changes to `seoPlugin`

- Hold `additionalSitemaps = new Map<string, AdditionalSitemap>()`.
- Expose `api: SeoApi` on the plugin object (Vite inter-plugin communication pattern).
- In `closeBundle`:
  - Write `sitemap.xml` as today (honour `seo.excludeFromSitemap` to skip entries).
  - Read `changefreq` and `priority` from `route.getMetadata().seo` when building entries.
  - If `additionalSitemaps.size === 0`: done.
  - Otherwise: write each `sitemap-<name>.xml`, then write `sitemap-index.xml`.
- `sitemap-index.xml` `lastmod` for each child sitemap = today's date.

## `RouteSeoMetadata` additions (if not already in stage 02)

```ts
changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
priority?: number
```

## Critical files

- `packages/application/plugins/seo.mts` (refactor, add `api`, add sitemap-index logic, honour excludeFromSitemap)
- `packages/application/src/seo.api.mts` (new — public types)
- `packages/application/src/rooted-manifest.mts` (re-export `SeoApi`, `SitemapEntry`, `AdditionalSitemap`)
- `packages/router/src/route.metadata.mts` (add `changefreq?` and `priority?` if not done in stage 02)

## Verification

- Build recipe-book with no extras registered → only `sitemap.xml` produced.
- Add a temporary test plugin that calls `api.addSitemap({ name: 'test', entries: [{ loc: '…' }] })` → `sitemap-index.xml` + `sitemap-test.xml` produced.
- Both XML files validate correctly.
