# [`@rooted/events`](https://www.npmjs.com/package/@rooted/events)

Typed event helpers and global error filtering. Usable on its own, or as the event layer for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add @rooted/events
```

```ts
import type { EventHandler } from '@rooted/events'

type ButtonOptions = {
  label: string
  on?: { click?: EventHandler<'button', 'click'> }
}
```

More in the [events page](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/advanced/events.md).
