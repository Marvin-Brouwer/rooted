# [`@rooted-adapters/static-site`](https://www.npmjs.com/package/@rooted-adapters/static-site)

Base adapter for S3-compatible and object-storage static hosts. Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

Works for AWS S3, GCP Cloud Storage, Azure Blob, Cloudflare R2, DigitalOcean Spaces, STACKIT, OVH, and any other S3-compatible host. Platform-specific adapters (like `@rooted-adapters/scaleway-object-storage`) extend this with pre-configured options.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted-adapters/static-site
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { staticSiteAdapter } from '@rooted-adapters/static-site'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    staticSiteAdapter(),
  ],
})
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
