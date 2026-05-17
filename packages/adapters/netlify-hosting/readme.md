# [`@rooted-adapters/netlify-hosting`](https://www.npmjs.com/package/@rooted-adapters/netlify-hosting)

Deployment adapter for Netlify static hosting. Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

Writes a `_redirects` file to the output directory so Netlify routes unknown paths to the SPA shell.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted-adapters/netlify-hosting
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { netlifyHostingAdapter } from '@rooted-adapters/netlify-hosting'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    netlifyHostingAdapter(),
  ],
})
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
