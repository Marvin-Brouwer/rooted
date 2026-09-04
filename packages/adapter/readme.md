# [`@rooted/adapter`](https://www.npmjs.com/package/@rooted/adapter)

Base adapter primitives for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework. This package is for **adapter authors**, not app developers.

> [!IMPORTANT]
> This package is still in alpha.

If you're deploying an app, install one of the `@rooted-adapters/*` packages instead. See the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).

```sh
pnpm add -D @rooted/adapter
```

```ts
import { staticAdapter } from '@rooted/adapter'
import type { Plugin } from 'vite'

export function myHostAdapter(): Plugin {
  return staticAdapter({
    name: 'rooted:my-host',
    async setup({ outputDirectory }) {
      // Write any host-specific files here (e.g. a redirects config).
    },
  })
}
```

## Server adapters

`routedAdapter` covers the build. If your host runs a Node server and you accept a folder of user middleware, pair it with `nodeMiddlewareServer` so the same files run during `vite dev` and `vite preview`. It handles discovery, ordering, loading and the connect-chain fall-through; you supply the framework instance.

```ts
import { nodeMiddlewareServer, routedAdapter } from '@rooted/adapter'
import type { Connect, Plugin } from 'vite'

export function myServerAdapter(options?: MyOptions): Plugin[] {
  return [
    routedAdapter({ name: 'rooted:my-server', /* ... */ }),
    nodeMiddlewareServer<MyApplication>({
      name: 'rooted:my-server-dev',
      middlewarePath: options?.middlewarePath,
      async createServer(middleware) {
        const app = createMyApplication()
        for (const { register } of middleware) await register(app)
        // Must call next() for anything it has no route for.
        return { handle: app as unknown as Connect.NextHandleFunction }
      },
    }),
  ]
}
```

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
