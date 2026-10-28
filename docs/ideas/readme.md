# Ideas

Loose ideas for where rooted could go after v1. None of this is built, none of it is promised, and the code in these pages is a sketch of a possible API, not something you can use.

Some of these come from problems we ran into building real apps with v1. Those are written up under [learnings](../learnings/table-records.md).

When an idea gets picked up, the decision goes into an [ADR](https://github.com/Marvin-Brouwer/rooted/tree/main/docs/adr) and the work goes on the `v2` branch.

## v2

- [Components](./v2/components.md). What didn't work in v1, and a component API with proxies, a single `render`, streaming and server rendering.
- [Server actions](./v2/server-actions.md). Functions that run on the server and get called like normal async functions.

## Later

These were written as v3 ideas. They need a server, so they depend on v2 going that way first.

- [API routes](./v3/api-routes.md). Using the router's tagged-template pattern for API endpoints, with a few options for where the handler lives.
- [Distributed pages](./v3/distributed-pages.md). One site split into several front-end apps per feature, behind a generated proxy.
