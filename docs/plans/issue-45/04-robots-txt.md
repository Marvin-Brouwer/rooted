# Stage 04 — `robots.txt` generation

**Status:** not started
**Depends on:** nothing
**Risk:** low

## Why fourth

Independent small plugin. Closes the basic AI-crawlability audit.

## New plugin `packages/application/plugins/robots.mts`

```ts
export type RobotsOptions = {
  /**
   * Fully override the generated content.
   * When set, all other options are ignored.
   */
  content?: string
  /** Extra lines appended after the default rules (e.g. custom Disallow entries). */
  append?: string
}
```

### Default output

```
User-agent: *
Allow: /

# AI crawlers — allowed by default
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: cohere-ai
Allow: /

Sitemap: https://example.com/sitemap.xml
```

- `Sitemap:` line uses `deploymentUrl`. Omitted when `deploymentUrl` is undefined.
- Plugin writes to `<outDir>/robots.txt`.
- Runs only during production builds (`apply: 'build'`).
- When `robots: false` in `SeoOptions`, the plugin is a no-op.

## `SeoOptions` extension

```ts
robots?: RobotsOptions | false  // false = disable robots.txt generation
```

## Wire-up in `rooted-manifest.mts`

Add `robotsPlugin(manifest.webManifest.url, manifest.seo?.robots)` to the plugin list alongside `seoPlugin`.

## Delete hand-written file

Remove `examples/recipe-book/public/robots.txt` — the generated version replaces it.

## Critical files

- `packages/application/plugins/robots.mts` (new)
- `packages/application/src/rooted-manifest.mts` (wire in, extend `SeoOptions`)
- `examples/recipe-book/public/robots.txt` (delete)

## Verification

`pnpm build:dev` in recipe-book. Inspect `dist/robots.txt`. Confirm `Sitemap:` line contains the correct deployment URL. Confirm AI-crawler rules are present.
