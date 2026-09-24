# [`@rooted-adapters/azure-static-webapp`](https://www.npmjs.com/package/@rooted-adapters/azure-static-webapp)

Deployment adapter for Azure Static Web Apps. Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

Writes `staticwebapp.config.json` to the output directory.

Azure can't match a `:param` route exactly, so you have to pick how it's wrong with the required `dynamicRoutes` option.
`'not-found'` answers `404` on real dynamic pages. `'catch-all'` answers `200` on them, and also on paths below them that aren't routes.
The [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md#azure-static-web-apps-pick-one) has the full trade-off.

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
    azureStaticWebappAdapter({ dynamicRoutes: 'catch-all' }),
  ],
})
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
