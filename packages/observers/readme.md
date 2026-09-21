# [`@rooted/observers`](https://www.npmjs.com/package/@rooted/observers)

`IntersectionObserver`, `MutationObserver` and `ResizeObserver` that disconnect themselves when an `AbortSignal` aborts. Usable on its own, or alongside the rest of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add @rooted/observers
```

```ts
import { intersectionObserver } from '@rooted/observers'

intersectionObserver({
  targets: table,
  rootMargin: '0px 0px -10% 0px',
  signal,
  on: {
    intersect({ entries, observer }) {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      reroll()
    },
  },
})
```

More in the [observers page](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/advanced/observers.md).
