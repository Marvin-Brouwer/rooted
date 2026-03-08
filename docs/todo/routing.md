# Routing

Inclusive routing system — multiple gates can be active simultaneously based on the current URL.

## Concepts

- **`createRoute`** — tagged template that defines a URL pattern with typed params (`_gates.mts`)
- **`gate`** — a component bound to a route; shown when the route matches, hidden otherwise
- **`router`** — top-level coordinator that registers all gates and handles navigation
- **`_gates.mts`** — per-feature file exporting named route definitions

## Planned API

```ts
// _gates.mts
export const main = createRoute`/example/${{ id: Number }}/`
export const subRoute = main.appendRoute`/subroute/`

// example.mts
export const exampleGate = paths.main(Example)

// application.mts / main.mts
router(import.meta, './*/_gates.mts', {
    home: homeGate,
    notFound: notFoundGate,
    routes: manualRoutesArray   // optional manual override / additions
})

// Alternative signature (manual routes as second positional arg)
router(import.meta, './*/_gates.mts', {
    home: homeGate,
    notFound: notFoundGate,
}, manualRoutesArray)
```

Both signatures should work. Manual routes and plugin-discovered routes should be merged — useful when the user wants the plugin for auto-discovery but needs to add routes programmatically.

---

## Build plan

### Phase 1 — `createRoute` (no plugin needed)

- [ ] Implement `createRoute` as a tagged template function
- [ ] Parse template string parts and interpolated `{ name: Type }` objects into a route pattern
- [ ] Build URL matcher from the pattern (regex or segment-based)
- [ ] Infer typed params from interpolated objects (TypeScript template literal types)
- [ ] Implement `appendRoute` on the returned route object for sub-routes (appends path segment, inherits parent params)
- [ ] Export `RouteParameters<T>` utility type

### Phase 2 — gate binding

- [ ] Implement `route(Component)` — returns a gate: a component that renders when the route matches
- [ ] Gate subscribes to navigation events and shows/hides (or mounts/unmounts) accordingly
- [ ] Pass matched params as `route` prop to the component
- [ ] Decide: CSS hide vs DOM unmount on mismatch (unmount is cleaner, hide is faster for frequent toggling)

### Phase 3 — `router` (manual routes, no plugin)

- [ ] Implement `router(import.meta, glob, options, manualRoutes?)`
- [ ] Without the plugin the glob argument is ignored at runtime — manual routes are the source of truth
- [ ] Accept both `options.routes` and the positional `manualRoutes` arg; merge them
- [ ] Set up history/popstate listener for navigation
- [ ] On navigation, evaluate all registered gates against the new URL
- [ ] Wire up `home` gate to `'/'`
- [ ] Wire up `notFound` gate — shown when no other gate matches

### Phase 4 — Vite plugin

- [ ] Plugin globs `_gates.mts` files matching the pattern at build time
- [ ] Generates an artifact (virtual module) exporting a flat array of all discovered routes
- [ ] `router()` imports the virtual module so the glob arg becomes real at build time
- [ ] Merge plugin-discovered routes with any manually provided routes
- [ ] Plugin should be optional — `router()` works without it using manual routes only

### Phase 5 — 404 behaviour

- [ ] 404 only makes sense when the router has a complete picture of all routes (i.e. plugin is active)
- [ ] Without the plugin, `notFound` gate is still shown when no gate matches — best-effort
- [ ] With the plugin, `notFound` is shown only when the URL matches no discovered or manual route

---

## Open questions

- Show/hide vs mount/unmount for inactive gates?
- Should `router` be a component, a function call, or both?
- Navigation: intercept `<a>` clicks globally, or require explicit `navigate()` calls?
- Should params be reactive (signal/observable) or passed once on mount?
