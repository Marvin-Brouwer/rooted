# [`@rooted/elements`](https://www.npmjs.com/package/@rooted/elements)

Typed HTML and SVG element factory. Usable on its own, or as the DOM helper layer for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add @rooted/elements
```

```ts
import { element } from '@rooted/elements'

const card = element('div', {
  classes: 'card',
  children: [
    element('h2', { textContent: 'Title' }),
    element('p',  { textContent: 'Body'  }),
  ],
})
```

More in the [elements page](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/advanced/elements.md).
