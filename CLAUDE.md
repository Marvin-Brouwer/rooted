# Claude Code conventions

## Commit messages

- Keep commit message headers (the first line) under 80 characters.

## Pull request titles

Always use [Conventional Commits](https://www.conventionalcommits.org/) format for PR titles:

```
<type>(<scope>): <short description>
```

Common types: `feat`, `fix`, `docs`, `ci`, `refactor`, `test`, `chore`, `perf`, `build`.
Scope is optional but encouraged — use the package name or area (e.g. `router`, `components`, `release`).

Examples:

```
feat(router): add support for optional route segments
fix(components): correct SSR hydration mismatch
ci(release): switch to OIDC trusted publishing
docs: add guide for publishing new @rooted/* packages
```
