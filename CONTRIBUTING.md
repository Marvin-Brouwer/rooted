# Contributing to rooted

Thank you for your interest in contributing! This document covers everything you
need to get set up and submit a quality pull request.

---

## Contents

- [Code of conduct](#code-of-conduct)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Development workflow](#development-workflow)
- [Coding standards](#coding-standards)
  - [Naming](#naming)
- [Testing](#testing)
- [Commit messages](#commit-messages)
- [Submitting a pull request](#submitting-a-pull-request)
- [Reporting bugs](#reporting-bugs)

---

## Code of conduct

Be respectful and constructive. Harassment, discrimination, or dismissive
communication of any kind will not be tolerated.

---

## Getting started

### Prerequisites

| Tool | Version |
|------|---------|
| Node | ≥ 22.0.0 |
| pnpm | ≥ 10.0.0 |
| Git  | any recent version |

### Setup

```sh
git clone https://github.com/Marvin-Brouwer/rooted.git
cd rooted
pnpm install
```

Verify everything works:

```sh
pnpm test        # run the test suite
pnpm build:all   # build all packages
```

---

## Project structure

```
rooted/
├── packages/
│   ├── components/   # @rooted/components — component system
│   ├── router/       # @rooted/router     — routing + Vite plugin
│   └── util/         # @rooted/util       — internal utilities
├── example/          # example Vite app (demonstrates all features)
├── docs/             # markdown guides
├── CONTRIBUTING.md   # this file
└── package.json      # monorepo root (scripts, devDependencies)
```

Each package under `packages/` is a standalone npm package with its own
`package.json`, `tsup.config.mts`, and `src/` directory.

---

## Development workflow

### Watch mode

Start all packages in watch mode (rebuilds on change):

```sh
pnpm dev:all
```

Then open a second terminal and start the example app:

```sh
cd example
pnpm dev
```

### Working on a single package

```sh
cd packages/components
pnpm dev
```

### Building

```sh
pnpm build:all   # build everything
```

Or build a single package:

```sh
cd packages/router
pnpm build
```

---

## Coding standards

### TypeScript

- Target: `ES2022` with `"moduleResolution": "bundler"`.
- Use `.mts` file extensions for ESM source files.
- All public APIs must have **TSDoc** comments — see existing source files for
  the style convention.
- Prefer explicit types on exported functions and types.
- Do not use `any` except in internal glue code where the type is structurally
  constrained elsewhere.

### Linting

The project uses ESLint with `@typescript-eslint`, `eslint-plugin-import`, and
`eslint-plugin-unicorn`.

```sh
pnpm lint         # lint and auto-fix
pnpm lint:nofix   # lint without auto-fix (CI mode)
```

All linting must pass before a PR is merged.

### Naming

Prefer full, descriptive names over abbreviations in all code — including
documentation examples, tests, and library source.

```ts
// ❌ abbreviated
const btn = append('button', { textContent: 'Submit' })
catch (err) { ... }
const el = document.getElementById('app')

// ✅ full names
const button = append('button', { textContent: 'Submit' })
catch (error) { ... }
const rootElement = document.getElementById('app')
```

**Exception:** the `#app` HTML id is a widely-recognised convention and may
be used as-is in selectors and HTML markup.

If you find an abbreviation in the codebase that you believe should become an
additional exception, open an issue or PR for discussion before using it.

### Style

- Tabs for indentation.
- Single quotes for strings.
- No semicolons (TypeScript ASI-safe code).
- Keep functions small and focused; avoid deep nesting.
- Prefer `const` and immutability; use `Object.freeze` for public API objects.

---

## Testing

Tests live in `packages/*/tests/` and use [vitest](https://vitest.dev/).

```sh
pnpm test          # run once
pnpm test:watch    # re-run on change
```

### Writing tests

- Co-locate test files with the package they test (`packages/<pkg>/tests/`).
- Test files must end in `.test.ts`.
- Test the public API surface — avoid testing private internals.
- Each meaningful behaviour should have its own `it()` block with a descriptive
  name.
- If you add a new feature or fix a bug, add or update tests to cover it.

### Coverage expectations

There is no enforced coverage threshold, but PRs that reduce meaningful coverage
without justification will be asked to add tests.

---

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

Common types:

| Type | When to use |
|------|------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change with no behaviour change |
| `test` | Adding or updating tests |
| `chore` | Build scripts, dependencies, tooling |

Examples:

```
feat(router): add support for optional path segments
fix(components): prevent duplicate style injection on hot reload
docs: add elements guide for RootedElement
```

Keep the summary under 72 characters. Use the body to explain **why**, not
**what** (the diff already shows what changed).

---

## Submitting a pull request

1. **Fork** the repository and create a branch from `main`:

   ```sh
   git checkout -b feat/my-feature
   ```

2. **Make your changes** — keep them focused. One logical change per PR.

3. **Run the full check suite** before pushing:

   ```sh
   pnpm lint:nofix
   pnpm test
   pnpm build:all
   ```

4. **Push** and open a pull request against `main`.

5. Fill in the PR template:
   - Describe what changed and why.
   - Link any related issues (`Closes #123`).
   - Note any breaking changes.

6. A maintainer will review the PR. Address feedback promptly; PRs with no
   activity for 30 days may be closed.

### PR checklist

- [ ] Tests pass (`pnpm test`)
- [ ] Lint passes (`pnpm lint:nofix`)
- [ ] Build succeeds (`pnpm build:all`)
- [ ] TSDoc added/updated for any changed public APIs
- [ ] Docs updated if behaviour changed (files under `docs/`)
- [ ] Commit messages follow [Conventional Commits](#commit-messages)

---

## Reporting bugs

Open a [GitHub issue](https://github.com/Marvin-Brouwer/rooted/issues/new) and
include:

- A minimal reproduction (code snippet or link to a StackBlitz/CodeSandbox).
- Expected vs. actual behaviour.
- Browser name and version (for runtime bugs).
- Node version (`node -v`) and pnpm version (`pnpm -v`).

Feature requests are welcome too — describe the use case clearly so the
maintainers can evaluate fit and priority.
