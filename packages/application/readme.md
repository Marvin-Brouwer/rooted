# [`@rooted/application`](https://www.npmjs.com/package/@rooted/application)

Build-time configuration, SEO plugins (sitemap, llms.txt, per-route meta), and Vite adapters for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

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
