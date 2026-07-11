# Localization

`@rooted/localization` adds URL-based localization on top of the router. The idea:

- The locale is always in the URL for localized routes (`/nl-NL/about/`). The bare `/` stays free for a language landing page.
- The default language lives inline in your code, at the `text` call sites. It needs no dictionary.
- Every other locale is an overlay dictionary. Missing entries fall back to the default text.

```sh
pnpm add @rooted/localization
```

## Configuring

Localization is a cross-cutting concern, so it belongs in your `_shared` folder. The recommended layout:

```txt
src/_shared/i18n/
  localization.mts          # the configured instance
  dictionaries/
    nl-NL.mts               # one file per locale
```

Each locale gets its own dictionary file, default-exporting a `dictionary`. That keeps translations reviewable per language and makes it obvious what a new locale needs: one new file, one new line in the configuration.

```ts
// src/_shared/i18n/dictionaries/nl-NL.mts
import { dictionary, translation } from '@rooted/localization'

export default dictionary('nl-NL', [
  translation('this is an example label', 'dit is een voorbeeld label'),
])
```

Configure once, export the instance, and import it wherever you need it.

```ts
// src/_shared/i18n/localization.mts
import { configureLocalization } from '@rooted/localization'

import nlNL from './dictionaries/nl-NL.mts'

export const localization = configureLocalization({
  default: 'en-GB',
  dictionaries: [nlNL],
})
```

The instance also exposes the configured dictionaries as a readonly map (`localization.dictionaries`), and the locale union as a type. Whenever a component prop or function argument takes a locale, type it as `typeof localization.Locale` and it stays in sync with your configuration:

```ts
import { localization } from '../_shared/i18n/localization.mts'

type GreetingOptions = { locale: typeof localization.Locale } // 'en-GB' | 'nl-NL'
```

## Routes

Put `localization.parameter` right after the leading slash of every localized route. It fills the locale segment of the URL and gives your resolver a typed `tokens.locale`:

```ts
import { route } from '@rooted/router/routes'

import { localization } from '../_shared/i18n/localization.mts'

export const AboutRoute = route`/${localization.parameter}/about/`({
  resolve: ({ create, tokens }) => create(About, { locale: tokens.locale }),
})
```

Only configured locales match. `/de-DE/about/` is a plain 404, without any filtering code in your resolver. At build time every locale gets its own page: `/en-GB/about/` and `/nl-NL/about/` are each prerendered and listed in the sitemap.

Routes that combine the locale with a typed token (`/${localization.parameter}/recipe/${token('id', Number)}/`) still work at runtime, but stay dynamic at build time. They aren't prerendered or listed in the sitemap.

Under the hood the parameter is a regular [constant-values token](./routing.md#constant-values), so everything from the routing guide applies to it.

### Reading the locale

`localization.currentLocale` parses the first path segment of the current URL. It always returns a usable locale: unknown or missing segments fall back to the default, so components never need null checks.

When you do need to know what the URL actually carried, use `localization.route`:

```ts
localization.route.rawValue // 'de-DE' at /de-DE/about/, undefined at /
localization.route.valid    // true when the segment is a configured locale
localization.route.invalid  // the opposite
```

These are handy in resolvers that take the locale as a plain `String` token, or for logging.

## Translating text

`localization.text` is a tagged template. The template text is the default-language text and doubles as the dictionary key:

```ts
localization.text`this is an example label`
// en-GB: 'this is an example label'
// nl-NL: 'dit is een voorbeeld label'
```

Interpolations are declared by name in the dictionary, which lets a translation reorder them when sentence structure differs:

```ts
// src/_shared/i18n/dictionaries/nl-NL.mts
export default dictionary('nl-NL', [
  translation('hello {lastName}, {firstName}', 'hallo {firstName} {lastName}'),
])
```

```ts
localization.text`hello ${lastName}, ${firstName}`
// en-GB: 'hello Brouwer, Marvin'
// nl-NL: 'hallo Marvin Brouwer'
```

A translation may reorder the key's parameters or leave some out. Referencing a name the key doesn't declare logs a console warning when the localization is configured, so a typo like `'hallo {tpyo}'` shows up in the browser console the moment the app starts in development. Literal braces are escaped as `{{` and `}}`.

When a translation is missing, the default text renders. In development it's prefixed with `[i18n missing nl-NL]` so gaps are easy to spot; production falls back silently.

`text` reads the locale from the URL at call time. Since the router caches route results per pathname and the locale is part of the path, rendered pages and their translations stay in sync.

## SEO

Localized pages should tell search engines about their alternates. Two pieces, use both:

**At runtime**, `observeHreflang` keeps `<link rel="alternate" hreflang>` tags in `document.head` current across navigations:

```ts
const dispose = localization.observeHreflang({ deploymentUrl: 'https://example.com/' })
```

**At build time**, the `localizationSeo` Vite plugin injects the same links into the prerendered HTML (the runtime tags never end up in static files, prerender snapshots only capture the document body):

```ts
// vite.config.mts
import { localizationSeo } from '@rooted/localization/vite'

plugins: [
  generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
  localizationSeo(),
  myAdapter(),
]
```

Each prerendered locale variant gets one link per configured locale plus an `x-default` pointing at the default locale. The plugin reads the locales straight off `localization.parameter`, so it takes no options.

## Honest limitations (v1)

- Per-route `seo.title` and `seo.description` are single values; prerendered locale variants share them. Setting them with `localization.text` doesn't help: the `seo` object is evaluated once when the route module loads, not once per URL, so every variant would get the same text. Locale-aware route metadata (a lazy `seo` evaluated per path) is future work.
- `llms.txt` lists every locale variant with the same title.
- The sitemap gets one entry per locale variant, but no `xhtml:link` alternate annotations yet; the hreflang tags in the HTML head carry that signal.
- Mixed routes (locale token plus a typed token) aren't unrolled, so they're not prerendered and not in the sitemap.
- A build-time check for missing dictionary entries doesn't exist yet. Missing translations surface at runtime, in development, with the `[i18n missing]` marker.
