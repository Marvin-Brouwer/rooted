# Plan: Static Site Generation via happy-dom rendering

## Context

The `githubPagesAdapter` currently writes a copy of `index.html` (the SPA shell)
to every static route directory. All copies are identical — only the injected SEO
meta tags differ. Crawlers and first-paint both see an empty `<body>`.

This plan describes a **V1** approach to pre-rendering route content into those
static HTML files using `happy-dom`, so crawlers and AI agents see real structural
HTML without requiring a separate SSR server.

A **V2** exists conceptually (substitute `ElementFactory` with an HTML-string
builder + a distinct `on('mount')` registration phase) but is out of scope here.
V2 would replace only the internals of the pre-render step inside the adapter —
the surrounding orchestration described in this document carries over unchanged.

---

## Goals

- Each static route's `index.html` contains the rendered structural HTML of that
  route (headings, navigation, layout, static text).
- Data-fetching components render with empty/default state — that is acceptable.
- The browser still loads the JS bundle and re-runs the full app normally.
  No hydration contract is needed; the framework simply re-mounts on top.
- No changes to any public framework API.
- Only the `githubPagesAdapter` plugin is modified.

---

## Execution model

```
For each static route:

  1. Create a fresh happy-dom Window instance
  2. Install stubs (see "Stubbing" section below)
  3. Load the built JS bundle into the happy-dom context via vm.runInNewContext
     OR navigate between routes in a single long-lived instance (see "Isolation")
  4. Dispatch a navigation event / set location to the route's static path
     so the router initialises for that route
  5. await one macrotask tick  (setTimeout 0 — gives dynamic imports time to resolve)
  6. snapshot = document.body.innerHTML   ← capture BEFORE cancellation
  7. Signal the global cancellation token
  8. window.dispatchEvent(new Event('beforeunload'))
     ← triggers the framework's own teardown: router unmounts,
        signals unsubscribe, pending work stops
  9. Inject snapshot into the route's index.html
     (replace the empty app container element, e.g. <div id="app"></div>)
 10. Tear down / discard the happy-dom instance
```

### Why one macrotask tick

Dynamic imports in the built Vite bundle are pre-evaluated chunks — they resolve
in a microtask. However, the router's `onMount` may itself `await` after the
import (e.g. setting up subscriptions), so a full macrotask tick (`setTimeout 0`)
is the safe minimum budget. If testing reveals that the root layout or navigation
components need more time, this can be increased to a small fixed timeout (e.g.
`50 ms`) with no other changes.

### Snapshot timing

The snapshot **must** be taken before the cancellation token is signalled.
Cancellation triggers unmounting which may synchronously mutate the DOM
(removing nodes, clearing content). Once the snapshot string is captured it is
detached from the live DOM and unaffected by teardown.

---

## IO stubbing

### fetch — never-resolving promise

```ts
window.fetch = () => new Promise(() => { /* intentionally never resolves */ })
```

Returning a fake `200` response forces every caller to handle a response that
does not match its expected shape, producing null-dereference errors downstream.

A never-resolving promise suspends execution cleanly at the `await fetch(…)` line.
Everything built synchronously before that point is already in the DOM. When the
cancellation token fires the pending promise is simply abandoned — no errors, no
partial state. This works transparently for `fetch` inside `Promise.all`,
chained `.then()`, etc.

### Other async IO

Any other browser IO that does not make sense at build time (e.g. `XMLHttpRequest`,
`navigator.sendBeacon`, `Cache API`) should follow the same pattern: return a
never-resolving promise or a no-op, never a fake success value.

---

## Window / document stubbing

`happy-dom` covers the core DOM and most of `window`, but several APIs are absent
or incomplete depending on version. The strategy is two layers:

### Layer 1 — explicit stubs for known gaps

Set these before loading the bundle. Return values chosen to be harmless defaults:

```ts
window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
})

window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
}

window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
}

window.requestAnimationFrame = (cb) => setTimeout(cb, 0)
window.cancelAnimationFrame = (id) => clearTimeout(id)

window.scrollTo = () => {}
window.scroll = () => {}
window.scrollBy = () => {}
```

### Layer 2 — proxy catch-all for anything missed

Wraps the happy-dom window so any unknown property access that would throw
instead returns a no-op function:

```ts
const safeWindow = new Proxy(happyDomWindow, {
    get(target, prop) {
        const value = Reflect.get(target, prop)
        // Return as-is if it exists; otherwise return a silent no-op
        return value ?? (() => {})
    },
})
globalThis.window = safeWindow
globalThis.document = safeWindow.document
```

The explicit stubs (layer 1) handle the common cases with correct return shapes.
The proxy (layer 2) silently swallows anything not covered, preventing the render
from throwing on obscure or app-specific browser API usage.

---

## Module state and route isolation

The built JS bundle contains module-level singletons: the router instance, signal
stores, any global state. These persist for the lifetime of the module.

### Preferred approach — navigate between routes in one instance

Initialise happy-dom and load the bundle once. Between routes, call the router's
internal navigate function (or dispatch a `popstate` / `hashchange` event to
drive the router naturally). The router's own cleanup on navigation handles
signal resets and component unmounting.

**Pros:** simple, fast, no per-route VM overhead.  
**Cons:** relies on the router fully resetting state on navigation; any leaked
module-level state bleeds into the next route.

### Fallback — fresh VM context per route

If state bleeding is observed, use Node's `vm.runInNewContext` with a fresh
happy-dom window per route. Each route gets a clean module environment.

**Pros:** guaranteed isolation.  
**Cons:** the bundle is parsed and evaluated once per route — slower for large
bundles.

Start with the navigate approach. Switch to VM contexts only if rendering
produces incorrect output for later routes in the sequence.

---

## Integration point

All of this lives inside `githubPagesAdapter.closeBundle()`, after the existing
file-writing loop. The rough shape:

```ts
async closeBundle() {
    // ... existing: write .nojekyll, 404.html, per-route index.html copies ...

    if (!config.build.ssr) {
        const renderer = await createStaticRenderer(config)
        for (const route of manifestApi?.routes ?? []) {
            const metadata = route.getMetadata()
            const staticPath = metadata.staticRoute
            if (staticPath === false || segments.length === 0) continue

            const snapshot = await renderer.render(staticPath)
            if (!snapshot) continue

            const htmlPath = path.join(outputDirectory, ...segments, 'index.html')
            const html = await readFile(htmlPath, 'utf8')
            await writeFile(htmlPath, injectSnapshot(html, snapshot), 'utf8')
        }
        await renderer.dispose()
    }
}
```

`createStaticRenderer` encapsulates the happy-dom setup, stub installation, and
bundle loading. `renderer.render(path)` runs steps 4–8 of the execution model.
`injectSnapshot` replaces the app container's inner HTML.

---

## The app container

The adapter needs a stable element to inject the snapshot into. Options:

- **Convention:** look for `<div id="app">` or `<main>` in `index.html` — works
  without framework changes if the recipe-book already has this.
- **Explicit placeholder:** add a `data-rooted-app` attribute to the root mount
  element in the SPA template, giving the adapter a reliable selector.

The explicit placeholder is preferable — it survives template changes and makes
the injection point unambiguous.

---

## What renders well / what does not

| Content type | Expected outcome |
|---|---|
| Navigation, layout, headings | Renders fully |
| Static text content | Renders fully |
| Signal-driven content (initial value set) | Renders with initial/default value |
| Signal-driven content (no initial value) | Renders empty — acceptable |
| Data fetched via `fetch` | Does not render — fetch never resolves |
| Dynamic route parameters (e.g. `/recipe/:id/`) | N/A — only static routes are pre-rendered |

---

## Open questions

1. **Tick budget validation** — does the router + root layout fully mount within
   one macrotask tick, or is a small fixed timeout needed? Requires a test build
   with the recipe-book to confirm.

2. **App container selector** — confirm whether `index.html` already has a
   stable root element, or whether a `data-rooted-app` attribute needs to be
   added to the SPA template.

3. **happy-dom version** — confirm which version is already in the dependency
   graph (it may already be a transitive dep via Vitest). Avoid adding a
   duplicate with a different version.

4. **CSS-in-JS / tagged CSS** — if any component injects `<style>` nodes during
   mount, those will be captured in the snapshot. Confirm this does not conflict
   with the stylesheet links already in the shell `<head>`.

5. **Route ordering** — when using the navigate approach, routes should be
   rendered in definition order (depth-first from the manifest) to match the
   natural navigation flow. Confirm the manifest API exposes a stable order.

---

## Out of scope for V1

- Hydration — the browser re-runs the full app. No mismatch detection.
- Dynamic routes — only routes where `staticRoute !== false` are pre-rendered.
- Streaming / partial rendering — the snapshot is taken once after one tick.
- V2 `ElementFactory` substitution — separate design, no framework changes needed
  for V1.
