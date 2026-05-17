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

## Adding plugins

If you need to register Fastify plugins (proxies, auth, rate-limiting) alongside the rooted handlers, create a folder of `.mjs` files and point `middlewarePath` at it:

```ts
fastifyAdapter({ middlewarePath: './src/server-middleware' })
```

Each file in the folder must export a default async function that receives the Fastify instance:

```js
// src/server-middleware/01-api-proxy.mjs
import fastifyHttpProxy from '@fastify/http-proxy'

export default async function (app) {
  await app.register(fastifyHttpProxy, {
    upstream: process.env.API_URL,
    prefix: '/api',
  })
}
```

Files are loaded in lexicographic order before the rooted static-file and route handlers, so `/api/*` requests reach your proxy before rooted's not-found handler can catch them. Numeric prefixes (`01-`, `02-`) control load order when you have multiple files.

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
