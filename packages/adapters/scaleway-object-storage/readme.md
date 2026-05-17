# [`@rooted-adapters/scaleway-object-storage`](https://www.npmjs.com/package/@rooted-adapters/scaleway-object-storage)

Deployment adapter for Scaleway Object Storage static website hosting. Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

Scaleway expects the fallback file to be named `error.html` rather than `404.html`. This adapter pre-configures that automatically.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted-adapters/scaleway-object-storage
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { scalewayObjectStorageAdapter } from '@rooted-adapters/scaleway-object-storage'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    scalewayObjectStorageAdapter(),
  ],
})
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
