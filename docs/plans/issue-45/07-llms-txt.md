# Stage 07 — `llms.txt` plugin

**Status:** not started
**Depends on:** stage 02
**Risk:** low

## Why last

Polish feature. Depends on route SEO metadata (stage 02) being populated in the recipe-book so there is real content to render.

## Convention

[llmstxt.org](https://llmstxt.org) format — a plain markdown file at the site root:

```
# Site Name

> One-sentence description of the site.

Optional user-provided intro block.

## Pages

- [Page Title](https://example.com/path/): Short description.
- [Search](https://example.com/search/): Find recipes by keyword.
```

## New plugin `packages/application/plugins/llms-txt.mts`

```ts
export type LlmsTxtSection = {
  title: string
  entries: Array<{ title: string; url: string; description?: string }>
}

export type LlmsTxtOptions = {
  /**
   * Markdown block inserted between the site description and the Pages section.
   * Use this to add context about the site, the framework, or anything else.
   */
  intro?: string
  /**
   * Override the auto-generated "Pages" section with custom groupings.
   * When provided, auto-discovery is skipped entirely.
   */
  sections?: LlmsTxtSection[]
}
```

Present in `SeoOptions` as:
```ts
llmsTxt?: LlmsTxtOptions | false  // false = disable llms.txt generation
```

When `llmsTxt` key is absent, the plugin is a no-op (opt-in). When set to an object (even `{}`), it generates the file.

## Auto-generation logic

1. Collect all static routes where `seo.title` is defined. Routes without a title are skipped with a `config.logger.info()` message.
2. Group into a single "Pages" section unless `options.sections` is provided.
3. `description` per entry comes from `seo.description` (rendered as `: description` suffix, omitted if absent).
4. Sort: root route (`/`) first, then alphabetically by title.
5. Write to `<outDir>/llms.txt`.

## Output template

```
# {{webManifest.name}}

> {{webManifest.description}}

{{options.intro}}

## Pages

- [{{seo.title}}]({{absoluteUrl}}): {{seo.description}}
```

Blank lines between sections. `options.intro` block omitted when not provided.

## Wire-up in `rooted-manifest.mts`

```ts
llmsTxtPlugin(manifest.webManifest.url, manifest.webManifest, manifest.seo?.llmsTxt)
```

Add to plugin list after `seoPlugin`.

## Critical files

- `packages/application/plugins/llms-txt.mts` (new)
- `packages/application/src/rooted-manifest.mts` (wire in, extend `SeoOptions`)
- `examples/recipe-book/vite.config.mts` (enable `llmsTxt: {}` so the recipe-book generates the file)

## Verification

Build recipe-book. Inspect `dist/llms.txt`. Content must:
- Start with `# Rooted Recipe Book`.
- Include a `>` description line.
- List all static routes that have `seo.title` set, with their URLs and descriptions.
- Match the example in issue #45's comment thread.
- Be valid markdown (no syntax errors).
