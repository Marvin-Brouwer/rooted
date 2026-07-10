# Packages

The published `@rooted/*` packages live here, one folder each.

| Package | What's in it |
|---------|--------------|
| [`@rooted/components`](./components) | The component model: `component()`, the mount context, and the app bootstrap. |
| [`@rooted/router`](./router) | Typed routes, gates, navigation helpers, and the Vite route-discovery plugin. |
| [`@rooted/localization`](./localization) | URL-based localization: locale route token, overlay dictionaries, and hreflang tooling. |
| [`@rooted/elements`](./elements) | Typed HTML and SVG element factory. |
| [`@rooted/events`](./events) | Typed event helpers and global error filtering. |
| [`@rooted/store`](./store) | A small synchronous shared-state container. |
| [`@rooted/storage`](./storage) | Typed wrappers around `localStorage`, `sessionStorage`, and cookies. |
| [`@rooted/application`](./application) | Build-time configuration, SEO plugins, and Vite adapters. |
| [`@rooted/util`](./util) | Internal utilities. Not part of the public API. |

For usage docs, start in [`docs/guide/`](../docs/guide/). For the deeper APIs, see [`docs/advanced/`](../docs/advanced/). For the "why" behind the package layout, see [`docs/maintainers/package-design.md`](../docs/maintainers/package-design.md).
