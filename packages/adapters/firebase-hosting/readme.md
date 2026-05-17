# [`@rooted-adapters/firebase-hosting`](https://www.npmjs.com/package/@rooted-adapters/firebase-hosting)

Deployment adapter for Firebase Hosting. Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

Writes `firebase.json` to the Vite project root with rewrite rules for dynamic routes and a catch-all pointing at the SPA shell.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted-adapters/firebase-hosting
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { firebaseHostingAdapter } from '@rooted-adapters/firebase-hosting'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    firebaseHostingAdapter(),
  ],
})
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
