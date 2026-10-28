# Later

Ideas that aren't part of the [v2 plan](../v2/plan.md). Some need v2's server rendering first, some are tooling that could land at any time, and some are just worth remembering. None of it is scheduled.

## Bigger features

- [Server actions](./server-actions.md). Functions that run on the server and get called like normal async functions. They overlap with API routes, so the two probably get designed together.
- [API routes](./api-routes.md). Use the router's tagged-template pattern for API endpoints. Several options are sketched, and it's not settled that a rooted app should serve an API at all.
- [Distributed pages](./distributed-pages.md). Split one site into several front-end apps per feature, behind a generated proxy.

## Adapters

Function and worker hosts, so dynamic routes answer with an exact `200` or `404` instead of the trade-off static hosts force ([#311](https://github.com/Marvin-Brouwer/rooted/issues/311)). Each one serves the pre-rendered files and uses the same route table as the Fastify and Express adapters. Infrastructure stays the user's job.

- [#369](https://github.com/Marvin-Brouwer/rooted/issues/369) Azure Functions
- [#370](https://github.com/Marvin-Brouwer/rooted/issues/370) Azure Static Web Apps with a managed API
- [#371](https://github.com/Marvin-Brouwer/rooted/issues/371) GCP Cloud Functions
- [#372](https://github.com/Marvin-Brouwer/rooted/issues/372) Cloudflare Workers
- [#373](https://github.com/Marvin-Brouwer/rooted/issues/373) AWS Lambda

These get more useful once v2 can render per request, but they don't have to wait for it.

## Tooling

From [#35](https://github.com/Marvin-Brouwer/rooted/issues/35), [#70](https://github.com/Marvin-Brouwer/rooted/issues/70) and [#71](https://github.com/Marvin-Brouwer/rooted/issues/71):

- **A project CLI.** `@rooted/cli` with templates for a new application, a new library, or a new feature slice (the issue suggests plop).
- **Leak checks.** [memlab](https://github.com/facebook/memlab) scenarios (navigate, act, go back) that diff heap snapshots, and a dev-mode option that logs through `FinalizationRegistry` when a component is actually collected. Both test that the signal cleanup does what it says.
- **Compression in adapters.** Adapters for hosts that serve pre-compressed files write `.br` and `.gz` next to the build.
- **knip in CI**, to keep unused files, exports and dependencies out.
- **Accessibility scans** in the pipeline, or even in the linter.
- **Bundle tooling.** Check whether `vite-plugin-inspect` or `rollup-plugin-visualizer` add anything over the current bundle report.
