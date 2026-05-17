# [`@rooted-adapters/github-pages`](https://www.npmjs.com/package/@rooted-adapters/github-pages)

Deployment adapter for GitHub Pages. Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

Writes `.nojekyll` and `404.html` to the output directory so GitHub Pages serves the app correctly for all URLs.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted-adapters/github-pages
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { githubPagesAdapter } from '@rooted-adapters/github-pages'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    githubPagesAdapter(),
  ],
  webManifest: {
    id: 'my-app',
    url: 'https://username.github.io/my-app/',
  },
})
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
