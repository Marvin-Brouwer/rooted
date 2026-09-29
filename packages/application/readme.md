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

A production build also emits a service worker. A new version never takes over a page that's already running: it lands once the app is closed, or when someone asks for it. The [PWA guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/pwa.md) covers how, the components in [`@rooted/pwa`](https://www.npmjs.com/package/@rooted/pwa) for showing there's an update, and `workerScripts` for adding your own worker code.

More in the [SEO guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/seo.md).

## Bundle size

Every build prints the size of each file it writes, raw and gzipped, the way Vite always does.

For a treemap of what's actually in the bundle, add `bundleReport()` to your plugins and build with `--analyze`. It writes `dist/stats.html` with [Sonda](https://sonda.dev) and opens it. In CI, or on a machine with nothing to open it with, you get the file and a warning instead. Without the flag the plugin does nothing, so it's fine to leave it in.

```ts
// vite.config.mts
import { bundleReport, rootedManifest } from '@rooted/application'

export default rootedManifest({
  // ...
  plugins: [bundleReport()],
})
```

```sh
vite build -- --analyze
```

`--analyze` doesn't skip the service worker. Add `--no-pwa` if you want the build to be quicker.

