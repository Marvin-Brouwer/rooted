# Adapters

Adapters are Vite plugins that generate the files a host needs to serve your app. Add one to the `plugins` array in `vite.config.mts` and it runs automatically at the end of every production build.

The two server adapters do a little more: if you give them a `middlewarePath`, they also run your middleware during `vite dev` and `vite preview`. Everything else about an adapter is build-time only.

Each adapter handles two things: writing a catch-all fallback so the browser-side router can take over for any URL the server doesn't recognise, and writing any host-specific config files (a `_redirects` rule, a `firebase.json`, a `staticwebapp.config.json`, and so on).

## Two flavours

**Static adapters** are for file-based hosts (GitHub Pages, S3, Azure Blob, ...). They write:

- A pre-rendered `index.html` for every static route the manifest knows about.
- A fallback HTML file (usually `404.html`) that the host serves for any URL that doesn't match a real file. The browser-side router picks up from there.
- Any host-specific config files (`.nojekyll`, `_redirects`, `firebase.json`, ...).

**Routed adapters** are for Node.js servers (Fastify, Express). They write:

- The same pre-rendered route files as static adapters.
- `routes.json` -- a small JSON file the generated server reads at startup.
- `server.mjs` -- a ready-to-run Node server. Start it with `node dist/server.mjs`.

## Picking an adapter

| Host | Package |
|------|---------|
| GitHub Pages | `@rooted-adapters/github-pages` |
| GitLab Pages (static) | `@rooted-adapters/gitlab-pages` |
| Codeberg Pages | `@rooted-adapters/codeberg-pages` |
| Any git-pages.org compatible host | `@rooted-adapters/git-pages` |
| Netlify | `@rooted-adapters/netlify-hosting` |
| Cloudflare Pages | `@rooted-adapters/cloudflare-pages` |
| Vercel (static) | `@rooted-adapters/vercel-static` |
| Azure Static Web Apps | `@rooted-adapters/azure-static-webapp` |
| Firebase Hosting | `@rooted-adapters/firebase-hosting` |
| AWS S3 (+ DigitalOcean Spaces, STACKIT, OVH) | `@rooted-adapters/aws-s3` |
| Google Cloud Storage | `@rooted-adapters/gcp-cloud-storage` |
| Azure Blob Storage | `@rooted-adapters/azure-blob` |
| Cloudflare R2 | `@rooted-adapters/cloudflare-r2` |
| Scaleway Object Storage | `@rooted-adapters/scaleway-object-storage` |
| Any S3-compatible or generic object storage | `@rooted-adapters/static-site` |
| Fastify (any Node.js host) | `@rooted-adapters/fastify` |
| Express (any Node.js host) | `@rooted-adapters/express` |

Add the adapter to your `vite.config.mts`:

```ts
import { rootedManifest } from '@rooted/application'
import { generateRouteManifest } from '@rooted/router/manifest'
import { githubPagesAdapter } from '@rooted-adapters/github-pages'

export default rootedManifest({
  plugins: [
    generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
    githubPagesAdapter(),
  ],
  webManifest: {
    id: 'my-app',
    url: 'https://username.github.io/my-app/',
  },
})
```

## Providing routes

Adapters need to know your routes so they can pre-render static paths and configure the host for dynamic ones. There are two ways to provide them.

### Via `generateRouteManifest` (recommended)

This is the standard path. The manifest plugin scans your `_routes.mts` files at build time and hands the route list to the adapter automatically. Nothing extra to configure.

```ts
plugins: [
  generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
  githubPagesAdapter(),
]
```

### Via the `routes` option

If you don't use `generateRouteManifest`, pass routes directly to the adapter:

```ts
plugins: [
  githubPagesAdapter({
    routes: [
      '/about/',
      '/blog/',
      '/products/:id/',
    ],
  }),
]
```

Paths **without** `:param` segments are treated as static and get a pre-rendered `index.html`. Paths **with** `:param` segments are treated as dynamic and get registered as parameterized routes in the host config.

When both `generateRouteManifest` and `routes` are present, the lists are merged (deduplicated). The manifest routes always include SEO metadata; manually listed routes get plain HTML with no per-route meta.

If neither source provides any routes, the adapter throws at build time with a message telling you what to do.

## Server adapters

The Fastify and Express adapters write a `routes.json` and a `server.mjs` to the output directory.

`routes.json` looks like this:

```json
{
  "base": "/my-app/",
  "staticRoutes": ["/categories/", "/privacy/"],
  "dynamicRoutes": ["/products/:id/", "/users/:username/"],
  "fallback": "404.html",
  "dynamicStatus": 200
}
```

`server.mjs` reads that file at startup, registers the dynamic routes, and serves `404.html` as the SPA shell for everything else. Static adapters write it too, even though nothing deployed reads it, because `vite preview` answers from it.

Status codes follow from that list. A path in it, static or dynamic, is a real route and gets a `200`. Anything else gets a real `404`: navigations still receive the shell so the browser-side router can render your 404 page, and requests that don't accept HTML (a missing image, a stylesheet, a `fetch`) get an empty `404` rather than a page of HTML they can't use.

Every route has one canonical URL, the one with the trailing slash. `/recipe/42` redirects (`301`) to `/recipe/42/` rather than serving the same page at two addresses. Only paths that really are routes redirect, so a file is never touched, and neither is anything the app doesn't know about: `/nope` is a `404`, not a redirect to another `404`.

`vite dev` and `vite preview` answer the same way, off the same route list, so a broken link fails in dev instead of looking fine until you deploy. In dev this matters twice over, because Vite serves plenty of URLs that are not routes at all - source modules, dependencies, virtual ids, files in `public/`. Those are left to Vite untouched, which is why the redirect is keyed on the route table rather than on "does this path end in a slash". What dev can't tell you about is content: `/recipe/99999/` matches `/recipe/:id/` and gets a `200` in both, because whether recipe 99999 exists is your app's call, not the router's.

### What each host answers

Static hosts don't all behave the same, and dev mirrors whichever one you picked rather than showing you a flattering version of it.

| Adapter | Static route | Dynamic `:param` route | Unknown path |
|---|---|---|---|
| `fastify`, `express` | 200 | 200 | 404 + shell |
| `netlify-hosting`, `cloudflare-pages`, `gitlab-pages`, `firebase-hosting`, `vercel-static` | 200 | 200 | 404 + shell |
| `azure-static-webapp`, `github-pages`, `git-pages`, `codeberg-pages`, `aws-s3`, `azure-blob`, `cloudflare-r2`, `gcp-cloud-storage`, `scaleway-object-storage`, `static-site` | 200 | **404** + shell | 404 + shell |

The middle column is the one to watch. A host in the bottom row only serves files and has no rule for `/products/42/`: there's no directory there, so it falls through to `404.html`. The page still renders, because the browser-side router takes over, but the response is a 404 and dev says so rather than pretending otherwise. Same for the canonical redirect - `/categories` redirects because the host has a directory to redirect to, `/products/42` doesn't because it hasn't.

`azure-static-webapp` is in the bottom row for a reason worth knowing: Azure only supports a wildcard at the end of a route, so a rule for `/products/:id/` would also claim `/products/42/extra/` and hand out a 200 for a path that isn't a route. See [issue #311](https://github.com/Marvin-Brouwer/rooted/issues/311).

If the middle column matters for your site, pick a host from the middle row, or accept the 404 and move on. It's a status code, not a broken page.

Start the server:

```sh
node dist/server.mjs
```

The `PORT` environment variable controls the port (default: 3000). The generated server listens on `0.0.0.0` so it works in containers. Install the peer dependencies in your production environment:

```sh
# Fastify
pnpm add fastify @fastify/static

# Express
pnpm add express
```

The routed adapter approach works for any Node.js host: Railway, Render, fly.io, Heroku, a VPS, or anything that can run `node dist/server.mjs`. No host-specific adapter is needed for these -- just use Fastify or Express.

If you need to register Fastify plugins or Express middleware (proxies, auth, rate-limiting) alongside the rooted handlers, see [advanced/server-middleware](../advanced/server-middleware.md). That middleware also runs in `vite dev` and `vite preview`, so you don't need a second process to reach your own routes while developing.

## CI/CD pipelines

Most hosts auto-deploy from a connected git repository. If you use a separate CI pipeline, here's what each host needs:

**GitHub Actions + GitHub Pages**\
Use `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages`. GitHub provides a [Pages starter workflow](https://github.com/actions/starter-workflows/blob/main/pages/static.yml) you can adapt. The build step is just `pnpm build`.

**GitLab CI/CD**\
A `pages` job with `artifacts.paths: [public]` is the convention. Rename your output directory to `public` or copy it there, then GitLab serves it automatically. See [GitLab Pages CI/CD](https://docs.gitlab.com/ee/user/project/pages/getting_started/pages_from_scratch.html).

**Netlify**\
Netlify auto-deploys from git with no CI config needed -- just set the build command (`pnpm build`) and publish directory (`dist`) in the Netlify dashboard. For other CI pipelines, install the Netlify CLI and run `netlify deploy --dir dist --prod`.

**Cloudflare Pages**\
Cloudflare Pages auto-deploys from git. For other pipelines, use Wrangler: `wrangler pages deploy dist`.

**Vercel**\
Vercel auto-deploys from git. For other pipelines, install the Vercel CLI and run `vercel deploy --prebuilt` after building.

**Firebase Hosting**\
Install the Firebase CLI, run `firebase login` once, then `firebase deploy` after building. The adapter writes `firebase.json` to the project root so the CLI knows where to look.

**Azure Static Web Apps**\
Use the `azure/static-web-apps-deploy` GitHub Action. It handles both build and deploy. See [Azure SWA deployment](https://docs.microsoft.com/en-us/azure/static-web-apps/github-actions-workflow).

**Node.js servers (any host)**\
Build with `pnpm build`, copy the `dist/` directory to your host, and run `node dist/server.mjs`. The exact deployment mechanism depends on the host (Railway, Render, fly.io, Heroku, etc.) but none of them need a dedicated adapter -- the generated server works everywhere Node runs.

## Writing your own adapter

If no existing adapter covers your host, you can write one using `@rooted/adapter` directly.

```ts
import { staticAdapter } from '@rooted/adapter'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

export function myHostAdapter(): Plugin[] {
  return staticAdapter({
    name: 'rooted:my-host',
    // Set this to 'routed' if the config you write below makes the host
    // match :param routes itself. It defaults to 'fallback'.
    dynamicRoutes: 'fallback',
    async setup({ outputDirectory, resolvedRoutes }) {
      // resolvedRoutes.staticPaths  -- pre-rendered paths
      // resolvedRoutes.dynamicPatterns  -- :param patterns
      await writeFile(
        path.join(outputDirectory, '_my-host-config'),
        buildMyConfig(resolvedRoutes),
        'utf8',
      )
    },
  })
}
```

Use `staticAdapter` for file-based hosts and `routedAdapter` for server-based hosts. The `setup` callback runs after the fallback file is written and before static routes are pre-rendered. See the TSDOC on `AdapterContext` for the full list of available fields.

Both return `Plugin[]`, and both include the not-found handler that makes `vite dev` and `vite preview` answer the way your host will. You get that by writing the adapter; there's nothing to wire up. `dynamicRoutes` is what tells it which of the two behaviours in the table above your host has.

Route and SEO details are not among them. `AdapterContext` gives you `resolvedRoutes`, which merges the manifest routes with any listed manually, and that's the supported way to see what pages exist. SEO injection happens through `@rooted/seo` before the HTML reaches your adapter, so there's nothing to wire up.

### Server-based adapters

A host that runs a Node server has a second half beyond the build: the middleware a user writes should also run while they're developing, otherwise `vite dev` serves the app without any of their own routes and they end up booting a second process by hand.

`routedAdapter` covers that when you give it `middlewarePath` and `createServer`. It does the discovery, the ordering, the loading and the connect-chain fall-through; you supply the framework instance and a handler that calls `next()` for anything it has no route for.

```ts
import { routedAdapter } from '@rooted/adapter'
import type { Connect, Plugin } from 'vite'

export function myServerAdapter(options?: MyOptions): Plugin[] {
  return routedAdapter<MyApplication>({
    name: 'rooted:my-server',
    middlewarePath: options?.middlewarePath,
    async createServer(middleware) {
      const app = createMyApplication()
      for (const register of middleware) await register(app)
      return { handle: app as unknown as Connect.NextHandleFunction }
    },
  })
}
```

Note the return type. That's several plugins, not one: the build half is `apply: 'build'` and the serve halves are `apply: 'serve'`, because a single plugin object would get its `closeBundle` called when the dev server shuts down and would try to run a whole production build. Vite flattens nested arrays in `plugins`, so a `Plugin[]` drops into a config exactly like a single plugin does.

You get three plugins with a `createServer` and two without: `rooted:my-server` builds, `rooted:my-server-dev` runs the middleware, and `rooted:my-server-not-found` gives dev and preview the same 404s and canonical redirects as the generated server. The middleware plugin is inert when `middlewarePath` is undefined, so you can pass the option straight through without guarding it.

`nodeMiddlewareServer` and `routedNotFound` are still exported if you'd rather compose them yourself; `routedAdapter` is just their canonical composition.

See [advanced/server-middleware](../advanced/server-middleware.md) for what this looks like from the app developer's side, including the differences between dev and preview.

`@rooted/adapter` also exports the pieces those plugins are built from, so a custom adapter doesn't have to re-derive them:

- `resolveAdapterRoutes` merges the route manifest with the adapter's manual `routes` option into the two lists everything else works from.
- `createRouteMatcher` turns those lists into a predicate with the same `:param` semantics as the generated server's router. `looksLikeFile` and `withTrailingSlash` come with it.
- `requestTarget` gives you the in-base pathname of a request, or nothing when it isn't yours to answer: a write, something outside `base`, or one of Vite's own URLs. `wantsHtml` and `stripBase` are there too.
- `buildServerPreamble` and `buildMiddlewareBlock` emit the opening of a generated `server.mjs`, so a new server adapter only writes the part its framework does differently.

The last one matters more than it looks. The route table in the generated server and the matcher in dev have to agree on what counts as a route, or a link works in one and 404s in the other, so they're deliberately built from the same place.
