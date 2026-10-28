# v2 plan

What v2 is meant to change, collected from the [component sketches](./components.md), the [V2 milestone](https://github.com/Marvin-Brouwer/rooted/milestone/3), and what building apps on v1 taught us. Work happens on the `v2` branch, which publishes to the `alpha` dist-tag.

This is a plan, not a spec. Nothing below is decided until it has an ADR, and the order at the end is a suggestion.

## Why a v2

v1 works, and it's what the beta is about. But a few things can't be fixed without breaking the API:

- **Updating a view is manual.** You `append`, `swap` and `replace` nodes yourself. Every component that shows changing data carries its own update code.
- **Options are frozen at creation.** A parent can't change a child's options after `create()`, so state ends up in stores or module scope even when it only belongs to one component.
- **The wrapper element gets in the way.** Every component sits in an `<r-->` host. `display: contents` hides it from layout, but not from the HTML parser, assistive tech or selectors. Tables are where it breaks outright, see [table records](../../learnings/table-records.md).
- **Rendering is browser-only.** `@rooted/prerender` renders pages at build time in happy-dom, but the browser throws that markup away and mounts the app from scratch ([#407](https://github.com/Marvin-Brouwer/rooted/issues/407) shows how much that relies on). There's no per-request rendering, and nothing gets reused on the client.

## What stays

These are what rooted is, and v2 keeps them:

- Custom elements underneath, no virtual DOM, no JSX, no template language.
- Typed end to end, from route tokens to element props.
- No data in the DOM.
- An `AbortSignal` per component that fires on unmount, and listeners that clean up through it.
- Async everywhere.
- Component CSS as real `.css` files, scoped by the build.
- Vertical slices as the app layout.
- Not reactive by default. If something re-renders, it's because you asked it to.

## Workstreams

### 1. Component model

- Replace `onMount` with `mount`, which returns what to render, plus a `mounted` event that only fires in the browser. That split is what makes server rendering possible.
- One `render` function that diffs against the current DOM, instead of the `append`/`replace`/`swap` family. The low-level functions might stay available for edge cases.
- Constructor options (required and optional) and settable properties as separate things. The sketches use `option()` and `property()`; the names and the mechanism are open.
- Elements and components behind the same proxy, so `rooted(element)` and a component instance have the same API (`classes`, `on`, and so on).
- Small helpers that clean up through the signal: `after(ms, fn)`, `every(ms, fn)`, `query(selector)`.
- An extendable `on`, so packages can add their own event sources with types.

Open: whether `property()` updates re-render automatically or fire an event you handle. The first conflicts with "not reactive by default", the second is what the sketches show.

### 2. The host element

- Name hosts after the component (`{componentName}-{filepathId}`) instead of the generic `<r-->`, so they mean something in DevTools and in the accessibility tree.
- Let a component render as the element itself, the `is="td"` pattern, so a row can be a `<tr>`. Customized built-ins don't work in Safari and won't, so this needs either a small polyfill or rooted's own way of attaching a component to a plain element.

### 3. Rendering on the server

- Server rendering of components, either per request (Fastify, Express, and the function adapters in [later](../later/readme.md)) or at build time like today.
- Streaming HTML through a generator `mount`, so the top of a page goes out before slow parts resolve.
- Hydration: take over the server's markup in the browser instead of replacing it. **This section is unfinished.** The hydration design was discussed outside the repo and still needs to be written down here.

Related: [#151](https://github.com/Marvin-Brouwer/rooted/issues/151) (request-time HTML for dynamic routes in the node adapters) and [#378](https://github.com/Marvin-Brouwer/rooted/issues/378) (pre-render with happy-dom's `Browser`).

### 4. Server logic

- [Server actions](./server-actions.md): functions that run on the server and get called like normal async functions.
- Routes that return a response next to a component, like `response('redirect', './login')` or `response('not-allowed', Component())`. This only works with a server adapter, so static hosts need a fallback, or the feature is server-only and says so.

### 5. Router and SEO

- [#254](https://github.com/Marvin-Brouwer/rooted/issues/254): let routes with a typed token declare their own static paths, so they get pre-rendered and listed in the sitemap.
- [#300](https://github.com/Marvin-Brouwer/rooted/issues/300): one `llms.txt` per locale, with an index, when an app has more than one locale.

### 6. Tooling that waits for the new syntax

Both of these are on hold until the v2 API settles, because they'd have to be rewritten otherwise.

- [#298](https://github.com/Marvin-Brouwer/rooted/issues/298): oxlint rules with autofix for rooted anti-patterns, like properties on one line, unused `mount` parameters, single-item `children` arrays, or a store listener in a component without the component's signal.
- [#299](https://github.com/Marvin-Brouwer/rooted/issues/299): a small MCP server with tools to create, find and update components, because LLMs keep missing that rooted is a component framework.

### 7. Small fixes that need a breaking change

- Proper types for the string `aria` values. The ID-reference ones already take an `Element`.

## Suggested order

1. Component model and the host element, together. Everything else builds on `mount`, `render` and what a host looks like.
2. Server rendering and hydration. They need the new `mount` and decide how `render` diffs.
3. Server logic, once there's a server render to hook into.
4. Router and SEO items. These are mostly independent and could land at any point.
5. Linters and MCP last, against the final syntax.

Each step gets an ADR in `docs/adr/` before the code lands.
