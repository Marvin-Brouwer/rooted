# [`@rooted/storage`](https://www.npmjs.com/package/@rooted/storage)

Type-safe wrappers around `localStorage`, `sessionStorage`, and cookies. SSR-safe.

Part of the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework, usable on its own.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add @rooted/storage
```

```ts
import { localStorage, cookieStorage } from '@rooted/storage/web'

localStorage.set('theme', 'dark')
const theme = localStorage.get<'dark' | 'light'>('theme')

cookieStorage.set({
  name: 'session',
  value: { id: 7 },
  sameSite: 'lax',
})
```

Cookies default to a `Path` of the app root, so they're readable everywhere in the app rather than only under the page that set them.

More in the [storage guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/storage.md).
