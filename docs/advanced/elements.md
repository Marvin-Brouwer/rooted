# Elements

Most of the time you reach for `component()`. It is the high-level API and it covers nearly every case.

`RootedElement` is the lower-level option. It is an abstract base class that extends `HTMLElement`. Use it when you need any of these:

- A specific tag name (a custom element registered as `my-counter`, not the generic `<r-->` wrapper).
- Direct access to the host element's lifecycle without the mount context wrappers.
- Shadow DOM, attribute observation, or anything else the platform gives you on a custom element.

If none of those apply, use `component()`.

## Defining a custom element

```ts
import { RootedElement } from '@rooted/components/elements'

export class MyCounter extends RootedElement {
  static tagName = 'my-counter'

  protected onMount() {
    this.textContent = 'mounted'
  }

  protected onUnmount() {
    this.textContent = ''
  }
}

RootedElement.register(MyCounter)
```

`onMount` is the only abstract method. `onUnmount` defaults to a no-op. `register` validates the tag name (must contain a hyphen, must match `[a-z][a-z0-9\-]*`) and calls `customElements.define` for you.

## Lifecycle guards

Custom elements fire `connectedCallback` and `disconnectedCallback` whenever the browser re-parents them. That makes "did it actually leave the DOM?" surprisingly tricky.

`RootedElement` defers both callbacks with `queueMicrotask` and only fires them when the element's connection state has actually changed. You don't have to track this yourself.

```ts
class MyElement extends RootedElement {
  static tagName = 'my-element'

  protected onMount() {
    // Only fires when the element is genuinely connected.
    // Re-parenting from one DOM position to another does not trigger this.
  }

  protected onUnmount() {
    // Only fires when the element is genuinely removed.
  }
}
```

## Using a custom element from a component

`RootedElement` subclasses are first-class with `create` and `append`:

```ts
import { component } from '@rooted/components'

import { MyCounter } from './my-counter.mts'

export const Page = component({
  name: 'page',
  onMount({ append, create }) {
    append(create(MyCounter, {}))
  },
})
```

The second argument is properties. Anything writable on the element class is type-checked.

## When `component()` wins

`component()` gives you:

- Auto-cleanup of listeners via the mount context's `signal`.
- Style scoping via the `styles` field.
- The `element`, `create`, `append`, and friends helpers.
- A meaningful tag in DevTools (`r-component="recipe"`).

A bare `RootedElement` gives you none of these for free. You write the plumbing yourself. That is the trade.

## Shadow DOM

Rooted does not put your component in a shadow root. Styles are scoped through attribute-selector prefixing, not Shadow DOM, so the rest of the page can still reach the element with normal selectors.

If you specifically want a shadow root (for slot composition, or to isolate from inherited form-state propagation), reach for `RootedElement` and call `attachShadow` in `onMount`:

```ts
class MyShell extends RootedElement {
  static tagName = 'my-shell'

  protected onMount() {
    const root = this.attachShadow({ mode: 'open' })
    root.innerHTML = '<slot></slot>'
  }
}
```

This is rarely the right answer, but it is here when you need it.
