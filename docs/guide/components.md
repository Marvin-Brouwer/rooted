# Components

A component in rooted is a plain object with a `name`, an optional `styles` field, and an `onMount` function. The runtime wraps it in a custom element when you mount it.

```ts
import { component } from '@rooted/components'

import styles from './example.css'

export const Example = component({
  name: 'example',
  styles,
  onMount({ append, element }) {
    append(element('p', { textContent: 'Hello' }))
  },
})
```

## The mount context

`onMount` receives a context object. Its methods build DOM under the component's host element.

| Method | What it does |
|--------|--------------|
| `append(...nodes)` | Append nodes (or other components, or strings) to the host. |
| `prepend(...nodes)` | Prepend to the host. |
| `insertBefore(node, ref)` | Insert a node before a given child. |
| `swap(newNode, oldChild)` | Replace a specific child. |
| `replace(...nodes)` | Replace all children. |
| `remove(...nodes)` | Remove specific children. |
| `element(tag, props)` | Build a typed HTML or SVG element. Does not mount it. |
| `create(Component, options?)` | Instantiate another component without appending it. |
| `signal` | An `AbortSignal` that aborts when the component unmounts. |
| `on` | Bind global event listeners that auto-clean on unmount. |

`append`, `prepend`, and `replace` accept three kinds of inputs:

- A string (becomes a text node).
- A `Node` produced by `element(...)`.
- A component value created by `component(...)` (mounted automatically).

This is the entire DOM API. There is no template language, no JSX, and no virtual DOM. The methods do exactly what their names say.

## Building elements

`element` is the typed factory. It returns an `HTMLElement` or `SVGElement` and does not mount it. Use it when you want to build a tree and append it in one shot, or when you need a reference to the node.

```ts
onMount({ append, element }) {
  const list = element('ul', {
    classes: styles.list,
    children: [
      element('li', { textContent: 'one' }),
      element('li', { textContent: 'two' }),
    ],
  })
  append(list)
}
```

The props object is typed against the DOM interface for the tag, so `tabIndex`, `className`, and friends are auto-completed and typo-proof.

For the difference between `element` and writing your own custom element from scratch, see [advanced/elements](../advanced/elements.md).

## Class names

Class names use the `classes` prop, not `class` or `className`. It accepts a string, a list of strings, or a CSS module value. CSS module imports give you the original class name, and the CSS loader ensures those class names only match inside this component's subtree.

```ts
element('p', { classes: [styles.message, 'highlight'] })
```

## Typed options

A component can take options. Set them as the second argument to `create` (or `append(MyComponent, options)`).

```ts
type GreetingOptions = { name: string }

export const Greeting = component<GreetingOptions>({
  name: 'greeting',
  onMount({ append, element, options }) {
    append(element('p', { textContent: `Hello, ${options.name}` }))
  },
})
```

```ts
append(Greeting, { name: 'world' })
```

The options type flows through. If you forget a required field, TypeScript complains.

Options are passed in once, at mount time. They do not update. If you need a value to change, use a [store](./state.md).

## Listeners and the signal

Every mount context has an `AbortSignal` that aborts when the component unmounts. Pass it to `addEventListener` and the listener is removed for free.

```ts
onMount({ append, element, signal }) {
  const button = append(element('button', { textContent: 'click me' }))
  button.addEventListener('click', () => console.log('clicked'), { signal })
}
```

For window or document listeners, use `on`:

```ts
onMount({ on }) {
  on('window', 'popstate', () => { /* ... */ })
  on('document', 'visibilitychange', () => { /* ... */ })
}
```

Both forms are removed automatically. You don't need to track them.

## Async `onMount`

`onMount` can be async. The component is mounted right away; the body runs after.

```ts
onMount: async ({ append, element, signal }) => {
  const data = await fetch('/api/data', { signal }).then(r => r.json())
  append(element('p', { textContent: data.message }))
}
```

Two things to know:

- The host element is in the DOM immediately. If your `onMount` is slow, there is a brief moment with an empty host. Render a placeholder first if that matters.
- Throwing inside an async `onMount` is caught as an unhandled rejection. In development, the error is also rendered into the DOM. Wrap calls in `try/catch` if you need to handle the error yourself.

## Dev mode help

A few small things rooted does in dev mode:

- Each component instance gets an `r-component="<name>"` attribute on its host element so you can spot it in DevTools.
- The host tag is the readable `<rooted-component>` instead of the production `<r-->`.
- Duplicate component names and other component issues log a warning with source locations.

In production these checks are dropped.
