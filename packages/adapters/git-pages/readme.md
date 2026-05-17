# [`@rooted-adapters/git-pages`](https://www.npmjs.com/package/@rooted-adapters/git-pages)

Base adapter for git-hosted static pages. Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

Works for any git page host following the [git-pages.org](https://git-pages.org/) standard. Platform-specific adapters (GitHub Pages, GitLab Pages, Codeberg Pages) extend this one.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted-adapters/git-pages
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { gitPagesAdapter } from '@rooted-adapters/git-pages'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    gitPagesAdapter(),
  ],
})
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
