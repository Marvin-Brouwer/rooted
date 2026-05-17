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

More in the [adapters guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/adapters.md).
