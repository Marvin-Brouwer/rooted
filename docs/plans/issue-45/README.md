# Issue #45 — Full SEO overhaul: stage index

Each stage is independently shippable. Stages are implemented one at a time, in order, on branch `claude/review-issue-45-Q1Wq1`.

| # | File | Depends on | Status |
|---|------|------------|--------|
| 01 | [01-heading-hierarchy.md](./01-heading-hierarchy.md) | — | not started |
| 02 | [02-route-seo-metadata.md](./02-route-seo-metadata.md) | — | not started |
| 03 | [03-meta-tag-injection.md](./03-meta-tag-injection.md) | 02 | not started |
| 04 | [04-robots-txt.md](./04-robots-txt.md) | — | not started |
| 05 | [05-sitemap-index.md](./05-sitemap-index.md) | — | not started |
| 06 | [06-media-sitemap.md](./06-media-sitemap.md) | 05 | not started |
| 07 | [07-llms-txt.md](./07-llms-txt.md) | 02 | not started |

## Overall acceptance criteria (end of stage 07)

The built recipe-book must:
- Have `sitemap.xml`, `sitemap-index.xml`, `sitemap-icons.xml`, `sitemap-images.xml` — all valid XML.
- Have `robots.txt` with AI-crawler allow rules and `Sitemap:` reference.
- Have `llms.txt` matching the llmstxt.org format.
- Have each static route's `index.html` copy contain a unique `<title>`, `<meta name="description">`, `<link rel="canonical">`, and Open Graph tags.
- Have root `index.html` contain JSON-LD `WebSite` schema.
- Navigate to a dynamic route at runtime → `document.title` updates in the browser.
- `pnpm eslint`, `pnpm build:dev`, `pnpm test` all pass with zero new errors.
