# [`@rooted/store`](https://www.npmjs.com/package/@rooted/store)

A small synchronous shared-state container. Not reactive. Usable on its own, or with the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

> [!IMPORTANT]
> This package is in beta. Breaking changes can still happen between beta releases, so pin the exact version and read the release notes before you update.

```sh
pnpm add @rooted/store@beta
```

```ts
import { createStore } from '@rooted/store'

const counter = createStore({ count: 0 })

counter.update(state => { state.count += 1 })

// inside a component, pass the component's signal so the listener dies with it
counter.on('change', signal, ({ detail }) => {
  console.log(detail.state.count)
})

// at module scope, leave the signal out and it's cleaned up on page unload
counter.on('change', ({ detail }) => {
  console.log(detail.state.count)
})
```

More in the [state guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/state.md).
