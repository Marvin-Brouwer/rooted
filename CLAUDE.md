# Claude Code conventions

## Commit messages

Keep commit message headers (the first line) under 80 characters.
Always use [Conventional Commits](https://www.conventionalcommits.org/) format for commits:

```
<type>(<scope>): <short description>
```

Common types: `feat`, `fix`, `docs`, `ci`, `test`, `chore`, `perf`, `build`. (NO `refactor`)
Scope is optional but encouraged — use the package name or area (e.g. `router`, `components`, `release`).
When working on a github issue, the scope should be the issue number (e.g `feat(#54): did a thing`).

Examples:

```
feat(router): add support for optional route segments
fix(components): correct SSR hydration mismatch
ci(release): switch to OIDC trusted publishing
docs: add guide for publishing new @rooted/* packages
```

## Pull request titles

Always use [Conventional Commits](https://www.conventionalcommits.org/) format for PR titles:

```
<type>(<scope>): <short description>
```

Common types: `feat`, `fix`, `docs`, `ci`, `test`, `chore`, `perf`, `build`. (NO `refactor`)
Scope is not require for pull request titles

Examples:

```
feat: add support for optional route segments
fix: correct SSR hydration mismatch
ci: switch to OIDC trusted publishing
docs: add guide for publishing new @rooted/* packages
```
