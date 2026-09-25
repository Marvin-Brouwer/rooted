# [`@rooted/prerender`](https://www.npmjs.com/package/@rooted/prerender)

Build-time pre-rendering for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework. Not part of the public API.

> [!IMPORTANT]
> This package is still in alpha.

Boots the built app in [happy-dom](https://github.com/capricorn86/happy-dom) for each static route, in a worker thread of its own, and hands back the rendered document.
`@rooted/adapter` uses it to fill the static HTML files it writes. The DOM globals come from `@rooted/dom-globals` and only ever exist inside the worker.

Node only. App code should not depend on this package directly.
