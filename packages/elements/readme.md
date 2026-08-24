# [`@rooted/elements`](https://www.npmjs.com/package/@rooted/elements)

Typed HTML and SVG element factory. Usable on its own, or as the DOM helper layer for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add @rooted/elements
```

The package ships a factory builder rather than a ready-made `element`. You hand it the function that creates nodes and an `AbortSignal`, and you get the typed `element(...)` back. Inside a rooted component that's already done for you, `element` is on the mount context.

```ts
import { createElementFactory, type ElementCreator } from '@rooted/elements'

const controller = new AbortController()
const createElement: ElementCreator = (tag, ns) => ns
  ? document.createElementNS(ns, tag)
  : document.createElement(tag)

const element = createElementFactory(createElement, controller.signal)

const card = element('div', {
  classes: 'card',
  children: [
    element('h2', {
      textContent: 'Title',
    }),
    element('p', {
      textContent: 'Body',
    }),
  ],
})
```

The `ns` branch is what makes `element('svg', ...)` and the `svg:*` tags work, so don't drop it. Aborting the controller removes every listener registered through the `on` prop, which is how components clean up on unmount.

More in the [elements page](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/advanced/elements.md).
