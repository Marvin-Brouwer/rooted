# [`@rooted/dom-globals`](https://www.npmjs.com/package/@rooted/dom-globals)

Build-time plumbing for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework. Not part of the public API.

> [!IMPORTANT]
> This package is still in alpha.

Puts a [happy-dom](https://github.com/capricorn86/happy-dom) window onto `globalThis` in plain Node, and takes it off again.
`@rooted/router` uses it to evaluate route files while generating the route manifest, `@rooted/prerender` uses it to boot the built app for pre-rendering.

Node only. App code should not depend on this package directly.
