# State

`@rooted/store` is a small synchronous state container. It is not a reactive framework. There are no signals, no proxies, no automatic re-renders. You read the value when you need it, and you subscribe to events when you want to react to changes.

```sh
pnpm add @rooted/store
```

## When to use it

Use a store when two components need to agree on a piece of state and neither one owns the other.

When state belongs to one component, just keep it in a local variable inside `onMount`.

## Creating a store

```ts
import { createStore } from '@rooted/store'

const counter = createStore({ count: 0 })
```

Stores hold pretty much anything: primitives, objects, arrays, `Date`, `Map`, `Set`, typed arrays, `ArrayBuffer`, `DataView`, class instances, even values with functions or symbol-keyed brands on them. `createStore()` without arguments returns a store with `undefined` as the initial value.

```ts
const flag = createStore(true)             // Store<boolean>
const name = createStore<string>()         // Store<string | undefined>
const status = createStore<'idle' | 'navigating'>('idle')
```

A bare function or promise is the one thing it won't take, because both mean something else: a function is a factory, and a promise is something to await. `createStore.from` takes those. Nested on a property of object state, either is fine.

### Starting from a factory

`createStore.from` takes a function and uses what it returns. Use it when the first value takes more than an expression to work out, so you don't need a helper at module scope that exists to be called once on the line below it:

```ts
export const themeStore = createStore.from<Theme>(() => {
  const stored = cookieStorage.get<string>('theme')
  if (stored === 'system' || stored === 'light' || stored === 'dark') return stored
  // Back-compat: older versions wrote 'auto'
  if (stored === 'auto') return 'system'
  return 'system'
})
```

The factory runs when the store is built, which at module scope is import time, the same as passing a value. It only buys you time where the store itself does: inside `onMount`, or behind a condition.

An async factory gives you a promise for the store instead of the store:

```ts
const settings = await createStore.from(async () => {
  const response = await fetch('/settings')
  return await response.json() as Settings
})
```

Everything reading that store waits for the `await`, and at module scope it makes the module async for everyone importing it. A synchronous factory with a sensible default, updated once the fetch lands, is usually easier to live with.

For an async factory, annotate its return type rather than passing a type parameter. `createStore.from<Theme>(async () => 'dark')` doesn't compile:

```ts
const theme = await createStore.from(async (): Promise<Theme> => 'dark')
```

## Reading

`store.value` returns a deeply-frozen snapshot of the current state, typed as `ReadonlyState<T>` so nested mutations are rejected by both TypeScript and the runtime.

```ts
const { count } = counter.value
```

The snapshot is built lazily on the first read after an `update` and cached until the next `update`. Two consecutive reads return the same object reference, which is handy for downstream memoisation. Updates that nobody reads pay zero clone cost.

### Values that don't change

Copying on read and hashing on update is cheap for ordinary state, and pure waste for a big value that never changes, like the bytes of a file or a large lookup table. Wrap one with `Immutable.from` and the store shares it instead: no copy on read, and the hash only looks at which value it is, not what's in it.

```ts
import { createStore, Immutable } from '@rooted/store'

const quiz = createStore({ title: 'Kana', file: Immutable.from(bytes) })

new Blob([quiz.value.file.value])                          // the same Uint8Array you passed in
quiz.update(state => { state.title = 'Kanji' })           // doesn't copy or re-read the bytes
quiz.update(() => ({ file: Immutable.from(otherBytes) })) // fires 'change'
```

`Immutable.from` deep-freezes the value in place, so your own reference is frozen too. Bytes can't be frozen, so for a typed array, `ArrayBuffer` or `DataView` it's a promise you make: write into one anyway and every snapshot sees it, and no `change` fires. Change detection goes by identity, so wrapping the same value again is no change, and wrapping a different one with identical contents is.

## Updating

`store.update(setter)` runs your setter with the **live** state reference. You can mutate it at any depth, return a partial to merge, or return a new value for primitive stores.

For object stores, mutate in place:

```ts
counter.update(state => {
  state.count += 1
})
```

Or return a partial to merge:

```ts
counter.update(() => ({ count: 0 }))
```

For primitive stores, return the new value:

```ts
const status = createStore<'idle' | 'busy'>('idle')

status.update(() => 'busy')
```

## Subscribing

A store fires two event types:

- `'update'` fires every time `update` is called, even if nothing changed.
- `'change'` fires only when the structural hash of the state actually differs.

Inside a component, pass the component's `signal` so the listener cleans up on unmount.

```ts
onMount({ signal }) {
  counter.on('change', signal, ({ detail }) => {
    label.textContent = String(detail.state.count)
  })
}
```

At module scope there is no unmount, so leave the signal out. The listener is cleaned up when the page unloads instead.

```ts
export const themeStore = createStore<Theme>('light')

themeStore.on('change', ({ detail }) => {
  cookieStorage.set('theme', detail.state)
})
```

Pass your own signal here if you want to be able to unsubscribe later. That is a real use case and it works.

What isn't worth writing is `new AbortController().signal` for a controller you never keep a reference to. It only fills the parameter. Nothing ever aborts it, so the listener is never cleaned up, and you miss the page cleanup you would have got by leaving the signal out.

`detail.state` is a frozen snapshot. Read it directly. Don't keep a reference around expecting it to stay current; it won't.

## A typical writer/reader pair

```ts
import { component } from '@rooted/components'
import { createStore } from '@rooted/store'

export const counter = createStore({ count: 0 })

export const IncrementButton = component({
  name: 'increment-button',
  onMount({ append, element }) {
    append(
      element('button', {
        textContent: 'Increment',
        on: {
          click() {
            counter.update(state => { state.count += 1 })
          },
        },
      })
    )
  },
})

export const CounterDisplay = component({
  name: 'counter-display',
  onMount({ append, element, signal }) {
    const label = append(
      element('span', {
        textContent: String(counter.value.count),
      })
    )
    counter.on('change', signal, ({ detail }) => {
      label.textContent = String(detail.state.count)
    })
  },
})
```

Either component can live anywhere on the page. They don't need to be parent and child.

## When `update` and `change` differ

Updating with the same value:

```ts
status.update(() => 'idle') // status was already 'idle'
```

Fires `'update'` (you called it) but not `'change'` (the hash is the same). Use `'change'` for things that should only run when something actually moved, and `'update'` when you care that an action happened.

## Trade-offs

The honest list:

- The store is synchronous. There is no async middleware. If you need effects, write them yourself in the component that calls `update`.
- Reads materialise a deep-frozen clone the first time after each update and cache it. For very large state trees this is measurable on first read. Updates with no readers pay nothing.
- Class instances in state are cloned structurally. The prototype is preserved so `instanceof` keeps working, but the constructor isn't re-run, private fields (`#field`) are lost, identity changes, and any `WeakMap`/`WeakSet` entries keyed on the original won't see the clone. If your class carries behaviour the snapshot needs to keep, prefer plain data.
- `Map` and `Set` snapshots throw a `TypeError` on `.set` / `.add` / `.delete` / `.clear`, since `Object.freeze` can't reach their internal slots and we'd rather fail loudly than silently mutate.
- Typed arrays, `ArrayBuffer` and `DataView` snapshots are real copies, but they aren't frozen, because bytes can't be. TypeScript still marks them readonly. Writing into one at runtime never reaches the live state, but it does change that snapshot for everyone reading it until the next `update`. Each view gets a buffer of its own holding just its bytes, so two views that shared a buffer in state don't share one in the snapshot, and own properties on them aren't carried over.
- Change detection writes out the bytes of every typed array, `ArrayBuffer` and `DataView` in state as hex, on every `update`. For a few kilobytes that's nothing. For megabytes it's a string twice that size each time. Wrap values like that with [`Immutable.from`](#values-that-dont-change).
- If your runtime supports immutable `ArrayBuffer`s (`buffer.sliceToImmutable()`, a TC39 proposal that no browser or Node version turns on by default yet), a buffer like that, and any view over it, is shared between state and snapshots instead of copied. Nobody can write to it, so there's nothing to protect.
- State is concrete: no bare functions, no bare promises. `createStore.from` covers both, and a function or promise nested on a property is still fine.
- A promise nested in state is shared between snapshots, not copied. There's no way to copy one: a promise's state lives in internal slots that a structural copy can't reach. So every snapshot hands you the same promise object, and anything with a callable `then` counts, not just a native `Promise`.
- There is no time-travel debugging or middleware ecosystem. If you need those, this isn't the tool.

This is intentional. The store is small enough to read in one sitting.
