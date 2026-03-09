# Custom elements — `RootedElement`

`RootedElement` is an abstract base class for defining reusable, low-level native
custom elements. Use it when you need direct control over a custom element's tag
name, attributes, or lifecycle — situations where the higher-level
[`component()`](./components.md) abstraction is not the right fit.

Import from `@rooted/components/elements`:

```ts
import { RootedElement } from '@rooted/components/elements'
```

---

## Contents

- [Defining an element](#defining-an-element)
- [Registering an element](#registering-an-element)
- [Lifecycle hooks](#lifecycle-hooks)
  - [onMount](#onmount)
  - [onUnmount](#onunmount)
- [Using elements inside components](#using-elements-inside-components)
- [Tag name rules](#tag-name-rules)
- [Comparison with `component()`](#comparison-with-component)

---

## Defining an element

Extend `RootedElement` and declare a `static tagName`:

```ts
import { RootedElement } from '@rooted/components/elements'

export class ProgressRing extends RootedElement {
  static tagName = 'progress-ring'

  // writable properties become typed props in create()
  value = 0

  protected onMount() {
    this.render()
  }

  protected onUnmount() {
    // clean up if needed
  }

  private render() {
    this.textContent = `${this.value}%`
  }
}
```

---

## Registering an element

Call `RootedElement.register()` once, at module level, after the class
definition:

```ts
RootedElement.register(ProgressRing)
// equivalent to: customElements.define('progress-ring', ProgressRing)
```

`register()` validates the tag name before calling `customElements.define` and
throws a descriptive error if the name is invalid (see [Tag name rules](#tag-name-rules)).

---

## Lifecycle hooks

Both hooks are guarded against spurious calls caused by DOM re-parenting: they
are deferred with `queueMicrotask` and only fire when the element's connection
state has truly changed.

### `onMount`

```ts
protected abstract onMount(): void
```

Called once after the element is connected to the document. Perform DOM setup
here — create child nodes, attach event listeners, start timers.

### `onUnmount`

```ts
protected onUnmount(): void
```

Called once after the element is disconnected. Override to release resources
(event listeners, subscriptions, timers). The default implementation is a no-op.

```ts
export class LiveClock extends RootedElement {
  static tagName = 'live-clock'

  private intervalId?: ReturnType<typeof setInterval>

  protected onMount() {
    this.tick()
    this.intervalId = setInterval(() => this.tick(), 1000)
  }

  protected onUnmount() {
    clearInterval(this.intervalId)
  }

  private tick() {
    this.textContent = new Date().toLocaleTimeString()
  }
}

RootedElement.register(LiveClock)
```

---

## Using elements inside components

Pass the element class (not an instance) to `create()` or `append()` from a
[component mount context](./components.md#mount-context):

```ts
import { component } from '@rooted/components'
import { ProgressRing } from './progress-ring.mts'

export const Dashboard = component({
  name: 'dashboard',
  onMount({ append }) {
    append(ProgressRing, { value: 75 })
    //                    ^^^^^^^^^^
    // TypeScript infers writable props from ProgressRing's instance type
  },
})
```

The `children` prop (accepting a `Node` or `Node[]`) is available alongside any
writable instance properties. Inherited `RootedElement` properties are excluded
from the prop type automatically.

---

## Tag name rules

Custom element tag names must:

1. Match `[a-z][a-z0-9\-]*` (lowercase letters, digits, hyphens only).
2. Contain **at least one hyphen** — this is required by the HTML spec to
   distinguish custom elements from built-in elements.

`RootedElement.register()` enforces both rules and throws a descriptive
`Error` if either is violated:

```ts
RootedElement.register(BadElement)
// Error: Invalid tagName "badelement". Custom elements must contain a hyphen.
```

---

## Comparison with `component()`

| Feature | `component()` | `RootedElement` |
|---------|--------------|-----------------|
| Scoped CSS | ✅ via `styles` field | ❌ use plain CSS or Shadow DOM |
| Typed options from parent | ✅ `TOptions` generic | ✅ writable instance props |
| Abort signal for cleanup | ✅ `ctx.signal` | ❌ manage manually |
| Custom tag name | ❌ uses internal `r--` wrapper | ✅ `static tagName` |
| Extends `HTMLElement` directly | ❌ | ✅ |
| Can observe attributes | ❌ | ✅ `attributeChangedCallback` etc. |

Use `component()` for most application logic.
Use `RootedElement` when you need a reusable element with a known HTML tag name,
attribute observation, or Shadow DOM.
