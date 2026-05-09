# Contributing overview

The canonical contributor guide is [CONTRIBUTING.md](../../CONTRIBUTING.md) at the repo root. It covers the prerequisites, project structure, dev workflow, coding standards, testing, and the PR checklist.

This folder is for the things that don't fit the canonical guide: PR etiquette, commit conventions in the way we use them here, and a pointer to past architectural decisions.

## What lives where

- [CONTRIBUTING.md](../../CONTRIBUTING.md). The canonical contributor guide. Setup, standards, testing, the PR checklist.
- [docs/maintainers/](../maintainers/). The "why" behind our coding style and our package layout. Worth reading if your PR is non-trivial.
- [docs/contributing/pull-requests.md](./pull-requests.md). PR title format, what reviewers look for, how to scope a PR.
- [docs/contributing/commits.md](./commits.md). Conventional Commits as used in this repo, including the small things (no `refactor`, header under 80 chars).
- [docs/adr/](../adr/). Architectural decision records. Read these before proposing changes that touch a surface area an ADR has already weighed in on.

## Code of conduct

Be respectful and constructive. Harassment, discrimination, or dismissive communication of any kind is not tolerated.

## Reporting bugs

Open a [GitHub issue](https://github.com/Marvin-Brouwer/rooted/issues/new) and include:

- A minimal reproduction. A code snippet is fine; a small repo or StackBlitz is better.
- Expected vs. actual behaviour.
- Browser name and version, for runtime bugs.
- Node version (`node -v`) and pnpm version (`pnpm -v`).

Feature requests are welcome too. Describe the use case clearly so the maintainers can decide whether it fits.

## Architectural decision records

When a change is large enough to lock in a non-obvious design choice, record it as an ADR in [`docs/adr/`](../adr/). Use the existing files as the template: YAML front-matter, a short problem statement, the decision, the alternatives we considered (and why we didn't pick them), and the outcome.

ADRs are appended, not edited. If a later decision supersedes an earlier one, set the older ADR's status to `superseded` and link to the new one.

## When in doubt

Ask. Open an issue or a draft PR with a question. Most of the project's weirdness has a reason. We'd rather explain it once than have a PR get stuck because nobody knew.
