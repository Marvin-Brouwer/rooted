# FAQ

Things people get stuck on. The fixes are short on purpose. If something needs more explanation, it lives in the relevant guide page.

## My styles are leaking into other components

Two likely causes.

**You are on an older browser.** Rooted uses CSS `@scope` for isolation. On browsers without `@scope` it falls back to nesting plus an attribute selector. The fallback works, but it isn't a hard boundary. A broad selector like `p { ... }` can match descendants of nested components. Use `:scope > p` if you need the boundary.

**You wrote a global rule by accident.** Anything in the component's `.css` file should reference `:scope` or a class. Bare element selectors without `:scope` do match across the boundary even on modern browsers, because `@scope` only constrains where rules apply, not what they match.

See [Styling](./styling.md) for the full layering.

## I see "Duplicate component name" in the console

```
[component] Duplicate component name detected: "card"
```

Every component must have a unique `name`. Two components with the same name share the same custom element, which means duplicate style injection and ambiguous DevTools output.

Use specific names:

```ts
component({ name: 'user-profile-card', /* ... */ })
component({ name: 'product-summary-card', /* ... */ })
```

The dev-mode warning logs the source location of every offender.

## Why `classes` and not `class`?

`element` and `append` write to DOM properties, not HTML attributes. The DOM property for `class` is `className`, but rooted exposes it as `classes` so it accepts a string, an array of strings, or a CSS module value all in one go.

```ts
element('p', { classes: [styles.message, 'highlight'] })
```

Other native attributes follow their DOM property names: `htmlFor`, `tabIndex`, `colSpan`, `readOnly`, and so on. TypeScript catches typos because the props object is typed against the element's interface.

## Can `onMount` be async?

Yes. The component is mounted immediately and the body runs after.

```ts
onMount: async ({ append, element, signal }) => {
  const data = await fetch('/api/data', { signal }).then(r => r.json())
  append(element('p', { textContent: data.message }))
}
```

Two things to know:

- The host element is in the DOM right away. If your `onMount` is slow, there is a brief moment with an empty host. Render a placeholder first if that matters.
- An error inside an async `onMount` becomes an unhandled rejection. In development it is also rendered into the DOM as a `<pre>` alert. Wrap with `try/catch` if you want to handle it yourself.

## `application(App)` throws "Application root not found"

Rooted looks for `#app` by default. Either add a `<div id="app"></div>` to the page, or pass a different selector or element:

```ts
application(App, { selector: '#root' })
application(App, { element: someExistingNode })
```

## A route URL works on first load but a click does nothing

Probably one of:

- The pattern is missing the trailing slash. Patterns must start and end with `/`. `/articles/${token('id', Number)}` won't work; the router logs a warning in dev and never matches.
- You linked with a plain `<a href="...">`. The router only intercepts clicks on `Link` components. Use `Link` from `@rooted/router`, or call `navigate()` from your own click handler.
- You set `target` on the `Link`. When `target` is anything other than `_self`, the click is not intercepted (the browser handles it natively).

## I want a back/forward button to restore scroll position

It does, by default. The router saves the scroll position before every push navigation and restores it on `popstate`. If you want to opt out:

```ts
create(Router, {
  scrollBehavior: { saveScrollBeforeNavigate: false },
})
```

If your app uses a custom scroll container instead of `window`, set `scrollBehavior.target` to that element.

## The page comes back blank when I hit the back button

Probably bfcache. When the browser uses the back/forward cache, the page is restored from a frozen snapshot, including pending DOM state. If your app holds onto something that doesn't survive the freeze (open WebSocket, in-flight `fetch`), check `event.persisted` in a `pageshow` listener and refresh the relevant state.

```ts
on('window', 'pageshow', (event) => {
  if (event.persisted) {
    // The page came back from bfcache. Refresh anything that went stale.
  }
})
```

## I want global state but not full reactivity

Use [`@rooted/store`](./state.md). It's a small synchronous container with `update` and `change` events. No proxies, no auto-tracking.

## Where does the router put my route?

The router replaces its own children with the resolved route element. Mount the router under whatever element you want the routed content inside (usually `<main>`).

```ts
element('main', {
  id: 'main-content',
  children: create(Router),
})
```

## Why does my component flicker on navigation?

By default the router does not run a transition. If both old and new content are mounted briefly during render, that's the layout reflow you see. Two options:

- Enable view transitions: `create(Router, { viewTransition: true })`. Browsers without `startViewTransition` ignore this and render unchanged.
- Use `scrollBehavior: { scrollToTop: 'on:end' }` so the scroll happens after the new content is in.

## I need to do something the docs don't cover

Read the source. The packages are small. Start in [`packages/components`](../../packages/components) for the component runtime, [`packages/router`](../../packages/router) for the router, and [`packages/store`](../../packages/store) for the store.

If you find a gap or a bug, open an issue.
