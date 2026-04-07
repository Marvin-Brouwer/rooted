# Store

`@rooted/store` provides a minimal shared state container for inter-component
communication. It is not a reactive framework — there is no auto-tracking, no
dependency graph, no signals. It is a plain state holder that dispatches events
when state changes.

---

## Contents

- [What is a store](#what-is-a-store)
- [Creating a store](#creating-a-store)
- [Reading state](#reading-state)
- [Updating state](#updating-state)
  - [Mutation (void return)](#mutation-void-return)
  - [Partial return](#partial-return)
- [Subscribing to changes](#subscribing-to-changes)
  - [`update` vs `change`](#update-vs-change)
- [Signal cleanup](#signal-cleanup)
- [Custom hash exclusions — `hashedProperties()`](#custom-hash-exclusions--hashedproperties)
- [Inter-component example](#inter-component-example)

---

## What is a store

A store holds a piece of state and notifies subscribers when it changes. It is
intended for state that needs to be shared between sibling or distantly related
components — state that does not belong to either component individually.

The store is synchronous. Async work (fetching, debouncing) is the responsibility
of the component that owns the write side. The store itself only holds and broadcasts
the result.

---

## Creating a store

```ts
import { createStore } from '@rooted/store'

const counter = createStore({ count: 0 })
```

`createStore` accepts any plain object as the initial state and returns a `Store`.
The store is typically created at the scope that owns both components — for example,
in a parent component's `onMount`, or at module level.

---

## Reading state

```ts
counter.value // { count: 0 }
```

`store.value` returns a frozen `structuredClone` of the current state — a read-only
snapshot. Mutations to the snapshot do not affect the store.

---

## Updating state

Call `store.update()` with a setter function. The setter receives a `structuredClone`
of the current state (`currentValue`) and may either mutate it or return a partial
object to merge.

### Mutation (void return)

```ts
counter.update(currentValue => {
  currentValue.count++
})
```

The mutated clone becomes the new state.

### Partial return

```ts
counter.update(() => ({ count: 0 }))
```

The returned object is merged into the current state via `Object.assign`. Unmentioned
keys are preserved.

In both cases, the setter **must be synchronous**. The `structuredClone` passed to the
setter is discarded after the setter returns — do not hold on to it or mutate it later.

---

## Subscribing to changes

```ts
store.on(event, signal, handler)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `'update' \| 'change'` | Which event to subscribe to |
| `signal` | `AbortSignal` | Controls listener lifetime (required) |
| `handler` | `(event: CustomEvent<{ state: Readonly<TState> }>) => void` | Called on each event |

### `update` vs `change`

These two events mirror native `input` / `change` semantics:

| Event | When it fires |
|-------|---------------|
| `'update'` | On **every** call to `store.update()` |
| `'change'` | Only when the state **hash differs** from the previous value |

Use `'update'` when you need to react to every write attempt (e.g. resetting a
timeout, updating an animation frame). Use `'change'` when you only care that the
data structurally changed.

```ts
store.on('change', signal, ({ detail }) => {
  render(detail.state)
})

store.on('update', signal, () => {
  resetIdleTimer()
})
```

---

## Signal cleanup

The `signal` parameter is **not optional**. Always pass the component's `signal`
from `onMount`. This ensures the listener is removed automatically when the component
unmounts — no manual cleanup needed.

```ts
onMount({ signal }) {
  store.on('change', signal, ({ detail }) => {
    label.textContent = String(detail.state.count)
  })
}
```

Passing an already-aborted signal is a no-op — the listener is never registered.

---

## Custom hash exclusions — `hashedProperties()`

By default the entire state object is hashed when deciding whether to dispatch
`'change'`. If your state contains fields that change frequently but do not represent
meaningful data changes (e.g. cursor position, scroll offset, animation progress),
implement `hashedProperties()` on the state object to opt those fields out:

```ts
type EditorState = {
  content: string
  cursorPosition: number
  hashedProperties(): { content: string }
}

const editor = createStore<EditorState>({
  content: '',
  cursorPosition: 0,
  hashedProperties() {
    return { content: this.content }
  },
})
```

`'change'` now fires only when `content` differs — cursor movement does not trigger
it. `'update'` still fires on every write regardless.

---

## Inter-component example

A writer component owns the async work and calls `update` when it is ready. A reader
component subscribes and reflects the current state in the DOM. Neither component
knows about the other — they share only the store.

```ts
// shared-state.mts
import { createStore } from '@rooted/store'

export const resultStore = createStore<{ items: string[]; loading: boolean }>({
  items: [],
  loading: false,
})
```

```ts
// search-input.mts — writer
import { component } from '@rooted/components'
import { resultStore } from './shared-state.mts'

export const SearchInput = component({
  name: 'search-input',
  onMount({ append, element }) {
    append(element('button', {
      textContent: 'Search',
      on: {
        async click() {
          resultStore.update(s => { s.loading = true })

          const items = await fetch('/api/search').then(r => r.json()) as string[]

          resultStore.update(s => {
            s.items = items
            s.loading = false
          })
        },
      },
    }))
  },
})
```

```ts
// result-list.mts — reader
import { component } from '@rooted/components'
import { resultStore } from './shared-state.mts'

export const ResultList = component({
  name: 'result-list',
  onMount({ append, element, signal }) {
    const list = append(element('ul'))

    resultStore.on('change', signal, ({ detail }) => {
      list.replaceChildren(
        ...detail.state.items.map(item => {
          const li = document.createElement('li')
          li.textContent = item
          return li
        }),
      )
    })
  },
})
```
