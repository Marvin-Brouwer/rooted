# [`@rooted/application`](https://www.npmjs.com/package/@rooted/application)

Build-time configuration for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework. The `rootedManifest` Vite config wrapper, the PWA preset, and the import cycle detector.

It wires up the SEO plugins from [`@rooted/seo`](https://www.npmjs.com/package/@rooted/seo) and whichever `@rooted-adapters/*` package you install, so most apps configure both through here rather than importing them.

Route SEO is the exception. This package knows nothing about routing, so if you use the router you add `routeSeoPlugin()` from `@rooted/seo/router` to your own `plugins`.

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

A production build also emits a service worker. By default a new version is taken on the next page load, never under a page that's already running. `updates: 'explicit'` leaves that entirely to your app instead. The [PWA guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/pwa.md) covers both, along with the components in [`@rooted/pwa`](https://www.npmjs.com/package/@rooted/pwa) for showing there's an update.

More in the [SEO guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/seo.md).
