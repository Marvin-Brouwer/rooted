# FAQ

Common questions and troubleshooting tips.

---

## Components

### My styles are affecting elements outside the component

Rooted scopes styles using `@scope` (Chrome 118+, Firefox 128+, Safari 17.4+).
On older browsers it falls back to CSS nesting, which uses a descendant
attribute selector (`[scope-id] rule { ... }`) rather than a hard scope
boundary.

**Possible causes and fixes:**

1. **Older browser** — the CSS nesting fallback is subject to normal cascade and
   specificity rules; styles *can* match descendants of sibling components if
   selectors are broad enough. Use precise selectors (`:scope > p` instead of
   `p`) to minimise leakage.

2. **`:scope` pseudo-class** — inside a component's styles, `:scope`
   refers to the component's host element (`<r-->`). Use it to style the host
   or to scope rules more precisely:

   ```css
   /* applies only to direct children */
   :scope > p { margin: 0; }
   ```

3. **Global styles** — styles added outside of the `styles` field (e.g. a
   `<link>` stylesheet) are not scoped by rooted. Keep component styles in
   their own `.css` file and import them via the `styles` field.

---

### I see a "duplicate component name" warning in the console

```
[component] Duplicate component name detected: "card"
```

Every component must have a **unique `name`** across the entire application.
Duplicate names:

- Cause duplicate `<style>` injections (one per unique component, so styles
  would conflict or double-apply).
- Make it impossible to distinguish components in DevTools.

**Fix:** Use specific, namespaced names:

```ts
// ❌ too generic
component({ name: 'card', ... })

// ✅ specific and unique
component({ name: 'user-profile-card', ... })
component({ name: 'product-summary-card', ... })
```

The warning also logs a `listAll` hint in the console that shows the source
locations of all components sharing the name (in development).

---

### Why do I have to use `className` instead of `class`?

`create()` sets properties using `Object.assign(element, props)`. This writes
to DOM object properties, not HTML attributes. The DOM property for the `class`
attribute is `className`, just as in `document.getElementById('foo').className`.

Common mappings:

| HTML attribute | DOM property |
|---------------|--------------|
| `class`       | `className`  |
| `for`         | `htmlFor`    |
| `readonly`    | `readOnly`   |
| `tabindex`    | `tabIndex`   |
| `colspan`     | `colSpan`    |
| `rowspan`     | `rowSpan`    |
| `maxlength`   | `maxLength`  |

TypeScript will catch most of these at compile time because `create()` is typed
against the element's DOM interface.

---

### My component's `onMount` is async — is that supported?

Yes. `onMount` may return a `Promise`:

```ts
onMount: async ({ append, signal }) => {
  const data = await fetch('/api/data', { signal }).then(response => response.json())
  append('p', { textContent: data.message })
}
```

**Caveats:**

- Rooted does not `await` the returned promise. The component element is
  connected and visible immediately; content appears asynchronously.
- Errors in the async body become unhandled promise rejections (logged to the
  console and, in development, rendered in the DOM as a `<pre>` alert). Wrap
  critical logic in `try/catch`:

  ```ts
  onMount: async ({ append }) => {
    try {
      const data = await fetchData()
      append('p', { textContent: data.message })
    } catch (error) {
      append('p', { textContent: 'Failed to load.' })
    }
  }
  ```

---

### `[rooted] Application root not found in document`

`application()` could not find the root element. Possible causes:

1. **Missing element** — the default selector is `#app`. Make sure your HTML
   has `<div id="app"></div>` before the script runs.

2. **Script runs too early** — if the script tag is in `<head>` without
   `defer` or `type="module"`, the DOM may not be ready:

   ```html
   <!-- ✅ module scripts are deferred automatically -->
   <script type="module" src="/src/main.mts"></script>
   ```

3. **Wrong selector** — pass a custom selector or element reference:

   ```ts
   application(Application, { selector: '#my-root' })
   // or
   application(Application, { element: document.querySelector('main')! })
   ```

---

## Routing

### My route never matches / always shows `notFound`

**Checklist:**

1. **Leading and trailing slashes** — patterns must start and end with `/`:

   ```ts
   // ❌ missing trailing slash → pattern validation error → never matches
   route`/articles/${token('id', Number)}`

   // ✅ correct
   route`/articles/${token('id', Number)}/`
   ```

2. **`resolve` returning `undefined`** — if your `resolve` function returns
   `undefined`, the route is suppressed and treated as a non-match. Check that
   async data lookups resolve correctly and only return `undefined` when the
   resource genuinely doesn't exist.

3. **`await route.match()`** — `match()` is async. Forgetting `await` means
   you're comparing a `Promise` against `true`, which always fails:

   ```ts
   // ❌ always false
   if (MyRoute.match({ target: '/articles/1/' }).success) { ... }

   // ✅ correct
   const result = await MyRoute.match({ target: '/articles/1/' })
   if (result.success) { ... }
   ```

4. **Navigation method** — gates listen to `popstate`. This event fires when
   `history.pushState` or `history.replaceState` is used. Direct assignment to
   `location.href` triggers a full page reload instead:

   ```ts
   // ❌ full reload, popstate does NOT fire
   location.href = '/articles/123/'

   // ✅ SPA navigation, popstate fires
   history.pushState({}, '', '/articles/123/')
   dispatchEvent(new PopStateEvent('popstate'))
   ```

   Note: `history.pushState` alone does not dispatch `popstate` — you must
   dispatch it manually, or use `navigate()` from `@rooted/router` which does
   this automatically.

5. **Route not registered** — make sure the route is included in the `router()`
   config or in an aggregated `_routes.g.mts` file.

---

### After navigating back, my components re-initialise

**With the back-forward cache (bfcache) enabled** — components do *not*
re-initialise on bfcache restores because `pageSignal` only fires on a genuine
unload (`event.persisted === false`). If you are seeing re-initialisation, the
bfcache is likely disabled for your page (due to `unload` listeners,
`Cache-Control: no-store`, or other disqualifiers).

**Without bfcache** — a back navigation causes a full page reload, and all
components initialise fresh. This is expected browser behaviour.

---

## General

### Can I use rooted without Vite?

The core packages (`@rooted/components`, `@rooted/router`) have no build-tool
dependency. They are plain ESM modules that work with any bundler.

The `@rooted/router/manifest` export (the `generateRouteManifest` Vite plugin)
requires Vite ≥ 6. If you use a different bundler, write the aggregator file
manually or with a custom build script:

```ts
// src/_routes.g.mts — written by hand or a custom script
export * from './articles/_routes.mts'
export * from './users/_routes.mts'
```

---

### Do I need TypeScript?

No — rooted is plain JavaScript-compatible. However, the library is written in
TypeScript and ships type declarations, and most of its ergonomics (typed gate
parameters, option type inference, DOM property types in `create()`) only appear
when TypeScript is used. JavaScript usage is untested and unsupported.
