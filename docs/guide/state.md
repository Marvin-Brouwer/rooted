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

Stores hold pretty much anything: primitives, objects, arrays, `Date`, `Map`, `Set`, class instances, even values with functions or symbol-keyed brands on them. `createStore()` without arguments returns a store with `undefined` as the initial value.

```ts
const flag = createStore(true)             // Store<boolean>
const name = createStore<string>()         // Store<string | undefined>
const status = createStore<'idle' | 'navigating'>('idle')
```

State has to be concrete, though. A bare function and a bare promise are both rejected: the first is a factory and the second is something to await, and `createStore.from` handles both. Either one nested on a property of object state is fine.

### Working the initial state out

`createStore.from` takes a factory instead of a value. It runs once, while the store is being built.

Reach for it when the first value takes more than an expression, so you don't end up with a helper at module scope that gets called once on the line below it and looks reusable when it isn't:

```ts
export const themeStore = createStore.from<Theme>(() => {
  const stored = cookieStorage.get<string>('theme')
  if (stored === 'system' || stored === 'light' || stored === 'dark') return stored
  // Back-compat: older versions wrote 'auto'
  if (stored === 'auto') return 'system'
  return 'system'
})
```

Be clear about what this does and doesn't buy you. At module scope the factory runs at import time, the same as the value form, so nothing is deferred. What you get is the fold: one expression at the call site instead of a named function plus a call. Where it does defer is a store built conditionally, or inside `onMount`, where the factory doesn't run until the store does. And for an async first value it is the only option, since `createStore` takes concrete state only.

An async factory gives you a promise for the store, so you have to `await` it:

```ts
const settings = await createStore.from(async () => {
  const response = await fetch('/settings')
  return await response.json() as Settings
})
```

Worth knowing before you reach for it: there's no half-built store in the meantime, so everything reading it waits for that `await`. At module scope that means a top-level await, which makes the whole module async for everyone importing it. Most of the time a synchronous factory with a sensible default, updated once the fetch lands, is easier to live with.

One wrinkle: an explicit type parameter and an async factory don't combine. `createStore.from<Theme>(async () => 'dark')` doesn't compile, because the synchronous overload is tried first and widens the literal before the async one gets a look. Annotate the factory's return type instead, which is what you'd write anyway:

```ts
const theme = await createStore.from(async (): Promise<Theme> => 'dark')
```

## Reading

`store.value` returns a deeply-frozen snapshot of the current state, typed as `ReadonlyState<T>` so nested mutations are rejected by both TypeScript and the runtime.

```ts
const { count } = counter.value
```

The snapshot is built lazily on the first read after an `update` and cached until the next `update`. Two consecutive reads return the same object reference, which is handy for downstream memoisation. Updates that nobody reads pay zero clone cost.

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
- State is concrete: no bare functions, no bare promises. `createStore.from` covers both, and a function or promise nested on a property is still fine.
- A promise nested in state does not survive snapshotting. `deepClone` copies it structurally, and a copied promise throws on `await`. See [#333](https://github.com/Marvin-Brouwer/rooted/issues/333).
- There is no time-travel debugging or middleware ecosystem. If you need those, this isn't the tool.

This is intentional. The store is small enough to read in one sitting.
