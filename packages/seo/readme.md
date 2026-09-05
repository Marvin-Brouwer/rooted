# [`@rooted/seo`](https://www.npmjs.com/package/@rooted/seo)

Build-time SEO for [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted). Meta tags, Open Graph, canonical links, sitemaps and `robots.txt`, injected into the HTML your adapter writes out.

Nothing in this entry point knows about routing, so it works in an app that doesn't use `@rooted/router`. Per-route metadata, sitemap entries built from the route manifest, and `llms.txt` live in `@rooted/seo/router`, which needs the router installed.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add @rooted/seo
```

Most apps get this wired up by `rootedManifest()` from `@rooted/application` and never import it directly. Import it when you're writing a plugin that wants to add to the page head or the sitemap.

```ts
import { seoPluginName, type SeoApi } from '@rooted/seo'

configResolved(resolved) {
  const seo = resolved.plugins.find(p => p.name === seoPluginName)
  const api = (seo as { api?: SeoApi } | undefined)?.api

  api?.addRouteHtmlTransform((html, staticPath) => html)
  api?.addSitemap({ name: 'images', entries: [] })
}
```

Plugins find each other by name rather than by importing, so `seoPluginName` is the contract. Use the constant instead of writing the string.

More in the [SEO guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/seo.md).
