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

If you need to register Express middleware (proxies, auth, rate-limiting), point `middlewarePath` at a folder of `.mjs` files. Use the `createMiddleware` helper so editors pick up the Express instance type:

```ts
expressAdapter({ middlewarePath: './src/server-middleware' })
```

```ts
// src/server-middleware/01-api-proxy.mts
import { createMiddleware } from '@rooted-adapters/express'
import { createProxyMiddleware } from 'http-proxy-middleware'

export default createMiddleware((app) => {
  app.use('/api', createProxyMiddleware({ target: process.env.API_URL }))
})
```

Files can be `.mts`, `.ts`, `.mjs`, or `.js` -- TypeScript is transpiled with rolldown at build time.

Full details in [advanced/server-middleware](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/advanced/server-middleware.md).

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
