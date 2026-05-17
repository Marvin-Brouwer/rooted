# [`@rooted-adapters/vercel-static`](https://www.npmjs.com/package/@rooted-adapters/vercel-static)

Deployment adapter for Vercel static hosting. Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

Writes `vercel.json` to the Vite project root with rewrite rules for dynamic routes and a catch-all pointing at the SPA shell.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted-adapters/vercel-static
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { vercelStaticAdapter } from '@rooted-adapters/vercel-static'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    vercelStaticAdapter(),
  ],
})
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
