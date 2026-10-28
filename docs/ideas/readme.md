# Ideas

Where rooted could go after v1. None of this is built and none of it is promised. Code on these pages sketches a possible API, it's not something you can use.

When an idea gets picked up, the decision goes into an [ADR](https://github.com/Marvin-Brouwer/rooted/tree/main/docs/adr), and v2 work goes on the `v2` branch. Problems we ran into building real apps with v1 are written up under [learnings](../learnings/table-records.md).

## v2

- [Plan](./v2/plan.md). Why there's a v2, what stays, the workstreams, and a suggested order. Start here.
- [Component shape](./v2/component-shape.md). A proposal: one example of a v2 component, and three options for props.
- [Component sketches](./v2/components.md). The original brain dump behind the plan: proxies, `mount` and `render`, streaming, `option` and `property`.

## Later

- [Overview](./later/readme.md). Function adapters, tooling, and anything else not in the v2 plan.
- [Server actions](./later/server-actions.md). Functions that run on the server and get called like normal async functions. Close to API routes, and might end up as part of the server middleware.
- [API routes](./later/api-routes.md). The router's tagged-template pattern for API endpoints, with a few options for where the handler lives.
- [Distributed pages](./later/distributed-pages.md). One site split into several front-end apps per feature, behind a generated proxy.
