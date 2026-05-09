# Commits

We use [Conventional Commits](https://www.conventionalcommits.org/), with a few small rules that are specific to this repo.

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

## Types we use

| Type | When to use |
|------|-------------|
| `feat` | A new feature. Bumps the minor version. |
| `fix` | A bug fix. Bumps the patch version. |
| `docs` | Documentation only. |
| `test` | Adding or updating tests. |
| `chore` | Build scripts, dependencies, tooling. |
| `ci` | CI/CD configuration. |
| `perf` | Performance improvement. |
| `build` | Build system or external dependency changes. |

## Why no `refactor`

`refactor` is the type Conventional Commits gives you for "code change with no observable behaviour change". We don't use it.

If a change has no observable behaviour change, it's `chore`. If it has one, it's `feat`, `fix`, or `perf`. The reason is honest semver: `refactor` is a category that hides behavioural changes from semantic-release, which means a release can ship an unannounced behavioural change. We'd rather pick the type that matches the real shape of the change.

This is documented again in [maintainers/coding-style.md](../maintainers/coding-style.md).

## Scope

The scope is the area of the repo affected. It's optional but encouraged.

Common scopes:

- An issue number: `feat(#24): ...`. Use this when the change closes an issue.
- A package: `feat(router): ...`, `fix(components): ...`, `docs(application): ...`.
- An area: `ci(release): ...`, `chore(deps): ...`.

Pick whichever is more useful for someone reading `git log` later.

## Header

The first line is the header. Keep it under 80 characters. Imperative mood ("add", "fix", not "added", "fixes"). Lowercase the description unless it starts with a proper noun.

```
feat(router): add support for optional path segments
fix(components): prevent duplicate style injection on hot reload
docs: rewrite the docs folder
chore(deps): bump tsup to 8.4
ci(release): switch to OIDC trusted publishing
```

## Body

Optional. Use it to explain why, not what. The diff shows what changed; the body is for the reasoning that isn't visible in the diff.

```
fix(router): treat undefined resolve as suppression, not fallback

Returning undefined from a dynamic resolver was previously falling
through to the parent route, which made it impossible to use the
"return undefined for 404" pattern on a child of a less-specific
route. This change blocks shorter parent routes from catching the URL
when a longer route's resolver opted out.

Closes #137.
```

## Footer

Use the footer for `Closes #NNN` lines, breaking-change announcements, and co-author tags. Each tag goes on its own line.

```
BREAKING CHANGE: route() now requires the pattern to start and end with /
Closes #142
```

`BREAKING CHANGE` (uppercase, with a space) bumps the major version when semantic-release runs.

## What we don't do

- We don't squash unrelated commits into one. Each commit on a branch should be a coherent step. If your branch is a mess of WIP commits, rebase to clean it up before opening the PR.
- We don't `--amend` already-pushed commits to fix a typo. Push a new commit, or rebase locally before pushing.
- We don't use `--no-verify` to skip pre-commit hooks. The hooks catch things. If the hook is wrong, fix the hook.

## On long-running branches

If your branch has been open for a while and `main` has moved, rebase onto `main` rather than merging `main` into your branch. The history stays linear, and the PR's diff stays focused on what you changed.

```sh
git fetch origin
git rebase origin/main
```

If the rebase has conflicts, resolve them, run the test suite, and force-push to your branch. Don't force-push to `main`.
