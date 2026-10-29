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

These used to be issues [#35](https://github.com/Marvin-Brouwer/rooted/issues/35) (future plans), [#70](https://github.com/Marvin-Brouwer/rooted/issues/70) (knip) and [#71](https://github.com/Marvin-Brouwer/rooted/issues/71) (accessibility scans). Everything they said is written up here, and the issues stay open to track the work.

### A project CLI

Scaffolding scripts, probably with [plop](https://plopjs.com/), so a new project or feature starts from a template:

- `pnpm dlx @rooted/cli new-application {name} {folder}`
- `pnpm dlx @rooted/cli new-library {name} {folder}`
- `pnpm project add feature {feature and folder name}`, for a new vertical slice in an existing app.

### Leak checks

Both of these test that the signal cleanup does what it says.

- **[memlab](https://github.com/facebook/memlab)**, Meta's leak detector. You write a scenario (navigate to a page, do something, go back), it takes a heap snapshot at each step and diffs them, and it reports leaked objects with the chain that keeps them alive. Much faster than comparing snapshots by hand. Runs with `npx memlab run --scenario my-scenario.js`.
- **`AbortController` plus `FinalizationRegistry`.** A `FinalizationRegistry` can log when an object is actually garbage collected, which shows that cleanup really let go of a component. This could be a dev-mode option, switched on through the manifest, and it's useful in tests too.

### Compression in adapters

[`vite-plugin-compression`](https://github.com/vbenjs/vite-plugin-compression) writes `.br` and `.gz` files next to the build. It should be part of every adapter whose host can serve pre-compressed files, not something each app adds.

### Validator and editor support

Generate a `custom-elements.json` (the [Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest)) for editor autocomplete and docs, and an `html-validate` plugin with element metadata, so validation understands rooted components. The build knows every component, so both can come from the same source. From the [hydration](../v2/hydration.md) discussion.

### knip in CI

Add [knip](https://knip.dev/explanations/why-use-knip) to the pipelines, and maybe the local workflow, to catch unused files, exports and dependencies. The framework should stay as lean as possible.

### Accessibility scans

Find a tool that scans a site for accessibility issues regularly: in the pipeline, or even as part of the linter. axe and Lighthouse are the usual candidates, since they check the accessibility tree rather than the markup.

### Build inspection

- [`vite-plugin-inspect`](https://github.com/antfu-collective/vite-plugin-inspect), which shows the intermediate state of each Vite plugin. Check whether it adds anything for rooted's own plugins.
- [`rollup-plugin-visualizer`](https://github.com/btd/rollup-plugin-visualizer), as a more feature-rich bundle analyzer. Partly covered since `@rooted/application` got its bundle report with Sonda ([#392](https://github.com/Marvin-Brouwer/rooted/pull/392)), so only worth a look if that report falls short.
