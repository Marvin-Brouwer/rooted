# Markdown

`@rooted/markdown` renders markdown files to HTML at build time and gives you a component to put that HTML in the DOM. The parsing happens in the Vite plugin, so no markdown parser ends up in your bundle.

It's a small package. If you need markdown parsed in the browser (content typed by a user, or fetched from an API at runtime), this isn't it: bring your own parser and hand the resulting HTML to the component.

```sh
pnpm add @rooted/markdown
```

## The plugin

Register `rootedMarkdown` alongside your other plugins:

```ts
// vite.config.mts
import { rootedMarkdown } from '@rooted/markdown/vite'

export default rootedManifest({
  plugins: [
    rootedMarkdown(),
    generateRouteManifest({ /* ... */ }),
  ],
})
```

Then tell TypeScript what a `.md` import is, in whichever file holds your ambient references:

```ts
// src/vite-env.d.ts
/// <reference types="vite/client" />
/// <reference types="@rooted/markdown/vite/types" />
```

Each `.md` file becomes a module with two exports. The YAML frontmatter block becomes `frontmatter`, and everything after it is rendered to HTML as `html`:

```md
---
title: About us
tags: [company, team]
---

# About us

We make **things**.
```

```ts
import { frontmatter, html } from './about.md'

frontmatter // { title: 'About us', tags: ['company', 'team'] }
html        // '<h1>About us</h1><p>We make <strong>things</strong>.'
```

`frontmatter` is typed `Record<string, unknown>`, because the plugin has no idea what you put in there. Cast it where you use it:

```ts
const { title } = frontmatter as { title: string }
```

There's no per-file frontmatter typing yet. If you have a lot of structured frontmatter, a small wrapper that validates and casts once is worth the trouble.

### Options

`minify` controls whether the rendered HTML is minified. It defaults to on for builds and off for the dev server, so what you read in devtools matches the file you wrote. Pass it explicitly to override:

```ts
rootedMarkdown({ minify: false })
```

### Imports with a query

`./about.md?raw` and `./about.md?url` are left alone for Vite to handle, so `?raw` still gives you the markdown source rather than the rendered HTML.

## The component

`Markdown` takes a `source` and renders it:

```ts
import { Markdown } from '@rooted/markdown'
import * as about from './about.md'

append(create(Markdown, {
  source: about
}))
```

Passing the module namespace works because `html` is a named export, so the module already has the shape `source` wants. You can also pass an object or a plain string:

```ts
create(Markdown, {
  source: { html: '<p>Hello</p>' }
})
create(Markdown, {
  source: '<p>Hello</p>'
})
```

A bare string is **HTML, not markdown**. `source: '# Hello'` renders a literal `# Hello`, because there's no parser in the browser to turn it into a heading.

`tag` and `classes` control the wrapper element, which is a `div` by default:

```ts
create(Markdown, {
  source: about,
  tag: 'article',
  classes: styles.prose
})
```

### About trust

The component assigns the HTML directly. It does not sanitise it, and nothing else in rooted does either.

That's fine for what this package is built for: files in your repository, which went through code review like the rest of your source. It is not fine for anything a visitor can influence.

> [!IMPORTANT]
> If your markdown comes from user input, or from a CMS that accepts it, sanitise it before it reaches the component.

## Translated content

The pattern this was built for is a long-form page that exists in several languages. Write one file per locale and let [`localization.branch`](./localization.md#loading-other-per-locale-content) pick:

```ts
// src/about/about.mts
import { Markdown } from '@rooted/markdown'

import { localization } from '../_shared/i18n/localization.mts'

export const About = component({
  name: 'about-page',
  async onMount({ append, create }) {
    const source = await localization.branch({
      'en-GB': () => import('./about.en-GB.md'),
      'nl-NL': () => import('./about.nl-NL.md'),
    })

    append(create(Markdown, {
      source
    }))
  },
})
```

Only the current locale's file is fetched, and each one is its own chunk, so a visitor downloads one translation rather than all of them.

Leaving out a configured locale is a compile error, which is the main reason to use `branch` here instead of a hand-written `switch`.

Since this page is a route component, navigation rebuilds it and the content follows the locale on its own. A markdown block living somewhere persistent, like a help panel in the app shell, needs [`localization.localized`](./localization.md#reacting-to-a-locale-change) instead:

```ts
append(
  localization.localized(async () => {
    const source = await localization.branch({
      'en-GB': () => import('./help.en-GB.md'),
      'nl-NL': () => import('./help.nl-NL.md'),
    })
    return create(Markdown, {
      source
    })
  }),
)
```

## Honest limitations (v1)

- Frontmatter is `Record<string, unknown>`. There's no way to declare its shape per file or per directory.
- No syntax highlighting for fenced code blocks. `marked` emits `<pre><code class="language-ts">`, so a CSS-only highlighter works, but nothing ships with the package.
- The renderer isn't configurable. You can't add `marked` extensions or override how a token renders. The recipe-book example writes its own plugin for exactly that reason, since it turns `` `[200 g]` `` into a custom element.
- No sanitisation, as above.
- Markdown is only parsed at build time. Content that arrives at runtime has to be rendered to HTML some other way before it reaches the component.
