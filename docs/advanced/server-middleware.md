# Server middleware

The Fastify and Express adapters generate a `server.mjs` that handles static files, dynamic routes, and the SPA fallback. If you need to slot in your own plugins (API proxies, auth, rate-limiting), point the adapter at a folder of middleware files and they get wired into the generated server.

The same files also run during `vite dev` and `vite preview`, so you don't need a second process or a `server.proxy` entry to hit your own routes while developing. See [in dev and preview](#in-dev-and-preview).

## Setting it up

Add `middlewarePath` to the adapter options in `vite.config.mts`:

```ts
fastifyAdapter({ middlewarePath: './src/server-middleware' })
// or
expressAdapter({ middlewarePath: './src/server-middleware' })
```

The path is relative to the Vite project root. At build time the adapter picks up every `.mts`, `.ts`, `.mjs`, and `.js` file from that folder, runs each one through rolldown (the same bundler Vite uses), and writes them to `dist/middleware/` as `.mjs`. Relative imports between files are bundled in; anything from `node_modules` stays external and gets resolved at runtime. The generated `server.mjs` then scans `dist/middleware/` at startup and calls each file in lexicographic order before the rooted handlers register. That ordering matters: it means `/api/*` requests reach your proxy before rooted's not-found handler can intercept them.

Use numeric prefixes (`01-`, `02-`, ...) when you have multiple files and want a specific load order.

## In dev and preview

Nothing extra to configure: if `middlewarePath` is set, the adapter also runs your middleware while the Vite dev server is up. It boots a Fastify or Express instance inside Vite's own process and mounts it on Vite's own port, ahead of Vite's static-file and transform middlewares. So `/api/*` reaches your proxy, and anything your framework has no route for falls through to Vite and gets the usual dev handling.

In dev the files are loaded straight from source through Vite's SSR module runner. TypeScript works, there's no bundling step, and rolldown isn't involved at all. Edit a middleware file and the framework instance is rebuilt on the next request. That's a whole-instance rebuild rather than swapping out one route, because neither Fastify nor Express lets you unregister a route after boot, but it beats restarting the process.

`vite preview` serves the `dist/` folder, so there is no module graph to load from. It runs the built `dist/middleware/*.mjs` files instead, in the same order, the same way `server.mjs` does. That means preview shows you the last build, not your working tree. Build first.

If a middleware file throws while loading or registering, the failure is logged and that file is skipped. The dev server stays up.

## File format

Each file must export a default function that receives the app instance. The `createMiddleware` helper exported by both adapters is an identity function that types the parameter for you, so editors pick up the Fastify or Express instance without manual annotations.

Import it from the `/middleware` subpath, not the package root. The root is the Vite plugin, so it carries the adapter machinery your middleware files never touch -- they're run by the server, not by Vite. The subpath is the helper and nothing else: it compiles to one identity function with no imports at all, so loading it costs nothing.

**Fastify** -- register a proxy to a backend API:

```ts
// src/server-middleware/01-api-proxy.mts
import { createMiddleware } from '@rooted-adapters/fastify/middleware'
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
import { createMiddleware } from '@rooted-adapters/express/middleware'
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

Your middleware runs before the rooted handlers, in dev and in the built server alike, so a route you register wins over the 404 handling. The reverse doesn't exist: there is no hook for running things after. If you need a post-handler step (response transformation, logging tail), use Fastify's `onSend` hook or Express's response middleware from inside your middleware file.

Each file in the folder is treated as a separate middleware entry, so don't drop shared helper files in there -- they get executed as middleware too. Put helpers in a sibling folder (e.g. `src/server-middleware-shared/`) and import them with relative paths; rolldown bundles them into the output `.mjs` automatically.

### Dev and preview specifically

Dev is not a perfect copy of the generated server. The differences are all in the same direction: in dev, a request your framework has no route for is Vite's, not yours.

- Global Fastify hooks don't run for requests that fall through. This is deliberate -- an `onRequest` auth hook would otherwise reject the dev client's own module and asset requests -- but it does mean a hook you rely on in production isn't exercised in dev.
- A `setNotFoundHandler` you register won't fire in dev, because unmatched requests go to Vite instead of your 404.
- Fastify middleware mounted with `@fastify/middie` (`app.use('/api', ...)`) doesn't register a route, so those requests fall through to Vite. Register a route (`app.get`, `app.all`, `@fastify/http-proxy`) if you need it in dev.
- The Fastify instance runs with `logger: false` in dev, because pino's JSON output interleaved with Vite's is unreadable. The generated `server.mjs` still logs.
- `vite preview` serves `index.html` for unmatched paths where the generated server serves `404.html`. That only matters if you're checking per-route SEO metadata, and for that you want the real server.
