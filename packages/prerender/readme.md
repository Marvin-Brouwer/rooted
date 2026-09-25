# [`@rooted/prerender`](https://www.npmjs.com/package/@rooted/prerender)

Build-time pre-rendering for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework. Not part of the public API.

> [!IMPORTANT]
> This package is still in alpha.

Boots the built app in [happy-dom](https://github.com/capricorn86/happy-dom), navigates it to each static route and hands back the rendered body.
`@rooted/adapter` uses it to fill the static HTML files it writes. The DOM globals come from `@rooted/dom-globals` and are gone again once rendering is done.

Node only. App code should not depend on this package directly.
