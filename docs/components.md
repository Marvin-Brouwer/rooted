# Components

The component system lives in `@rooted/components`. It gives you a type-safe,
lifecycle-aware way to define and compose custom elements without touching the
lower-level Custom Elements API directly.

---

## Contents

- [Defining a component](#defining-a-component)
  - [name](#name)
  - [styles](#styles)
  - [onMount](#onmount)
- [Mount context](#mount-context)
  - [append](#append)
  - [create](#create)
  - [signal](#signal)
  - [options](#options)
- [Typed options](#typed-options)
- [Bootstrapping — `application()`](#bootstrapping--application)
- [Development mode](#development-mode)
- [Full example](#full-example)
  - [append](#append)
  - [create](#create)
  - [signal](#signal)
  - [options](#options)
- [Typed options](#typed-options)
- [Bootstrapping — `application()`](#bootstrapping--application)
- [Full example](#full-example)

---

## Defining a component

Import `component` from `@rooted/components` and pass a `ComponentConstructor`
descriptor:

```ts
import { component } from '@rooted/components'

export const MyComponent = component({
  name: 'my-component',
  onMount({ append }) {
    append('p', { textContent: 'Hello!' })
  },
})
```

The factory attaches a brand symbol, computes a stable CSS scope ID via FNV-1a
hashing, and returns a frozen `Component` object. In development it also records
the source file location to improve error messages.

### `name`

```ts
name: string
```

A lowercase, HTML-valid identifier for the component (`[a-z][a-z0-9\-]*`).

- Must be unique across the application — duplicate names cause duplicate style
  injection and a console warning in development.
- Does **not** need to contain a hyphen (unlike native custom-element tag names).

### `styles`

```ts
styles?: string
```

A CSS string scoped to this component. Import it from a `.css` file — Vite
resolves CSS imports to their string content:

```ts
import styles from './card.css'
```

Rooted wraps the rules in an `@scope` block (Chrome 118+, Firefox 128+,
Safari 17.4+) so styles cannot leak out to sibling or parent elements.
A CSS nesting fallback is used on older browsers.

```ts
import styles from './card.css'
import { component } from '@rooted/components'

export const Card = component({
  name: 'card',
  styles,
  onMount({ append }) {
    append('h2', { textContent: 'Card title' })
    append('p',  { textContent: 'Card body'  })
  },
})
```

Styles are injected once per document per component, even if the component is
mounted multiple times.

For guidance on structuring the app-wide theme and keeping component CSS focused,
see the [styling guide](./styling.md).

### `onMount`

```ts
onMount(context: ComponentContext<TOptions>): void | Promise<void>
```

Called when the component element is connected to the document. Perform all DOM
setup here: create child nodes, attach event listeners, start subscriptions.

The function receives a [`ComponentContext`](#mount-context) object. You can
destructure it or use `this` — both work:

```ts
onMount({ append, signal }) { /* destructured */ }
// or
onMount(function(ctx) { ctx.append(...) })
```

`async` is supported; rooted will not await the promise but errors will surface
as unhandled rejections in the normal way.

---

## Mount context

### `append`

```ts
append: typeof create
```

Same signature as [`create`](#create), but immediately appends the new node to
the component's host element and returns it.

```ts
onMount({ append }) {
  const header = append('header', {
    children: append('h1', { textContent: 'Hello' }),
  })
}
```

### `create`

```ts
// Overloads (same as the exported create() function):
create(component: Component): GenericComponent
create<TOptions>(component: Component<TOptions>, options: TOptions): GenericComponent
create(tagName: keyof HTMLElementTagNameMap, props): HTMLElement
create(ElementClass: RootedElementClass, props): RootedElement
```

Creates a DOM node without appending it. Useful when you need to compose a
subtree before inserting it:

```ts
onMount({ append, create }) {
  append('ul', {
    children: ['Alpha', 'Beta', 'Gamma'].map(text =>
      create('li', { textContent: text })
    ),
  })
}
```

**DOM property names** — properties are applied via `Object.assign`, so use DOM
names, not HTML attribute names:

| HTML attribute | DOM property |
|---------------|--------------|
| `class`       | `className`  |
| `for`         | `htmlFor`    |
| `readonly`    | `readOnly`   |
| `tabindex`    | `tabIndex`   |

**`children`** — accepts a single `Node` or an array of `Node`s; they are
appended in order.

### `signal`

```ts
signal: AbortSignal
```

An `AbortSignal` that fires when the component is unmounted or the page unloads.
Pass it to `addEventListener` and `fetch` to clean up automatically:

```ts
onMount({ append, signal }) {
  const button = append('button', { textContent: 'Click me' })
  button.addEventListener('click', handler, { signal })
  //                                       ^^^^^^ removed on unmount

  const controller = new AbortController()
  signal.addEventListener('abort', () => controller.abort())
  fetch('/api/data', { signal: controller.signal })
}
```

### `options`

When a component declares a `TOptions` type parameter, `context.options` is
available as a read-only snapshot of the values passed by the parent:

```ts
export type CounterOptions = { initialValue: number }

export const Counter = component<CounterOptions>({
  name: 'counter',
  onMount({ append, options }) {
    let count = options.initialValue // typed as number
    append('span', { textContent: String(count) })
  },
})

// Pass options from a parent component:
append(Counter, { initialValue: 5 })
```

---

## Typed options

Declare an options type parameter on `component<TOptions>` to make the
component require those values whenever it is created:

```ts
export type UserCardOptions = {
  userId: number
  displayName: string
}

export const UserCard = component<UserCardOptions>({
  name: 'user-card',
  onMount({ append, options }) {
    append('h3', { textContent: options.displayName })
    append('small', { textContent: `#${options.userId}` })
  },
})
```

A component that takes options **cannot** be used as a route gate unless all
options beyond `gate` are optional. See the [routing guide](./routing.md) for
details.

---

## Bootstrapping — `application()`

Import `application` from `@rooted/components/application` to mount the root
component into the page.

```ts
import { application } from '@rooted/components/application'
```

### Default — mount to `#app`

```ts
application(Application)
```

Expects `<div id="app"></div>` in the HTML. The element is replaced (not
appended to) by the component.

### Custom CSS selector

```ts
application(Application, { selector: '#root' })
application(Application, { selector: 'main' })
```

### Existing element reference

```ts
const rootElement = document.getElementById('my-root')!
application(Application, { element: rootElement })
```

Throws `[rooted] Application root not found in document.` if the selector
matches nothing or the element is `null`.

---

## Development mode

When Vite's `import.meta.env.DEV` is `true`, rooted activates several
developer-experience features. All of these are tree-shaken in production
builds.

### Human-readable element names

The internal wrapper element uses the tag name `<generic-component>` in
development and `<r-->` in production. This makes the DOM tree far easier to
read in the browser's Elements panel.

### `data-component` attribute

Each mounted component element gets a `data-component` attribute set to the
component's `name`:

```html
<!-- development DOM -->
<generic-component data-component="user-card" r1a2b3c4d>
  <div class="card">...</div>
</generic-component>
```

### Source location tracking

When `component()` is called, the call stack is captured and the source file
path and line number are stored on the constructor (under the `definedAt`
symbol). In DevTools you can inspect the element and read `element.definedAt` to
find exactly where the component was defined.

### Component name validation and duplicate detection

`component()` validates that the `name` is a legal HTML attribute name, throwing
immediately if it is not. It also checks for duplicate names across the
application and emits a `console.warn` with the source locations of all
conflicting components.

### Mount errors in the DOM

If `onMount` throws or its promise rejects, rooted logs a `console.error` and
additionally renders the error message as a `<pre role="alert">` inside the
component element. This makes failures visible even when the console is closed.

### Router warnings

The router dev helper emits `console.warn` for:

- **Duplicate gate** — the same gate object registered under more than one key.
- **Exact gate without children** — a `.exact` gate with no `.append()` child
  gates; such a gate can never render.
- **Exact gate at its own URL** — a `.exact` gate that matches the current path
  but has no subroute to satisfy the "must have additional segments" rule.

---

## Full example

```ts
// src/counter.mts
import styles from './counter.css'
import { component } from '@rooted/components'

export const Counter = component({
  name: 'counter',
  styles,
  onMount({ append, signal }) {
    let count = 0
    const display = append('output', { textContent: '0' })
    const decrement = append('button', { textContent: '−' })
    const increment = append('button', { textContent: '+' })

    const update = () => { display.textContent = String(count) }

    decrement.addEventListener('click', () => { count--; update() }, { signal })
    increment.addEventListener('click', () => { count++; update() }, { signal })
  },
})
```

```ts
// src/main.mts
import { application } from '@rooted/components/application'
import { component } from '@rooted/components'
import { Counter } from './counter.mts'

application(component({
  name: 'app',
  onMount({ append }) {
    append('h1', { textContent: 'Counter demo' })
    append(Counter)
    append(Counter) // each instance is independent
  },
}))
```
