# [`@rooted-adapters/express`](https://www.npmjs.com/package/@rooted-adapters/express)

Deployment adapter for server-side hosting with Express. Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

Writes `routes.json` and a ready-to-run `server.mjs` to the output directory. Start the server with `node dist/server.mjs`. The `PORT` environment variable controls the port (default: 3000).

Requires `express >= 5.0.0`.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add -D @rooted-adapters/express
```

```ts
// vite.config.mts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { expressAdapter } from '@rooted-adapters/express'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    expressAdapter(),
  ],
})
```

## Adding middleware

If you need to register Express middleware (proxies, auth, rate-limiting) alongside the rooted handlers, create a folder of `.mjs` files and point `middlewarePath` at it:

```ts
expressAdapter({ middlewarePath: './src/server-middleware' })
```

Each file in the folder must export a default function that receives the Express instance:

```js
// src/server-middleware/01-api-proxy.mjs
import { createProxyMiddleware } from 'http-proxy-middleware'

export default function (app) {
  app.use('/api', createProxyMiddleware({ target: process.env.API_URL }))
}
```

Files are loaded in lexicographic order before the rooted static-file and route handlers, so `/api/*` requests reach your middleware before rooted's not-found handler can catch them. Numeric prefixes (`01-`, `02-`) control load order when you have multiple files.

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
