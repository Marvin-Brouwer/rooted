# Stage 03 — Meta tag injection (build-time + runtime)

**Status:** not started
**Depends on:** stage 02
**Risk:** medium

## Why third

Delivers most of the "AI audit" baseline. Depends on stage 02 metadata.

## Plugin execution order (important)

In `rooted-manifest.mts`, plugins are listed as:
`importCycleDetector → ...manifest.plugins (githubPagesAdapter lives here) → cssLoader → analyzer → pwaPreset → pwaAssetsPlugin → seoPlugin`

`seoPlugin` runs **last** in `closeBundle`, so by the time it runs, `githubPagesAdapter` has already written all `<route>/index.html` copies. The seoPlugin can read those files, inject tags, and write them back.

## Build-time injection algorithm

In `seoPlugin.closeBundle()`, after the existing sitemap generation, add a new pass:

```
For each static route:
  path = <outDir>/<staticPath>/index.html   (skip if staticPath is '/')
  html = readFile(path)
  html = injectMetaTags(html, route.getMetadata().seo, canonicalUrl, options)
  writeFile(path, html)

Also process <outDir>/index.html (root):
  html = readFile(<outDir>/index.html)
  html = injectRootJsonLd(html, webManifest, deploymentUrl)
  html = injectMetaTags(html, homeRouteMetadata?.seo, deploymentUrl, options)
  writeFile(<outDir>/index.html, html)
```

## `injectMetaTags` — tag list

Insert the following before `</head>` (skip a tag if it already exists in the HTML):

```html
<!-- title: replace existing <title> content -->
<title>{{seo.title}}</title>

<!-- description: replace existing meta[name=description] content -->
<meta name="description" content="{{seo.description}}" />

<!-- canonical -->
<link rel="canonical" href="{{canonicalUrl}}" />

<!-- noindex (only when seo.noIndex === true) -->
<meta name="robots" content="noindex" />

<!-- Open Graph -->
<meta property="og:title" content="{{seo.title}}" />
<meta property="og:description" content="{{seo.description}}" />
<meta property="og:url" content="{{canonicalUrl}}" />
<meta property="og:image" content="{{seo.image ?? options.defaultOgImage ?? deploymentUrl + 'pwa-512x512.png'}}" />
<meta property="og:type" content="website" />
```

Inject strategy: string-replace the existing `<title>…</title>` block for the title tag; for all other tags, check if a tag with that `name`/`property` attribute already exists and skip if so, otherwise insert before `</head>`.

## `injectRootJsonLd` — WebSite schema

Insert once into the root `index.html` only:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "{{webManifest.name}}",
  "description": "{{webManifest.description}}",
  "url": "{{deploymentUrl}}"
}
</script>
```

## `SeoOptions` extensions

```ts
export type SeoOptions = {
  homeRouteFiles?: string[]
  /** Default og:image URL. Defaults to deploymentUrl + 'pwa-512x512.png'. */
  defaultOgImage?: string
  /** Appended to every injected <title>, e.g. ' | My App'. */
  titleSuffix?: string
}
```

## Runtime injection (dynamic routes)

The router's `update()` function in `packages/router/src/router.mts` resolves a route then calls `applyTransition`. Add a meta-injection step after a successful match:

```ts
else {
  applyRouteSeoMeta(matchRouteResult.route, location.pathname, options?.seo)
  applyTransition(() => renderRoute(matchRouteResult.element))
}
```

### New file `packages/router/src/seo-meta.mts`

```ts
export type RouterSeoOptions = {
  deploymentUrl?: string
  defaultOgImage?: string
  titleSuffix?: string
}

export function applyRouteSeoMeta(
  route: Route<any>,
  currentPath: string,
  options?: RouterSeoOptions,
): void {
  const seo = route.getMetadata().seo
  if (!seo) return

  if (seo.title) {
    document.title = options?.titleSuffix
      ? `${seo.title}${options.titleSuffix}`
      : seo.title
  }

  setMetaByName('description', seo.description)
  setMetaByName('robots', seo.noIndex ? 'noindex' : undefined)

  const canonicalUrl = options?.deploymentUrl
    ? new URL(currentPath, options.deploymentUrl).href
    : currentPath
  setLinkCanonical(canonicalUrl)

  setMetaByProperty('og:title', seo.title)
  setMetaByProperty('og:description', seo.description)
  setMetaByProperty('og:url', canonicalUrl)
  const ogImage = seo.image ?? options?.defaultOgImage
  if (ogImage) setMetaByProperty('og:image', ogImage)
}

// Helpers: find-or-create the tag in document.head, set or remove content attribute.
function setMetaByName(name: string, content: string | undefined) { … }
function setMetaByProperty(property: string, content: string | undefined) { … }
function setLinkCanonical(href: string) { … }
```

Extend `RouterOptions`:
```ts
seo?: RouterSeoOptions
```

## Critical files

- `packages/application/plugins/seo.mts` (add build-time injection pass)
- `packages/router/src/seo-meta.mts` (new — runtime helper)
- `packages/router/src/router.mts` (call `applyRouteSeoMeta` after successful match, extend `RouterOptions`)
- Public re-export barrel for `@rooted/router` (re-export `RouterSeoOptions`)

## Verification

- `pnpm build:dev` in recipe-book; inspect `dist/search/index.html` — unique `<title>`, description, canonical, og tags.
- `dist/index.html` contains JSON-LD WebSite script.
- Run dev server; navigate to `/recipe/1/` → `document.title` updates in browser.
