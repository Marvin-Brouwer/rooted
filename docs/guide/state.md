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

const counter = createStore({ value: { count: 0 } })
```

`createStore` takes a shape, not a bare value: `{ value }` for state you already have, `{ create }` for state that has to be read first. The shape is there because a store can hold a function, so "a value, unless it's a function" would have to guess. Calling `createStore()` with no argument returns a store with `undefined` as the initial value.

```ts
const flag = createStore({ value: true })  // Store<boolean>
const name = createStore<string>()         // Store<string | undefined>
const status = createStore<'idle' | 'navigating'>({ value: 'idle' })
```

Stores hold pretty much anything: primitives, objects, arrays, `Date`, `Map`, `Set`, class instances, even values with functions or symbol-keyed brands on them.

### Reading the initial state from somewhere

Use `{ create }` when the first value has to be looked up. It runs once, while the store is being built, so nothing is read until the store actually exists.

```ts
export const theme = createStore<Theme>({
  create: () => cookieStorage.get<Theme>('theme') ?? 'light',
})
```

That saves you a named helper that exists only to be called on the next line, and it keeps the read out of module-parse time.

`create` can be async, in which case you get a promise for the store and have to `await` it:

```ts
const settings = await createStore({
  async create() {
    const response = await fetch('/settings')
    return await response.json() as Settings
  },
})
```

Worth knowing before you reach for it: there's no half-built store in the meantime, so everything that reads the store has to wait for that `await`. At module scope that means a top-level await, which makes the whole module async for everyone importing it. Most of the time a synchronous `create` with a sensible default, updated once the fetch lands, is the easier thing to live with.

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
const status = createStore<'idle' | 'busy'>({ value: 'idle' })

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
export const themeStore = createStore<Theme>({ value: 'light' })

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

export const counter = createStore({ value: { count: 0 } })

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
- A store can't usefully hold a promise. `{ create }` awaits anything thenable it returns, and a promise passed as `{ value }` gets deep-cloned along with the rest of object state, which leaves it broken. Store the resolved value instead.
- There is no time-travel debugging or middleware ecosystem. If you need those, this isn't the tool.

This is intentional. The store is small enough to read in one sitting.
