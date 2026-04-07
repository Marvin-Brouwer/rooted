# Claude Code conventions

## Commit messages

Keep commit message headers (the first line) under 80 characters.
Always use [Conventional Commits](https://www.conventionalcommits.org/) format for commits:

```
<type>(<scope>): <short description>
```

Common types: `feat`, `fix`, `docs`, `ci`, `test`, `chore`, `perf`, `build`. (NO `refactor`)
Scope is optional but encouraged — use the package name or area (e.g. `router`, `components`, `release`).

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
When working on a github issue, the scope should be the issue number (e.g `feat(#54): did a thing`).

Examples:

```
feat(#24): add support for optional route segments
fix(#65): correct SSR hydration mismatch
ci(#22): switch to OIDC trusted publishing
docs: add guide for publishing new @rooted/* packages
```

## Running the linter

Always run `pnpm eslint` from the repo root. Never use `npx eslint`.

## Pull request summary

Always use the template found in: `.github/pull_request_template.md`.
If no issue is related to the change you may replace "<!--Issue number-->" with "`na`".
When in doubt, ask the user for a related issue number.
