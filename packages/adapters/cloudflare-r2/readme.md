# [`@rooted-adapters/cloudflare-r2`](https://www.npmjs.com/package/@rooted-adapters/cloudflare-r2)

Deployment adapter for Cloudflare R2 static website hosting. Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted-adapters/cloudflare-r2
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { cloudflareR2Adapter } from '@rooted-adapters/cloudflare-r2'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    cloudflareR2Adapter(),
  ],
})
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
