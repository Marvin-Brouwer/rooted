# Open beta plan

How rooted goes from alpha to an open beta, and from there to 1.0. Tracked in [#148](https://github.com/Marvin-Brouwer/rooted/issues/148). The page for people joining the beta is [guide/beta.md](../guide/beta.md); this one is the maintainer side.

Written on 2026-10-28. The npm facts below were checked with `npm view` on that day.

## Where things stood

The code and CI were in good shape. Releases are automated (multi-semantic-release, conventional commits, OIDC trusted publishing with provenance), CI runs build, bundle checks, bundle-size budgets, typecheck, lint, tests and an api-extractor diff on every PR, and the docs cover every package.

The distribution side wasn't ready:

- The `latest` dist-tag was stale on all 33 published packages (16 `@rooted/*`, 17 `@rooted-adapters/*`), mostly `1.0.0-alpha.0` from March. A plain `pnpm add @rooted/components` installed code that didn't match the docs.
- `1.0.0` is already used up on npm for five packages: `components`, `router` and `util` had `1.0.0` and `1.0.1` unpublished, and `application` and `store` have a deprecated `1.0.0`. npm never allows a version to be reused.
- Nothing told users the packages were alpha or beta, apart from a one-line note in each package readme.

## Readiness gaps

| # | Gap | Fix | When | Status |
| --- | --- | --- | --- | --- |
| 1 | `latest` dist-tag is stale on every package | `main` publishes to the `beta` dist-tag, install docs say `@beta`, old alphas get deprecated | Before announcing | Config and docs done in #450, deprecation is manual |
| 2 | Release channel and prerelease id were `alpha`; `RELEASING.md` pointed at the wrong config path | `main` releases `1.0.0-beta.N`, alpha work moves to a `v2` branch, `RELEASING.md` updated | Before announcing | Done in #450 |
| 3 | No stability statement for users | [Beta program](../guide/beta.md) page, linked from the README and the guide | Before announcing | Done in #450 |
| 4 | README says Vite 6 or newer while every package peers on `vite >=8.0.1`; quick start step 3 uses `component`, `HomeComponent` and `NotFoundComponent` without importing them | Fix the requirements table and the imports | Before announcing | Vite version done in #450, imports open |
| 5 | Every published package declared `engines.pnpm`, so npm, yarn and bun users got `EBADENGINE` warnings | Keep `pnpm` in the monorepo root's engines only | Before announcing | Done in #450 |
| 6 | `security_bug_report.yml` is a public issue form, while `SECURITY.md` says never to report publicly; there's no `ISSUE_TEMPLATE/config.yml` | Replace the form with a contact link to the private advisory; add `config.yml` with links to Discussions and docs, blank issues off | Before announcing | Open |
| 7 | Breaking changes are invisible: on a prerelease branch `feat!` only bumps the prerelease number, and `api-diff` checks the baseline is committed, not that a removal is marked | Require `!` plus a `BREAKING CHANGE:` footer with a migration note whenever an `api/*.api.md` line is removed or changed; a small `rooted-pipeline` check can enforce it | Early in beta | Open |
| 8 | Release notes are 33 per-package GitHub releases, many only "Dependencies upgraded"; packages version independently | A hand-written post per release drop in Discussions, linking the package releases | Early in beta | Open |
| 9 | No browser support statement | The beta page says current Chrome, Edge, Firefox and Safari, and that older browsers aren't tested | Early in beta | Done in #450 |
| 10 | `CONTRIBUTING.md` still describes ESLint; the repo uses oxlint | Update the linting section | Early in beta | Open |
| 11 | `SECURITY.md` says "latest published version", which is ambiguous with a stale `latest` tag | Say "the latest `beta` release" until 1.0 | Early in beta | Open |
| 12 | The `LICENSE` note says `/.docs/branding` instead of `docs/branding`; GitHub detects the license as "Other" | Fix the path; consider keeping the branding exception in `docs/branding/LICENSE.md` only, so `LICENSE` is plain MIT | Before 1.0 | Open |
| 13 | `1.0.0` is burnt for five packages | Decide the 1.0 numbering (see "The burnt 1.0.0" below) | Before 1.0 | Open |

## Versioning and stability promises

Stay on the `1.0.0-*` prerelease line and promise visibility rather than stability. Going back to `0.x` isn't worth it: it sorts below the alpha versions already out, and semantic-release would have to be talked out of that.

### Release mechanics

- `main` releases `1.0.0-beta.N` to the `beta` dist-tag. A dry run on #450 computed `1.0.0-beta.1` for all 33 packages, since none has a beta tag yet, so no manual bump is needed. The first beta release notes cover each package's whole history.
- Alpha work for v2 moves to the `v2` branch, released to the `alpha` dist-tag.
- `latest` stays on the old alphas until 1.0. Every install command says `@beta`, and the old alphas get deprecated with a message pointing at `@beta` (commands in [RELEASING.md](../../RELEASING.md)).

### What users can rely on

These are on the [Beta program](../guide/beta.md) page:

1. Anything can still change, but breaking changes are announced in the release notes with a migration note.
2. Semver ranges don't protect you in a prerelease; pin exact versions.
3. Only the latest beta gets fixes, security fixes included.
4. Supported: Node 22+, Vite 8+, current evergreen browsers.
5. Big rewrites happen early. After the API freeze, only fixes and additive changes go in.

All packages are beta-ready and carry the same promise. There are no stability tiers. If one API later turns out shakier than the rest, mark it with TSDoc `@beta` so api-extractor prints it in the reports, rather than splitting packages into tiers.

### After 1.0

Normal semver. Removals go through one minor with a deprecation (TSDoc `@deprecated` plus a dev-only console warning) before the major that removes them.

## Feedback channels

GitHub only: Discussions for conversation, Issues for things that get acted on. A Discord or similar is a second inbox one maintainer can't keep warm.

| Channel | For |
| --- | --- |
| Discussions, Beta feedback (form) | Experience reports, using the four questions |
| Discussions, Q&A | How do I..., answered by users as much as by the maintainer |
| Discussions, Show and tell | Things people built; the best source of real-world test cases |
| Discussions, Announcements (maintainer only) | One post per release drop, breaking changes first |
| Issues | Bugs with a reproduction and concrete feature requests |
| Private security advisory | Vulnerabilities |

The four questions on the feedback form:

1. What did you build, or try to build?
2. Where did you get stuck, and for how long?
3. Which API did something you didn't expect?
4. What did you have to write yourself that you think belongs in rooted?

Question 3 feeds the API freeze. Question 4 tells what's missing for 1.0 versus what's nice to have.

### Labels

Keep `bug`, `enhancement` and `documentation`, and add:

- `breaking` on an issue or PR that changes public API.
- `1.0-blocker` on anything that must land before 1.0, together with the `V1` milestone.
- `needs-repro` for bugs without a reproduction; close after 14 days without one.

### Support expectations

No response-time promise. Rooted is a hobby project, and the beta page says so. Q&A is the first stop for questions, users are asked to answer each other there, and good answers get marked as accepted. Bugs that need a redesign get a short ADR in `docs/adr/`.

## Announcement

1. **Fresh-eyes run.** In an empty folder outside the monorepo, build one small app from the getting-started guide using only the published `@beta` packages and the docs. Note every place you had to guess and fix it. A CI job doing the same install from npm keeps it honest later.
2. **Soft launch.** Post in one small, friendly place (a web components community channel, or a single subreddit) and ask for the four feedback questions. Whoever answers is the first wave.
3. **Public announcement.** One post, shared on Show HN, r/webdev and r/typescript (check each sub's self-promotion rules), Bluesky and Mastodon, and web components community channels. The social card is in `docs/branding/social-card.png`.

The announcement says what rooted is in one line, who it's for and who it isn't for (if you want signals, a virtual DOM or a big ecosystem, this isn't it), what beta means (link the beta page), how to install with `@beta`, where feedback goes, and what 1.0 depends on (link the `V1` milestone).

During the beta: one Announcements post per release drop, batched rather than per merge, an occasional "state of the beta" note, and credit for people whose feedback changed something.

## Exit criteria for 1.0

Leave beta when all of these are ticked, not on a date. The time-based items are minimums, so a quiet month doesn't get mistaken for stability.

### Usage

- [ ] At least 8 weeks since the public announcement.
- [ ] At least 3 apps built by people other than the maintainer, shared in Show and tell, and at least one deployed through an adapter other than GitHub Pages.
- [ ] Every feedback answer to "which API surprised you" either changed or explained in the docs.

### API

- [ ] API freeze declared, followed by at least 4 weeks with no breaking change.
- [ ] Every export documented. The api-extractor reports showed 77 `(undocumented)` entries on 2026-10-28, 21 of them in `router.api.md`.
- [ ] The API reports read through once by hand for leaks: helper types that shouldn't be public.
- [ ] No open `1.0-blocker` issues, and the `V1` milestone closed.

### Quality

- [ ] A browser smoke test of the recipe-book example in Chromium, Firefox and WebKit. All tests run in happy-dom today, which can't catch real custom-element or view-transition differences.
- [ ] The example app built in CI against the packed tarballs instead of workspace links, so a missing `files` entry or a broken `exports` map fails before users see it.
- [ ] Bundle-size budgets reviewed and tightened to the beta's actual sizes.

### Release

- [ ] 1.0 numbering decided for the five packages that burnt `1.0.0`, and a `--dry-run` passes.
- [ ] The 1.0 steps in [RELEASING.md](../../RELEASING.md) run.
- [ ] A beta-to-1.0 migration page that collects every breaking change from the beta release notes.

### The burnt 1.0.0

`components`, `router` and `util` can never publish `1.0.0` or `1.0.1`; `application` and `store` can't publish `1.0.0`. Two ways out:

- **Accept uneven numbers.** Those five ship `1.0.2` and `1.0.1`, the rest `1.0.0`. The packages already version independently, so this matches how they work, but five packages need special handling in the release run.
- **Skip to `1.1.0` across the board.** Everything starts stable at the same number, at the cost of a "where's 1.0" question answered once in the release notes.

Either way semantic-release will compute `1.0.0` for its first stable release, so expect a one-off nudge (a seeded tag or a manual first publish), and dry-run it well before the day.
