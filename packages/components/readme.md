# [`@rooted/components`](https://www.npmjs.com/package/@rooted/components)

The component model for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

> [!IMPORTANT]
> This package is in beta. Breaking changes can still happen between beta releases, so pin the exact version and read the release notes before you update.

```sh
pnpm add @rooted/components@beta
```

```ts
import { component } from '@rooted/components'

export const Greeting = component({
  name: 'greeting',
  onMount({ append, element }) {
    append(element('p', { textContent: 'Hello from rooted!' }))
  },
})
```

More in the [components guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/components.md).
