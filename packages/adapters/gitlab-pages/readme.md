# [`@rooted-adapters/gitlab-pages`](https://www.npmjs.com/package/@rooted-adapters/gitlab-pages)

Deployment adapter for GitLab Pages (static mode). Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

Writes a `_redirects` file so GitLab Pages serves the SPA shell for unknown paths. For a GitLab deployment running a Node.js server, use `@rooted-adapters/fastify` or `@rooted-adapters/express` instead.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted-adapters/gitlab-pages
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { gitlabPagesAdapter } from '@rooted-adapters/gitlab-pages'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    gitlabPagesAdapter(),
  ],
})
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
