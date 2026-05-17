# [`@rooted-adapters/cloudflare-pages`](https://www.npmjs.com/package/@rooted-adapters/cloudflare-pages)

Deployment adapter for Cloudflare Pages static hosting. Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

Writes a `_redirects` file so Cloudflare Pages serves the SPA shell for unknown paths. This adapter is for static hosting only -- for Cloudflare Workers or Functions, a separate setup is needed.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted-adapters/cloudflare-pages
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { cloudflarePagesAdapter } from '@rooted-adapters/cloudflare-pages'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    cloudflarePagesAdapter(),
  ],
})
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
