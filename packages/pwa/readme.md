# [`@rooted/pwa`](https://www.npmjs.com/package/@rooted/pwa)

Service worker registration for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework, plus two components for putting a new version in front of the user.

[`@rooted/application`](https://www.npmjs.com/package/@rooted/application) generates the registration for you, so you only install this package directly when you want the components or the functions behind them.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add @rooted/pwa
```

```ts
import { component } from '@rooted/components'
import { ApplyUpdateButton, UpdateNotification } from '@rooted/pwa/components'

export const UpdateBanner = component({
  name: 'update-banner',
  onMount({ append, create, element }) {
    append(
      create(UpdateNotification, {
        children: [
          element('span', {
            textContent: 'A new version is ready.',
          }),
          create(ApplyUpdateButton, {
            label: 'Reload',
          }),
        ],
      }),
    )
  },
})
```

rooted never swaps the bundle underneath a page that is already running: the router resolves route chunks with `await import()` against the precache the page started on, so a mid-session swap breaks navigation. An update lands on the next page load, or when someone asks for it.

More in the [PWA guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/pwa.md).
