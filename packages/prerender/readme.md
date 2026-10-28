# [`@rooted/prerender`](https://www.npmjs.com/package/@rooted/prerender)

Build-time pre-rendering for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework. Not part of the public API.

> [!IMPORTANT]
> This package is in beta. Breaking changes can still happen between beta releases, so pin the exact version and read the release notes before you update.

Boots the built app in [happy-dom](https://github.com/capricorn86/happy-dom) for each static route, in a worker thread of its own, and hands back the rendered document.
`@rooted/adapter` uses it to fill the static HTML files it writes. The DOM globals come from `@rooted/dom-globals` and only ever exist inside the worker.

Node only. App code should not depend on this package directly.

## How the app is loaded

The bundle isn't imported as a file. Module hooks serve the build output from `http://localhost/<base>/`, a made-up origin nothing listens on, so `import.meta.url` looks like it would in a browser. That matters for Vite's preload helper, which resolves a lazy chunk's dependencies against it: imported as a file, every pre-rendered page got a set of `file:///` links ([#409](https://github.com/Marvin-Brouwer/rooted/issues/409)).
Before a page is written, `href` and `src` values on that origin are made root-relative, so the page works on whatever host serves it. Text the app writes, like `location.href` in a sentence, isn't touched.
The hooks use `module.registerHooks`, which is why this package needs Node 22.15.

Nothing is fetched while a page renders. A stylesheet or script the app adds counts as loaded, and its `load` event fires after `appendChild` returns, like in a browser.
happy-dom fires that event synchronously, so code that listens after appending (Vite's preload helper does) never hears it. The worker defers it, until happy-dom does that itself.
