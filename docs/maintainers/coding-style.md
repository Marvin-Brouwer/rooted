# Coding style

The "why" behind the choices in our ESLint config, our TypeScript config, and our `.editorconfig`. Read [CONTRIBUTING.md](../../CONTRIBUTING.md) first if you need the "what" (the rules themselves and how to run the tools).

## `.mts` everywhere

Source files are `.mts`, never `.ts`. The reason is `moduleResolution: "bundler"` plus `isolatedModules: true`: every import has to resolve to a concrete file, which means imports must include the extension. `.mts` says "this is an ES module" without leaning on package-type guesswork.

The downside is that some tools historically treated `.mts` as a special case. That's mostly settled now (Node, tsx, Vite, Vitest, esbuild, tsup all handle it). When something doesn't, we fix the tool, not the extension.

## ES2022 target

The `tsconfig` targets `esnext` for source and the project as a whole runs on ES2022 features. We use:

- `#private` class fields. Real privacy, not the `_` convention.
- Top-level `await` where it makes sense.
- `Object.hasOwn`, structured clone, AbortController, AbortSignal.

Anything older than ES2022 is fair game in our supported browsers, so we don't transpile it down. If a feature lands in modern browsers and solves a real problem, we use it. If we lose support for a browser because of it, we say so in the README's browser-support section.

## No semicolons

The `.editorconfig` and ESLint both enforce no semicolons. The shorter-than-expected rule is "we write ASI-safe code": no lines starting with `(`, `[`, `` ` ``, `+`, `-`, or `/` that could be parsed as a continuation of the previous statement. ESLint catches the cases that matter.

This is a taste call, not a correctness call. If you don't like it, the review is not the place to relitigate it.

## Tabs

Tabs for indentation. Spaces inside a line for alignment when needed. The `.editorconfig` enforces this and most editors auto-switch.

The reason is accessibility: tab width is a per-reader preference. Some people read with two-wide tabs; some with eight. Spaces lock everyone to one choice. See [this thread][tabs-accessibility] for the longer argument, including how it matters for readers with low vision or dyslexia.

[tabs-accessibility]: https://www.reddit.com/r/javascript/comments/c8drjo/nobody_talks_about_the_real_reason_to_use_tabs/

## Single quotes

Single quotes for strings, double quotes only inside strings that include a single quote. Template literals for interpolation. This is a taste call too; it's just consistent across the codebase.

## Full names over abbreviations

```ts
// No
const btn = ...
catch (err) { ... }
const el = document.getElementById('app')

// Yes
const button = ...
catch (error) { ... }
const rootElement = document.getElementById('app')
```

The exception is `#app` (the conventional HTML id) and a small set of DOM-canonical names where the abbreviation is the standard term (`href`, `url`, `id`). When in doubt, write it out.

The reason is that abbreviations age badly. `el` is fine when you wrote it; six months later, in a function with three different variables, it isn't.

## TSDoc on public API

Every exported function, type, and class has a TSDoc block. Internal helpers don't.

The TSDoc style for this repo:

- No em-dash. The CLAUDE.md TSDoc rules call this out specifically.
- Plain human language. Don't write "facilitates the management of..." when you mean "manages...".
- Copy the style of nearby comments. If existing comments are short and example-led, write yours that way.
- Include an `@example` block when the API isn't obvious from the signature.

This rule applies to docs prose too. See [../contributing/](../contributing/) for the full writing-style notes.

## No `refactor` commits

We don't use `refactor` in Conventional Commits. If the change has no observable behaviour change, it's `chore`. If it has one, it's `feat`, `fix`, or `perf`.

The reason is honest semver. `refactor` is a category that hides behavioural changes from semantic-release. Either the behaviour changed (and the version should reflect it) or it didn't (and `chore` makes that clear).

## "Don't add features beyond what the task requires"

Pull requests are scoped. A bug fix doesn't grow into a refactor of the surrounding file. If you spot something else worth doing, leave a TODO or open an issue and do it in its own PR.

This is partly aesthetic and partly practical: small PRs review faster, break less, and revert cleaner.

## What the linter is for

ESLint catches the rules that are worth catching at edit time: unused locals and parameters, missing imports, style consistency, `no-explicit-any`. Run it before opening a PR.

What ESLint isn't for: opinions about how a function should be structured, or whether a name is good. The reviewer does that.
