# Server middleware

The Fastify and Express adapters generate a `server.mjs` that handles static files, dynamic routes, and the SPA fallback. If you need to slot in your own plugins (API proxies, auth, rate-limiting), point the adapter at a folder of middleware files and they get wired into the generated server.

## Setting it up

Add `middlewarePath` to the adapter options in `vite.config.mts`:

```ts
fastifyAdapter({ middlewarePath: './src/server-middleware' })
// or
expressAdapter({ middlewarePath: './src/server-middleware' })
```

The path is relative to the Vite project root. At build time the adapter copies every `.mjs` file from that folder to `dist/middleware/`. The generated `server.mjs` then scans `dist/middleware/` at startup and calls each file in lexicographic order before the rooted handlers register. That ordering matters: it means `/api/*` requests reach your proxy before rooted's not-found handler can intercept them.

Use numeric prefixes (`01-`, `02-`, ...) when you have multiple files and want a specific load order.

## File format

Each file must export a default function that receives the app instance. The `createMiddleware` helper exported by both adapters is an identity function that exists purely for type inference -- editors pick up the Fastify or Express types without you having to annotate the parameter.

**Fastify** -- register a proxy to a backend API:

```js
// src/server-middleware/01-api-proxy.mjs
import { createMiddleware } from '@rooted-adapters/fastify'
import fastifyHttpProxy from '@fastify/http-proxy'

export default createMiddleware(async (app) => {
  await app.register(fastifyHttpProxy, {
    upstream: process.env.API_URL,
    prefix: '/api',
  })
})
```

**Express** -- same idea with `http-proxy-middleware`:

```js
// src/server-middleware/01-api-proxy.mjs
import { createMiddleware } from '@rooted-adapters/express'
import { createProxyMiddleware } from 'http-proxy-middleware'

export default createMiddleware((app) => {
  app.use('/api', createProxyMiddleware({ target: process.env.API_URL }))
})
```

The middleware function may be async (Fastify often needs `await app.register(...)`) or synchronous. The generated server awaits the return value either way.

## What gets shipped

After a build, your output directory looks like this:

```
dist/
  index.html
  404.html
  routes.json
  server.mjs
  middleware/
    01-api-proxy.mjs
    02-auth.mjs
  ...
```

The middleware folder is part of the build artifact. You don't need to copy anything separately when deploying -- just ship the whole `dist/` directory.

## Limits

Files must be plain ESM (`.mjs`). They aren't transpiled. If you want TypeScript on the server side, compile your middleware separately into `.mjs` before the rooted build, or import compiled output from somewhere else in your project structure.

The middleware runs before the rooted handlers and there is no hook for running things after. If you need a post-handler step (response transformation, logging tail), use Fastify's `onSend` hook or Express's response middleware from inside your middleware file.
