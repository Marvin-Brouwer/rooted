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

Stores hold any structured-cloneable value: primitives, objects, arrays, dates. `createStore()` without arguments returns a store with `undefined` as the initial value.

```ts
const flag = createStore(true)             // Store<boolean>
const name = createStore<string>()         // Store<string | undefined>
const status = createStore<'idle' | 'navigating'>('idle')
```

## Reading

`store.value` returns a frozen clone of the current state. Reading is free.

```ts
const { count } = counter.value
```

Because the value is cloned, mutating what you get back does not affect the store.

## Updating

`store.update(setter)` runs your setter function with a fresh clone of the state. There are two ways to use it.

For object stores, mutate the draft:

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

Both forms require an `AbortSignal`. Pass the component's `signal` so the listener cleans up on unmount.

```ts
onMount({ signal }) {
  counter.on('change', signal, ({ detail }) => {
    label.textContent = String(detail.state.count)
  })
}
```

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
- Object updates clone the state. For very large objects this is measurable. Most apps don't notice.
- There is no time-travel debugging or middleware ecosystem. If you need those, this isn't the tool.

This is intentional. The store is small enough to read in one sitting.
