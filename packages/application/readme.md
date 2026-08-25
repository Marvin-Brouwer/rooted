# [`@rooted/application`](https://www.npmjs.com/package/@rooted/application)

Build-time configuration for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework. The `rootedManifest` Vite config wrapper, the PWA preset, and the import cycle detector.

It wires up the SEO plugins from [`@rooted/seo`](https://www.npmjs.com/package/@rooted/seo) and whichever `@rooted-adapters/*` package you install, so most apps configure both through here rather than importing them.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted/application
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'

import { seo } from './src/seo.mts'

export default rootedManifest({
  webManifest: {
    id: 'my-app',
    url: 'https://example.com/',
    name: 'My App',
  },
  seo,
  plugins: [
    generateRouteManifest({
      glob: './src/**/_routes.mts',
      routeManifestPath: './src/_routes.g.mts',
    }),
  ],
})
```

More in the [SEO guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/seo.md).
