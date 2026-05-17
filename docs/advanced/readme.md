# Advanced

Documentation for people who already have a rooted app running and want to go a layer deeper.

If you are starting out, read [guide/](../guide) first.

## Contents

- [Elements](./elements.md). The `RootedElement` base class, and when to skip `component()` and write a custom element directly.
- [Events](./events.md). Element-level handlers, page-level events, and how rooted filters extension and cross-origin noise out of error events.
- [Internals](./internals.md). How rooted scopes CSS, names anonymous components in dev mode, and ties listener cleanup to the page lifecycle.
- [Server middleware](./server-middleware.md). Wiring Fastify plugins or Express middleware into the generated `server.mjs`.
