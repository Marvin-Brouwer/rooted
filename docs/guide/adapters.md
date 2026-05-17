# Adapters

Adapters are Vite plugins that generate the files a host needs to serve your app. Add one to the `plugins` array in `vite.config.mts` and it runs automatically at the end of every production build.

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
  "dynamicRoutes": ["/products/:id/", "/users/:username/"],
  "fallback": "404.html"
}
```

`server.mjs` reads that file at startup, registers the dynamic routes, and serves `404.html` as the SPA shell for everything else.

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

If you need to register Fastify plugins or Express middleware (proxies, auth, rate-limiting) alongside the rooted handlers, see [advanced/server-middleware](../advanced/server-middleware.md).

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

export function myHostAdapter(): Plugin {
  return staticAdapter({
    name: 'rooted:my-host',
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
