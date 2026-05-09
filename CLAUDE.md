# Claude Code conventions

## TSDOC

When writing TSDOC on functionality, follow these rules:


- **No em-dash** (—). Use hyphens, commas, parentheses, or two sentences.
- **Write the way a person would say it.** Plain words. Contractions are fine.
- **No business speak.** No "leverage", "empower", "robust", "seamless", "delightful", "best-in-class". This project is not a big corporation, and the author is not American. Avoid the marketing register.
- **Be honest. Don't oversell.** If a feature has trade-offs, name them. If something is small, say so. Don't dress up limitations as design choices.
- **Include usage examples when relevant.**
- **Don't add useless information**. TSDOC for the sake of TSDOC is not what we're looking for.

Keep in mind, the target audience is developers that actually use this when coding.

## Quality Control

When running eslint always run `pnpm eslint` from the repository root, other configurations don't work.  
It is important to only fix linting issues in files that are modified or added in the current branch.

After every completed code change, `pnpm lint` must return with no errors or warnings.

Always make sure everything builds `pnpm build:dev` and always test your work `pnpm test`,  
both commands are run from the repository root.

## Commit messages

Keep commit message headers (the first line) under 80 characters.
Always use [Conventional Commits](https://www.conventionalcommits.org/) format for commits:

```txt
<type>(<scope>): <short description>
```

Common types: `feat`, `fix`, `docs`, `ci`, `test`, `chore`, `perf`, `build`. (NO `refactor`)
Scope is optional but encouraged — use the package name or area (e.g. `router`, `components`, `release`).

Examples:

```txt
feat(router): add support for optional route segments
fix(components): correct SSR hydration mismatch
ci(release): switch to OIDC trusted publishing
docs: add guide for publishing new @rooted/* packages
```

## Pull request titles

Always use [Conventional Commits](https://www.conventionalcommits.org/) format for PR titles:

```txt
<type>(<scope>): <short description>
```

Common types: `feat`, `fix`, `docs`, `ci`, `test`, `chore`, `perf`, `build`. (NO `refactor`) 
When working on a github issue, the scope should be the issue number (e.g `feat(#54): did a thing`).

Examples:

```txt
feat(#24): add support for optional route segments
fix(#65): correct SSR hydration mismatch
ci(#22): switch to OIDC trusted publishing
docs: add guide for publishing new @rooted/* packages
```

## Running the linter

Always run `pnpm eslint` from the repo root. Never use `npx eslint`.

## Writing markdown

These rules apply to all prose in the repo (READMEs, docs, comments, PR and commit bodies), not just markdown files.

### Voice

- **No em-dash** (—). Use hyphens, commas, parentheses, or two sentences.
- **Write the way a person would say it.** Plain words. Contractions are fine.
- **No business speak.** No "leverage", "empower", "robust", "seamless", "delightful", "best-in-class". This project is not a big corporation, and the author is not American. Avoid the marketing register.
- **Be honest. Don't oversell.** If a feature has trade-offs, name them. If something is small, say so. Don't dress up limitations as design choices.

### Line wrapping

Keep each paragraph on a single line. Don't wrap to a virtual column width.

- Paragraphs are separated by a double newline (one blank line).
- For a hard line break inside a paragraph, end the line with a trailing backslash (` \`) and put the rest on the next line.
- If a line becomes ridiculously long, only break after a punctuation mark (period, comma, semi-colon, colon). Never break mid-sentence or mid-word.

## Pull request summary

Always use the template found in: `.github/pull_request_template.md`.
If no issue is related to the change you may replace "<!--Issue number-->" with "`na`".
When in doubt, ask the user for a related issue number.
