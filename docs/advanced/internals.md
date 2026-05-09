# Internals

What rooted does behind the curtain. None of this is required reading to use the framework. It's here for the times when you're chasing a weird bug, reading DevTools and wondering why the host element looks the way it does, or thinking about contributing.

## The component wrapper

When you call `create(MyComponent)`, rooted produces a `GenericComponent` element and stores the component constructor and options inside a private `WeakMap`. The constructor and options are not properties of the element itself.

The wrapper element is:

- `<rooted-component>` in development.
- `<r-->` in production.

The shorter name in production saves a few bytes per component instance. The verbose name in development shows up in DevTools breakpoints, error stacks, and the elements panel without needing a lookup table.

In dev mode the wrapper also gets `r-component="<name>"` so you can read the component name straight off the host.

## Why `display: contents`

Custom elements default to `display: inline`. That breaks layout for most components, because the wrapper sits between a parent flex/grid container and the actual content.

Rooted sets the wrapper to `display: contents`. The wrapper is inert for layout: its children participate directly in the parent's flex or grid context as if the wrapper weren't there.

If a stylesheet manages to override it (a bare `:where(rooted-component)` or similar), `applyContentStyleFallback` re-applies `display: contents` inline with `!important`. Belt and braces.

## Style scoping

Each component's CSS goes through the rooted CSS loader plugin at build time. The plugin produces a stable scope ID for the file (a seeded FNV-1a hash of the file contents) and emits two outputs: a CSS module that maps your local class names to scoped names, and a stylesheet wrapped in either `@scope` or CSS nesting.

At runtime the wrapper element gets `r="<scope-id>"` so the matching selectors apply to its subtree only.

The two output forms exist because `@scope` only landed in browsers in
2024. On older browsers the output uses CSS nesting plus the attribute
selector to approximate the same boundary. The fallback is good enough for almost everything but it isn't a hard wall the way `@scope` is. A broad selector can still match descendants of nested components. Use `:scope > p` if you need the boundary to hold.

## The signal lifecycle

Every component has its own `AbortController`. The controller's signal is what you pull off the mount context as `signal`. Every listener you register with that signal cleans up when the component unmounts, with no extra bookkeeping.

There's also a single page-level signal, `pageSignal`, that aborts on the `pagehide` event but only when the page is permanently unloaded (not when it goes into bfcache). Every component's controller is chained to it. So:

- Component unmounts. The component's controller aborts. Its listeners go away. The page signal stays alive.
- Page is destroyed. The page signal aborts. Every component controller aborts. Every listener goes away.
- Page enters bfcache. Nothing aborts. When the user comes back, the page is restored and listeners are still there.

That last point matters. If you want to invalidate state on bfcache restore, listen for the `pageshow` event and check `event.persisted`.

## Why a `WeakMap` for component data

When `create()` builds the wrapper, it stores `{ component, options }` in a `WeakMap` keyed by the wrapper element. The data is never set as a property of the element.

Two reasons:

1. **DevTools console.** Properties on a custom element show up in the browser's elements panel and are reachable from the console. Rooted keeps user-supplied options out of that view by default. In dev mode the data is also exposed as a property so you can poke it; in production the only path is the `WeakMap`.
2. **Garbage collection.** The map's keys are weak. When the wrapper element is removed and not referenced anywhere else, the entry is garbage-collected with it.

## Best-match routing

The router evaluates every registered route in parallel on every navigation. The candidate set goes through three filters:

1. Drop routes whose pattern doesn't match the URL.
2. For routes that match, run their `resolve`. If `resolve` returns `undefined`, mark the path as suppressed at this length.
3. Among matched routes, pick the one whose pattern consumes the most characters. On a tie, the route without a wildcard wins.

If any matched route is shorter than a suppressed-at-length signal, the router treats the URL as unmatched and renders `notFound`. This is why returning `undefined` from `resolve` is safe to use as a "not found" branch on a dynamic route: it does not leak into a parent route's match.

The selected route's element is cached by pathname, so visiting the same URL twice in a row does not call `resolve` twice.

## Where to look in the source

A small map for when you go reading:

| You want to know about | Look in |
|------------------------|---------|
| The mount context shape | [`packages/components/src/component.mts`](../../packages/components/src/component.mts) |
| The wrapper element | [`packages/components/src/component/generic-component.mts`](../../packages/components/src/component/generic-component.mts) |
| Style injection and scoping | [`packages/components/src/component/styles.mts`](../../packages/components/src/component/styles.mts) and [`css-artifacts.mts`](../../packages/components/src/component/css-artifacts.mts) |
| Route matching and dispatch | [`packages/router/src/router.mts`](../../packages/router/src/router.mts) and [`route.match.mts`](../../packages/router/src/route.match.mts) |
| Page-level signal | [`packages/components/src/page-context.mts`](../../packages/components/src/page-context.mts) |
| Element factory and `on:` props | [`packages/elements/src/element-factory.mts`](../../packages/elements/src/element-factory.mts) |
| Global error filtering | [`packages/events/src/global-events.mts`](../../packages/events/src/global-events.mts) |

The packages are small. Reading the source is often quicker than reading a doc page about the source.
