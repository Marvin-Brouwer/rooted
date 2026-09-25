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
@rooted/observers     # leaf. no dependencies at all
@rooted/dom-globals   # build-time, Node only. leaf (happy-dom).
@rooted/storage       # imports util (no DOM-component deps)
@rooted/store         # imports util
@rooted/components    # imports util, elements, events
@rooted/router        # imports util, components, dom-globals (manifest plugin only)
@rooted/localization  # imports util, router, components
@rooted/markdown      # imports components
@rooted/pwa           # imports components (components entry only)
@rooted/application   # build-time. imports application primitives.
@rooted/seo           # build-time. imports router (optional peer, types only).
@rooted/prerender     # build-time, Node only. imports dom-globals.
@rooted/adapter       # build-time. imports seo (types only), prerender.
```

The arrow always points down. `elements` cannot import `components`. `store` does not import `components` (it's usable outside rooted apps). `application` is build-time only and does not ship runtime code that depends on the others. It does depend on `pwa`, but only to copy that package's built file into the build output.

## `@rooted/util`

Tiny shared helpers that have nowhere else to live: `environment`, seeded ID generation, dev-mode helpers, basic types like `TupleResult`. No DOM. No build-time concerns.

`environment` needs no cooperation from the build, which is the point. The pre-render boots the built client bundle
in happy-dom, so it looks like a browser from the inside and no build-time constant can say otherwise.
It's recognised by finding happy-dom instead, which means our own happy-dom test runs report `preRenderer` too.
That's accepted: stub a `window` without `happyDOM` on it to get `client` under test.
`environment.hasDom` is the separate, dumber question of whether there's a `window` at all, which the pre-render also answers yes to.

The bar for adding to `util` is high. If something fits in `elements` or `events`, it goes there.

## `@rooted/elements`

The DOM helper layer. Things you'd reach for if you weren't using `component()` at all: a typed `element(...)` factory, ARIA helpers, class-list helpers, typed HTML and SVG element property maps.

Why separate from `components`: a couple of consumers (the manifest plugin, some build tooling, the router) want the typed element factory without pulling in the component runtime.

## `@rooted/events`

Event types and the page-level event abstractions. Lives separately because the event types need to be importable by `elements` (for the `on:` prop typing) without `elements` reaching back into a higher layer.

`UnhandledErrorEvent` and the cross-origin/extension filter live here. Anything we add that filters or normalises browser events goes here too.

## `@rooted/observers`

`IntersectionObserver`, `MutationObserver` and `ResizeObserver` wrapped so they take an `AbortSignal` and disconnect themselves. `addEventListener` has a `{ signal }` option and the observer constructors don't, so this is the one listener surface where rooted's cleanup didn't reach.

Its own package, with no dependencies at all, because it has nothing to do with the rest of the framework. Anything holding an `AbortSignal` can use it, and an app that observes nothing never installs it. Nothing else in rooted depends on it, and `components` deliberately does not re-export it the way it re-exports `events`.

## `@rooted/components`

The component runtime. `component()`, the mount context, the wrapper custom element (`GenericComponent`), the dev-mode helpers, the application bootstrap (`application(...)` from `@rooted/components/application`), and the CSS loader subpath (`@rooted/components/css-loader` for the Vite plugin).

This package is the closest thing to "the framework." Most user code imports from here.

## `@rooted/router`

The router, gates, link component, navigation helpers, route-token parsing, route metadata, and the SEO meta runtime. Plus the `@rooted/router/manifest` Vite plugin for `_routes.mts` discovery.

Imports `components` because routes resolve to component instances and the router itself is a component. Does not depend on `@rooted/application` or `@rooted/seo`; the router is usable without the build-time SEO tooling.

## `@rooted/localization`

URL-based localization built on the router's constant-values token. `configureLocalization`, the locale route token, overlay dictionaries with the `text` tagged template, and hreflang tooling (a runtime observer plus the `@rooted/localization/vite` build plugin).

Separate from `router` on purpose: apps that don't localize shouldn't carry any i18n code. The router only provides the generic constant-values token; everything locale-specific lives here.

Imports `components` for `localized`, which is a component so its `popstate` subscription can hang off the mount signal instead of needing a disposer.

## `@rooted/markdown`

Build-time markdown. A Vite plugin (`@rooted/markdown/vite`) turns `.md` files into modules with a `frontmatter` and an `html` export, and a `Markdown` component renders that HTML. Ambient `*.md` types ship unbuilt at `@rooted/markdown/types`.

Its own package rather than part of `components` because it drags in `marked`, `gray-matter` and a minifier. Those are Node-only and never reach the bundle, but apps with no markdown shouldn't install them at all. Nothing else in rooted depends on it.

Deliberately generic: it does frontmatter and render-to-HTML, nothing else. The recipe-book example keeps its own plugin for the recipe-specific parts (ingredient extraction, the measurement codespan renderer), which is the intended way to go beyond this.

## `@rooted/store`

A small synchronous shared-state container. Independent on purpose. Apps that don't use the rest of rooted can pick this up on its own.

## `@rooted/storage`

Type-safe wrappers around `localStorage`, `sessionStorage`, and cookies. No reactivity. No DOM dependency. SSR-safe (reads return `undefined` and writes are no-ops when the underlying API is missing).

Separate from `store` because they are different concerns: `store` is in-memory shared state, `storage` is persistent typed key-value access.

## `@rooted/seo`

Build-time SEO. Meta tags, Open Graph, canonical links, sitemap and `robots.txt` generation, and the `SeoApi` seam other plugins register against.

Split in two on purpose. `@rooted/seo` knows nothing about routing, so it works in an app that doesn't use the router. `@rooted/seo/router` holds the parts that read the route manifest: per-page metadata, route entries in the sitemap, and `llms.txt`. The router is an optional peer, used for types only, and the plugin no-ops when it isn't there.

Plugin-only, no `src/`. The split is documented in [adr/2026-08-25.seo-split.md](../adr/2026-08-25.seo-split.md).

## `@rooted/application`

Build-time tooling. The `rootedManifest` helper that wraps a Vite config, the PWA preset, and the import cycle detector. It wires up the plugins from `@rooted/seo` so apps don't have to.

This package has no runtime exports. If you're writing app code, you don't import from it.

It takes `@rooted/pwa` as a real dependency anyway. `pwaRegisterPlugin` reads that package's built `dist/pwa.mjs` and emits it as the service worker registration script, so it's a file the build copies, not code this package imports into anything.

## `@rooted/pwa`

Service worker registration, plus `UpdateNotification` and `ApplyUpdateButton` for putting a new version in front of the user.

Two entry points, for two different consumers. `@rooted/pwa` is the core: no dependencies, and deliberately kept to a single built file, because `@rooted/application` emits that file verbatim as the app's registration script. `@rooted/pwa/components` takes `@rooted/components` as a peer and is bundled into the app the normal way.

Nothing is shared between the two at runtime: the emitted script and the copy bundled into the app are separate module instances. That's why neither holds update state in a module variable. Both ask `navigator.serviceWorker` every time, and the browser is what they agree through.

## `@rooted/adapter` and `@rooted-adapters/*`

`@rooted/adapter` is the base package for deployment adapters. It exports `staticAdapter` (for file-based hosts) and `routedAdapter` (for Node.js servers). It handles the shared build work: reading `index.html`, pre-rendering static routes, and running the SSG pass. SEO is delegated: the adapter calls `SeoApi.injectRouteHtml(html, staticPath)` and `@rooted/seo` does the work.

The 17 `@rooted-adapters/*` packages are thin wrappers around `@rooted/adapter`. Each one handles the host-specific artifacts for a single deployment target (`_redirects`, `firebase.json`, `staticwebapp.config.json`, `server.mjs`, etc.).

App developers install one `@rooted-adapters/*` package in `devDependencies` and never touch `@rooted/adapter` directly. Adapter authors who need to publish a custom host adapter depend on `@rooted/adapter` and call `staticAdapter` or `routedAdapter`.

These packages live in `packages/adapter/` and `packages/adapters/*/`. The split is documented in [adr/2026-05-17.adapter-split.md](../adr/2026-05-17.adapter-split.md).

## `@rooted/dom-globals`

Puts a happy-dom window onto `globalThis` in plain Node for as long as a callback runs, and takes it off again. The router's manifest plugin needs that to evaluate route files through jiti in `buildStart`, and `@rooted/prerender` needs it to boot the built bundle in `closeBundle`.
It exports `withDomGlobals` and nothing else, so every install ends in a `finally` and none can be left open by hand.

Installing the DOM once for the whole build, `buildStart` through `closeBundle`, doesn't work, and `environment` from `@rooted/util` doesn't change that. `environment` only covers rooted's own code. Third-party code makes its own call, usually by checking for `document`.
Tried against the recipe book with the PWA on: the `import.meta.url` shim Rollup emits into CommonJS output resolves to `http://localhost/` instead of a file URL, and vite-plugin-pwa fails with `Unable to write the service worker file. 'The URL must be of scheme file'`.

## `@rooted/prerender`

Boots the built app in happy-dom, inside the real `index.html`, navigates it to each static route and hands back the whole document. `@rooted/adapter` calls it after the bundle is written, puts the route's SEO over the result and writes it as that route's page.
The whole document rather than just the body, because the app writes to `<head>` too: component stylesheets are `<link>` tags added at runtime, and without them a pre-rendered page shows unstyled until the JS runs.

The app boots once for all routes, so the document carries over from one route to the next. A stylesheet one route pulled in is still linked on every page rendered after it. Harmless, a few extra requests, and in a minified build there are only a couple of stylesheets anyway.

`renderer(options, use)` takes a callback rather than returning something to dispose, so shutting the app down and restoring the globals can't be skipped when writing a file throws. The adapter imports it dynamically, so loading an adapter in `vite.config` doesn't load happy-dom.

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
