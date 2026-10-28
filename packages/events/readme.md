# [`@rooted/events`](https://www.npmjs.com/package/@rooted/events)

Typed event helpers and global error filtering. Usable on its own, or as the event layer for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

> [!IMPORTANT]
> This package is in beta. Breaking changes can still happen between beta releases, so pin the exact version and read the release notes before you update.

```sh
pnpm add @rooted/events@beta
```

```ts
import type { EventHandler } from '@rooted/events'

type ButtonOptions = {
  label: string
  on?: { click?: EventHandler<'button', 'click'> }
}
```

More in the [events page](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/advanced/events.md).
