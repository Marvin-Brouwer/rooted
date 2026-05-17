# [`@rooted-adapters/azure-static-webapp`](https://www.npmjs.com/package/@rooted-adapters/azure-static-webapp)

Deployment adapter for Azure Static Web Apps. Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

Writes `staticwebapp.config.json` to the output directory with explicit route rules for pre-rendered paths and parameterized routes.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted-adapters/azure-static-webapp
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { azureStaticWebappAdapter } from '@rooted-adapters/azure-static-webapp'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    azureStaticWebappAdapter(),
  ],
})
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
