# Storage

`@rooted/storage` wraps the three browser storage APIs (`localStorage`, `sessionStorage`, and cookies) in something type-safe. It does not encrypt or sync. It is just a small layer that handles serialisation and gives you typed reads.

```sh
pnpm add @rooted/storage
```

Import from `@rooted/storage/web`:

```ts
import { localStorage, sessionStorage, cookieStorage } from '@rooted/storage/web'
```

All three are SSR-safe. When the underlying browser API isn't there (for example during a server render), reads return `undefined` and writes are no-ops. Nothing throws at import time.

## `localStorage`

Persistent across tabs and reloads. Cleared by the user.

```ts
import { localStorage } from '@rooted/storage/web'

localStorage.set('theme', 'dark')

const theme = localStorage.get<'dark' | 'light'>('theme')
// 'dark' | 'light' | undefined

localStorage.removeItem('theme')
```

`get<T>` returns `undefined` if the key is missing. The type parameter tells TypeScript what to expect. Strings round-trip as-is; everything else is JSON-encoded on write and JSON-parsed on read.

`get` and `set` are paired with the lower-level `getItem` and `setItem` that work in raw strings, plus `keys()`, `key(index)`, `length`, and `clear()` from the native interface.

## `sessionStorage`

Same shape as `localStorage`, but scoped to the tab and cleared when the tab closes.

```ts
import { sessionStorage } from '@rooted/storage/web'

sessionStorage.set('draft', { title: 'WIP' })
const draft = sessionStorage.get<{ title: string }>('draft')
sessionStorage.removeItem('draft')
```

## `cookieStorage`

Cookies are different from the other two. They have an expiry, a path, a `SameSite` policy, and a `Secure` flag. The API has two `set` overloads: one for plain reads/writes, and one that takes a full cookie init object.

```ts
import { cookieStorage } from '@rooted/storage/web'

// Plain set: name + value, no attributes.
cookieStorage.set('locale', 'en-GB')

// Full init: pass attributes through to the browser.
cookieStorage.set({
  name: 'session',
  value: { id: 7 },
  path: '/',
  sameSite: 'lax',
  secure: true,
})

const locale = cookieStorage.get<string>('locale')

cookieStorage.removeItem('session', { path: '/' })
```

A few things to know:

- The init form accepts everything in the standard `CookieInit`: `domain`, `path`, `expires`, `sameSite`, `secure`, and any new field the browser adds.
- `get<T>` parses JSON, just like `localStorage.get`. Strings come back as strings. Objects come back as their original shape.
- `removeItem(name, { domain, path })` matches on the whole tuple. If you set a cookie with `path: '/'`, you must remove it with `path: '/'`. Otherwise the browser keeps it.
- `names()` returns the list of cookie names visible to the page. `all()` returns a `Map<string, string>` of every cookie's raw value.

## Combining with a store

Storage is not reactive. Put a [store](./state.md) in front of it if you want the rest of the app to react to changes.

```ts
import { createStore } from '@rooted/store'
import { localStorage } from '@rooted/storage/web'

const KEY = 'theme'
type Theme = 'dark' | 'light'

export const theme = createStore<Theme>(localStorage.get<Theme>(KEY) ?? 'light')

theme.on('change', new AbortController().signal, ({ detail }) => {
  localStorage.set(KEY, detail.state)
})
```

The recipe-book example does this for the per-recipe servings count. See [`recipe.mts`][recipe-mts] for the full pattern.

[recipe-mts]: ../../examples/recipe-book/src/recipes/recipe.mts

## Trade-offs

- Synchronous reads. `localStorage` blocks the main thread. Don't use it for hot paths.
- No encryption. Don't store secrets.
- No quota handling. If the user's storage is full, `setItem` throws. Wrap it in `try/catch` if you write user-generated content.
- Reads are protected against prototype-pollution by a JSON reviver, but that does not make stored data trustworthy. Validate it before using it.
