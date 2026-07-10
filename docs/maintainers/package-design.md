# Package design

Why rooted is split into the packages it has, and what each one is allowed to depend on.

The split exists for two reasons:

1. **Public API surface.** Each package is a separate npm package. Its `package.json` exports decide what users can import. Splitting forces us to keep internal helpers from leaking.
2. **Dependency direction.** A package can only import from packages below it in the layering. If everything were one package, that discipline lives in our heads. With separate packages, the import graph enforces it.

## The packages

```
@rooted/util          # leaf
@rooted/elements      # imports util
@rooted/events        # imports util
@rooted/storage       # imports util (no DOM-component deps)
@rooted/store         # imports util
@rooted/components    # imports util, elements, events
@rooted/router        # imports util, components
@rooted/localization  # imports util, router
@rooted/application   # build-time. imports application primitives.
```

The arrow always points down. `elements` cannot import `components`. `store` does not import `components` (it's usable outside rooted apps). `application` is build-time only and does not ship runtime code that depends on the others.

## `@rooted/util`

Tiny shared helpers that have nowhere else to live: `isClient()`, seeded ID generation, dev-mode helpers, basic types like `TupleResult`. No DOM. No build-time concerns.

The bar for adding to `util` is high. If something fits in `elements` or `events`, it goes there.

## `@rooted/elements`

The DOM helper layer. Things you'd reach for if you weren't using `component()` at all: a typed `element(...)` factory, ARIA helpers, class-list helpers, typed HTML and SVG element property maps.

Why separate from `components`: a couple of consumers (the manifest plugin, some build tooling, the router) want the typed element factory without pulling in the component runtime.

## `@rooted/events`

Event types and the page-level event abstractions. Lives separately because the event types need to be importable by `elements` (for the `on:` prop typing) without `elements` reaching back into a higher layer.

`UnhandledErrorEvent` and the cross-origin/extension filter live here. Anything we add that filters or normalises browser events goes here too.

## `@rooted/components`

The component runtime. `component()`, the mount context, the wrapper custom element (`GenericComponent`), the dev-mode helpers, the application bootstrap (`application(...)` from `@rooted/components/application`), and the CSS loader subpath (`@rooted/components/css-loader` for the Vite plugin).

This package is the closest thing to "the framework." Most user code imports from here.

## `@rooted/router`

The router, gates, link component, navigation helpers, route-token parsing, route metadata, and the SEO meta runtime. Plus the `@rooted/router/manifest` Vite plugin for `_routes.mts` discovery.

Imports `components` because routes resolve to component instances and the router itself is a component. Does not depend on `@rooted/application`; the router is usable without the build-time SEO tooling.

## `@rooted/localization`

URL-based localization built on the router's constant-values token. `configureLocalization`, the locale route token, overlay dictionaries with the `text` tagged template, and hreflang tooling (a runtime observer plus the `@rooted/localization/vite` build plugin).

Separate from `router` on purpose: apps that don't localize shouldn't carry any i18n code. The router only provides the generic constant-values token; everything locale-specific lives here.

## `@rooted/store`

A small synchronous shared-state container. Independent on purpose. Apps that don't use the rest of rooted can pick this up on its own.

## `@rooted/storage`

Type-safe wrappers around `localStorage`, `sessionStorage`, and cookies. No reactivity. No DOM dependency. SSR-safe (reads return `undefined` and writes are no-ops when the underlying API is missing).

Separate from `store` because they are different concerns: `store` is in-memory shared state, `storage` is persistent typed key-value access.

## `@rooted/application`

Build-time tooling. The `rootedManifest` helper that wraps a Vite config, the SEO plugin (sitemap, llms.txt, robots, per-route meta injection), the PWA preset, and the import cycle detector.

This package has no runtime exports. If you're writing app code, you don't import from it.

## `@rooted/adapter` and `@rooted-adapters/*`

`@rooted/adapter` is the base package for deployment adapters. It exports `staticAdapter` (for file-based hosts) and `routedAdapter` (for Node.js servers). It handles the shared build work: reading `index.html`, pre-rendering static routes, injecting SEO, and running the SSG pass.

The 17 `@rooted-adapters/*` packages are thin wrappers around `@rooted/adapter`. Each one handles the host-specific artifacts for a single deployment target (`_redirects`, `firebase.json`, `staticwebapp.config.json`, `server.mjs`, etc.).

App developers install one `@rooted-adapters/*` package in `devDependencies` and never touch `@rooted/adapter` directly. Adapter authors who need to publish a custom host adapter depend on `@rooted/adapter` and call `staticAdapter` or `routedAdapter`.

These packages live in `packages/adapter/` and `packages/adapters/*/`. The split is documented in [adr/2026-05-17.adapter-split.md](../adr/2026-05-17.adapter-split.md).

## What about `examples/recipe-book`?

Not a package. The example app exists to:

1. Be the canonical reference for how a rooted app is structured (the vertical-slice layout we point users at).
2. Cover features we ship with end-to-end usage so a regression in any of them shows up before release.

The example consumes the packages through their public exports, the same way a downstream user would. If the example needs an internal helper, we either expose it from the relevant package or rewrite the example to not need it.

## What about a new package?

Add one when the answer is yes to all three:

1. There is a real user use case for importing it on its own.
2. Its dependencies fit cleanly below the existing packages.
3. The thing inside it is enough work that bundling it into an existing package would distort that package's purpose.

Most "I could pull this out" thoughts are a no on item one. The bar is real users wanting it standalone, not "it could theoretically be standalone."

When the answer is yes, see [adding-packages](./adding-packages.md) for the mechanical steps.
