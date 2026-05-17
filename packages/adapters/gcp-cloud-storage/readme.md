# [`@rooted-adapters/gcp-cloud-storage`](https://www.npmjs.com/package/@rooted-adapters/gcp-cloud-storage)

Deployment adapter for Google Cloud Storage static website hosting. Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted-adapters/gcp-cloud-storage
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { gcpCloudStorageAdapter } from '@rooted-adapters/gcp-cloud-storage'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    gcpCloudStorageAdapter(),
  ],
})
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
