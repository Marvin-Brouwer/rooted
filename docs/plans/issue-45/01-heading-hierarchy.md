# Stage 01 — Heading hierarchy fix

**Status:** not started
**Depends on:** nothing
**Risk:** low

## Why first

Independent of all framework changes. Pure accessibility fix that removes misuse of heading elements for styling. Good low-risk warm-up.

## Problem

HTML headings must form a strict nesting tree (`h1` → `h2` → `h3`…) for screen readers and AI crawlers to interpret page structure correctly. Two confirmed violations:

- `examples/recipe-book/src/_layout/doormat.mts` lines 48–60: `h4` used as visual column labels ("Application", "Framework") with no `h1`→`h2`→`h3` ancestors.
- `examples/recipe-book/src/navigation/home.mts` line 38: `<div role="heading" aria-level="2">` for recipe card titles instead of a real `<h2>`.

A full audit is required to catch all violations across `examples/recipe-book/src/**`.

## Scope

1. Audit every `element('h1' … 'h6', …)` and `role: 'heading'` usage in the recipe-book.
2. For each violation, choose the correct fix:
   - Visual-only label → change to `<p>`, `<span>`, or `<strong>` and style accordingly.
   - Real section heading but wrong level → renumber.
   - `div[role=heading]` → replace with the correct `<h*>` tag.
3. Confirm each page that has a heading has exactly one `<h1>`.
4. Do not change CSS class names — CSS targets class names, not element types.

## Critical files

- `examples/recipe-book/src/_layout/doormat.mts`
- `examples/recipe-book/src/navigation/home.mts`
- Any other `*.mts` files found during the audit

## Verification

`pnpm eslint`, `pnpm build:dev`, `pnpm test`. Manual check of built recipe-book in browser with axe DevTools or similar.
