# [`@rooted/components`](https://www.npmjs.com/package/@rooted/components)

The component model for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add @rooted/components
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
