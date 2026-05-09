# [`@rooted/store`](https://www.npmjs.com/package/@rooted/store)

A small synchronous shared-state container. Not reactive. Usable on its own, or with the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add @rooted/store
```

```ts
import { createStore } from '@rooted/store'

const counter = createStore({ count: 0 })

counter.update(state => { state.count += 1 })

counter.on('change', signal, ({ detail }) => {
  console.log(detail.state.count)
})
```

More in the [state guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/state.md).
