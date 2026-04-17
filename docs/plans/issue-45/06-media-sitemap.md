# Stage 06 — Media sitemap integration

**Status:** not started
**Depends on:** stage 05
**Risk:** low

## Why sixth

Demonstrates the stage 05 plugin API on two real producers: the PWA icon generator and the recipe-book's responsive-images plugin.

## `pwaAssetsPlugin` hook

After generating icons in `buildStart`, register them with `SeoApi`.

The plugin needs access to `deploymentUrl` — pass as a new parameter:
```ts
pwaAssetsPlugin(skip: boolean, deploymentUrl: string | undefined): PluginOption
```

```ts
// After generateAssets() completes:
const seoPlug = viteConfig.plugins.find(p => p.name === 'rooted:seo') as { api?: SeoApi } | undefined
const today = new Date().toISOString().slice(0, 10)
const base = deploymentUrl ?? viteConfig.base

seoPlug?.api?.addSitemap({
  name: 'icons',
  entries: [
    { loc: new URL('pwa-512x512.png', base).href, lastmod: today },
    { loc: new URL('pwa-192x192.png', base).href, lastmod: today },
    { loc: new URL('apple-touch-icon-180x180.png', base).href, lastmod: today },
  ],
})
```

Update call-site in `rooted-manifest.mts`:
```ts
pwaAssetsPlugin(!!manifest.icon || skipPwaGenerator, manifest.webManifest.url)
```

## Recipe-book responsive-images plugin hook

In `examples/recipe-book/plugins/responsive-images.mts`, after generating images during `buildStart`:

```ts
seoPlug?.api?.addSitemap({
  name: 'images',
  entries: generatedImages.map(img => ({
    loc: img.absoluteUrl,
    lastmod: today,
    images: [{ loc: img.absoluteUrl, title: img.altText ?? '' }],
  })),
})
```

The responsive-images plugin currently generates images lazily (dev middleware). For production builds, images must be generated upfront in `buildStart` and tracked in an array so they can be registered with the sitemap API.

## Image sitemap XML extension

When any `SitemapEntry` has `images`, the sitemap writer in `seo.mts` adds the `xmlns:image` namespace and `<image:image>` child elements:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://example.com/images/photo.webp</loc>
    <lastmod>2026-04-17</lastmod>
    <image:image>
      <image:loc>https://example.com/images/photo.webp</image:loc>
      <image:title>Pasta Carbonara</image:title>
    </image:image>
  </url>
</urlset>
```

The `xmlns:image` attribute is only added to a sitemap file when at least one of its entries has an `images` array.

## Critical files

- `packages/application/plugins/pwa-assets.mts` (add SeoApi hook, accept `deploymentUrl` param)
- `packages/application/plugins/seo.mts` (add `xmlns:image` support to XML writer)
- `packages/application/src/rooted-manifest.mts` (pass `deploymentUrl` to `pwaAssetsPlugin`)
- `examples/recipe-book/plugins/responsive-images.mts` (generate images eagerly in buildStart, add SeoApi hook)

## Verification

Built recipe-book produces `sitemap-index.xml`, `sitemap.xml`, `sitemap-icons.xml`, `sitemap-images.xml`. All four XML files are valid. `sitemap-images.xml` contains `<image:image>` entries.
