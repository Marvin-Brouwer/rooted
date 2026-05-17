# [`@rooted-adapters/codeberg-pages`](https://www.npmjs.com/package/@rooted-adapters/codeberg-pages)

Deployment adapter for Codeberg Pages. Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

Follows the [git-pages.org](https://git-pages.org/) standard that Codeberg Pages supports.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted-adapters/codeberg-pages
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { codebergPagesAdapter } from '@rooted-adapters/codeberg-pages'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    codebergPagesAdapter(),
  ],
})
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
