# Server middleware

The Fastify and Express adapters generate a `server.mjs` that handles static files, dynamic routes, and the SPA fallback. If you need to slot in your own plugins (API proxies, auth, rate-limiting), point the adapter at a folder of middleware files and they get wired into the generated server.

## Setting it up

Add `middlewarePath` to the adapter options in `vite.config.mts`:

```ts
fastifyAdapter({ middlewarePath: './src/server-middleware' })
// or
expressAdapter({ middlewarePath: './src/server-middleware' })
```

The path is relative to the Vite project root. At build time the adapter picks up every `.mts`, `.ts`, `.mjs`, and `.js` file from that folder, runs each one through rolldown (the same bundler Vite uses), and writes them to `dist/middleware/` as `.mjs`. Relative imports between files are bundled in; anything from `node_modules` stays external and gets resolved at runtime. The generated `server.mjs` then scans `dist/middleware/` at startup and calls each file in lexicographic order before the rooted handlers register. That ordering matters: it means `/api/*` requests reach your proxy before rooted's not-found handler can intercept them.

Use numeric prefixes (`01-`, `02-`, ...) when you have multiple files and want a specific load order.

## File format

Each file must export a default function that receives the app instance. The `createMiddleware` helper exported by both adapters is an identity function that types the parameter for you, so editors pick up the Fastify or Express instance without manual annotations.

**Fastify** -- register a proxy to a backend API:

```ts
// src/server-middleware/01-api-proxy.mts
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

```ts
// src/server-middleware/01-api-proxy.mts
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

The middleware runs before the rooted handlers and there is no hook for running things after. If you need a post-handler step (response transformation, logging tail), use Fastify's `onSend` hook or Express's response middleware from inside your middleware file.

Each file in the folder is treated as a separate middleware entry, so don't drop shared helper files in there -- they get executed as middleware too. Put helpers in a sibling folder (e.g. `src/server-middleware-shared/`) and import them with relative paths; rolldown bundles them into the output `.mjs` automatically.
