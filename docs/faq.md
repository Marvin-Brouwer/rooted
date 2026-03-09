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

### TypeScript error: a gate's component requires options beyond `gate`

```
Type 'BoundGateDefinition<..., ...>' is not assignable to type 'never'
```

The router enforces that gate components can only require options that come
from the URL (i.e. the `gate` property). If your component declares mandatory
options that the router cannot provide, TypeScript will refuse it.

**Fix A — make the extra options optional:**

```ts
// ❌ mandatory options that the router can't supply
type ArticleOptions = {
  gate: GateParameters<typeof ArticleGate>
  theme: string  // router doesn't know about this
}

// ✅ optional — the component provides its own default
type ArticleOptions = {
  gate: GateParameters<typeof ArticleGate>
  theme?: string
}
```

**Fix B — pass extra options from a parent gate using `.append()`:**

If the options genuinely need to come from outside, use a parent gate that
provides the options and a child gate for the URL portion.

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

1. **Trailing slashes** — URL patterns are matched literally. If your gate
   pattern ends with `/`, the URL must too:

   ```ts
   gate(Article)`/articles/${token('id', Number)}/`
   //                                             ↑ trailing slash required
   ```

2. **`exact` flag** — a gate marked `.exact` will not render when the URL
   matches its own pattern exactly. It only renders when there is an additional
   path segment. If you navigate to `/articles/123/` with an exact gate, you'll
   see `notFound`. Add a child gate for the base path.

3. **Navigation method** — gates listen to `popstate`. This event fires when
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
   dispatch it manually, or use a link with `<a href="...">` (which browsers
   handle automatically for same-origin navigations without a full reload when
   using History API).

4. **Gate not registered** — make sure the gate is included in the `router()`
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

### A gate marked `.exact` never renders

A `.exact` gate renders only when the URL has **additional path segments beyond
its own pattern**. In development a console warning fires when an exact gate is
visited without a child path:

```
[rooted/gate] "article-gate" is marked .exact but the current path
"/articles/123/" has no subroute — it will not render
```

Also check: if the gate has no child gates appended to it at all, a warning
fires at startup:

```
[rooted/router] "article-gate" is marked .exact but has no child gates
appended to it — it will never render
```

Make sure you have created at least one child gate with `.append()` and
registered it in the router.

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
export * from './articles/_gates.mts'
export * from './users/_gates.mts'
```

---

### Do I need TypeScript?

No — rooted is plain JavaScript-compatible. However, the library is written in
TypeScript and ships type declarations, and most of its ergonomics (typed gate
parameters, option type inference, DOM property types in `create()`) only appear
when TypeScript is used. JavaScript usage is untested and unsupported.
