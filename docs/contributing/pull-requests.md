# Pull requests

How we shape and review PRs in this repo. The mechanical checklist lives in [CONTRIBUTING.md](../../CONTRIBUTING.md). This page is the norms around it.

## Title format

Conventional Commits, with a scope. The PR title becomes the merge commit title, and semantic-release reads it.

```
<type>(<scope>): <short description>
```

When the PR closes a GitHub issue, the scope is the issue number:

```
feat(#24): add support for optional route segments
fix(#65): correct SSR hydration mismatch
docs(#41): rewrite the docs folder
```

When the PR is not tied to an issue, the scope is the package or area:

```
feat(router): typed token parser
ci(release): switch to OIDC trusted publishing
docs: add a contribution guide
```

Types we use: `feat`, `fix`, `docs`, `ci`, `test`, `chore`, `perf`, `build`. We do not use `refactor`. See [commits](./commits.md) for the reasoning.

Keep the title under 80 characters. The body is for detail.

## Body

The [PR template](../../.github/pull_request_template.md) is auto-applied to new PRs. The shape:

- A short summary. Three sentences is plenty for most PRs.
- The [Definition Of Done](#definition-of-done) checklist (below).

The issue number does not live in the body. It lives in the PR title through the Conventional Commits scope (`feat(#24): ...`), which the [Title format](#title-format) section above covers.

Don't write the body to a "what changed" template. The diff already shows what changed. The body is for the things the diff doesn't carry: the why, the trade-off you made, the thing the reviewer will be suspicious about.

## Definition Of Done

Tick the items that apply. Items that don't apply (no new tests for a docs-only change, for example) also get ticked. The list is for the human reviewer's benefit, not for compliance.

- [ ] Meets acceptance criteria of story / Fixed bug
- [ ] Added new tests
- [ ] All tests pass (`pnpm test`)
- [ ] Checked regression
  - Build passes
  - Tests still pass
  - Linting still passes
  - Chunking still works as expected, \
    _all async components in `**/_routes.mts` should only load when the corresponding route is visited._
  - The example app still functions
- [ ] Updated documentation
  - TSDoc added/updated for any changed public APIs
  - Docs updated if behavior changed (files under `docs/`)

## Scope

One logical change per PR. A bug fix doesn't grow into a refactor of the surrounding file. A new feature doesn't bring along a doc rewrite unless the rewrite is necessary for the feature.

If you spot something else worth doing while writing the PR, leave a TODO and open it as a separate issue or PR. It reviews faster, breaks less, and reverts cleaner if anything goes wrong.

The exception: if the change requires a doc update for a behaviour you just changed, the doc update goes in the same PR. Don't ship a feature and the doc that explains it in two different PRs.

## Before pushing

Run the full check suite locally:

```sh
pnpm lint
pnpm test
pnpm build:dev
```

Linting must come back clean. Tests must pass. The build must succeed. If any of these fail, fix them before opening the PR. Don't open a PR expecting the CI to do the first run for you.

The CI runs the same checks. It exists to catch the cross-environment problems your local can't catch. It is not a free first-run service.

## Regression checks

The regression list in the [Definition Of Done](#definition-of-done) isn't bureaucracy. The chunking check in particular catches a real class of bug: an async component imported from a `_routes.mts` is supposed to live in its own chunk so it lazy-loads on first navigation. A static import elsewhere can pull it into the main bundle without anyone noticing.

If your PR touches anything route-related, run the example app and inspect the network panel. Components for unvisited routes should not show up in the initial load.

## Review

A maintainer will review the PR. Address feedback promptly. If you disagree with feedback, say so on the PR; reviewers are not always right.

PRs with no activity for 30 days may be closed. That isn't a punishment; it's housekeeping. Reopen when you have time. Long-running PRs go stale, and a fresh PR is usually easier than rebasing a stale one.

## What gets pushed back

Common reasons a PR gets a "please change this":

- The scope is too big. Reviewer asks to split.
- The title doesn't follow Conventional Commits.
- TSDoc is missing on a new public export.
- A regression check on the list is unticked and applicable.
- The change touches a surface area an ADR has spoken on, and the ADR isn't acknowledged.

None of these are personal. The reviewer is doing the same thing you'd want them to do for your code: keep the bar even.
