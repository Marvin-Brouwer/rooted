# [`@rooted-adapters/aws-s3`](https://www.npmjs.com/package/@rooted-adapters/aws-s3)

Deployment adapter for AWS S3 static website hosting. Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

Also works for S3-compatible hosts: DigitalOcean Spaces, STACKIT Object Storage, and OVH Object Storage.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted-adapters/aws-s3
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { awsS3Adapter } from '@rooted-adapters/aws-s3'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    awsS3Adapter(),
  ],
})
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
