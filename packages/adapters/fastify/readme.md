# [`@rooted-adapters/fastify`](https://www.npmjs.com/package/@rooted-adapters/fastify)

Deployment adapter for server-side hosting with Fastify. Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

Writes `routes.json` and a ready-to-run `server.mjs` to the output directory. Start the server with `node dist/server.mjs`. The `PORT` environment variable controls the port (default: 3000).

Requires `fastify >= 5.0.0` and `@fastify/static >= 8.0.0`.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted-adapters/fastify
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { fastifyAdapter } from '@rooted-adapters/fastify'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    fastifyAdapter(),
  ],
})
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
