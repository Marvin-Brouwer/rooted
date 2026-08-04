# Localization

`@rooted/localization` adds URL-based localization on top of the router. The idea:

- The locale is always in the URL for localized routes (`/nl-NL/about/`). The bare `/` stays free for a language landing page.
- The default language lives inline in your code, at the `text` call sites. It needs no dictionary.
- Every other locale is an overlay dictionary. Missing entries fall back to the default text.

The locale segment is the only part of the path that changes per language, so `/en-GB/about/` and `/nl-NL/about/` share a slug. [Translated URLs and international SEO](#translated-urls-and-international-seo) covers when that's the shape you want and when it isn't.

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

export default dictionary(
  translation('this is an example label', 'dit is een voorbeeld label'),
)
```

Configure once, export the instance, and import it wherever you need it. Dictionaries are wired up as dynamic imports, so the bundler splits each locale into its own chunk: a visitor only downloads the language they're actually reading, and the default language ships no dictionary at all.

```ts
// src/_shared/i18n/localization.mts
import { configureLocalization } from '@rooted/localization'

export const localization = configureLocalization({
  default: 'en-GB',
  dictionaries: {
    'nl-NL': () => import('./dictionaries/nl-NL.mts'),
  },
})
```

The instance also exposes the configured loaders as a readonly map (`localization.dictionaries`), and the locale union as a type. Whenever a component prop or function argument takes a locale, type it as `typeof localization.Locale` and it stays in sync with your configuration:

```ts
import { localization } from '../_shared/i18n/localization.mts'

type GreetingOptions = { locale: typeof localization.Locale } // 'en-GB' | 'nl-NL'
```

## Routes

Put `localization.parameter` right after the leading slash of every localized route. It fills the locale segment of the URL and gives your resolver a typed `tokens.locale`. Start the resolver with `await localization.load()`: navigation already downloads the dictionary chunk in the background, and the await guarantees the first paint is translated (it also keeps prerendered snapshots deterministic).

```ts
import { route } from '@rooted/router/routes'

import { localization } from '../_shared/i18n/localization.mts'

export const AboutRoute = route`/${localization.parameter}/about/`({
  async resolve({ create, tokens }) {
    await localization.load()
    const { About } = await import('./about.mts')
    return create(About, { locale: tokens.locale })
  },
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

### Reacting to a locale change

Route components are rebuilt by navigation, so they pick up the new locale for free. The parts that don't are the ones that outlive a route: an app shell, a menu, a dialog mounted once at startup. Wrap those in `localization.localized`:

```ts
append(
  localization.localized(() => create(MenuContent, { onClose: () => dialog.close() })),
)
```

The callback runs on mount and again whenever the locale changes, and its result replaces whatever was there before. It doesn't run on navigations that keep the same locale, so a menu doesn't churn every time you click a link. The dictionary for the new locale is loaded before it runs, so `text` returns translations rather than falling back to the default language.

It's a component, so the listener is tied to the mount signal. Unmount it and the subscription goes with it; there's nothing to dispose by hand.

The callback receives the new locale if you want it:

```ts
localization.localized(locale => create(Flag, { locale }))
```

For reactions that aren't about swapping DOM (refetching data, updating a title, logging), `load` tells you what happened:

```ts
on('window', 'popstate', async () => {
  const [locale, changed] = await localization.load()
  if (!changed) return
  // the dictionary for `locale` is ready here
})
```

`changed` describes the navigation, not the call, so it reads the same from every caller during one navigation. It's `false` on the first page load, since there's no previous navigation to differ from.

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
export default dictionary(
  translation('hello {lastName}, {firstName}', 'hallo {firstName} {lastName}'),
)
```

```ts
localization.text`hello ${lastName}, ${firstName}`
// en-GB: 'hello Jansen, Sanne'
// nl-NL: 'hallo Sanne Jansen'
```

A translation may reorder the key's parameters or leave some out. Referencing a name the key doesn't declare logs a console warning when the dictionary chunk loads, so a typo like `'hallo {tpyo}'` shows up in the browser console as soon as that language is used in development. Literal braces are escaped as <code v-pre>{{</code> and <code v-pre>}}</code>.

When a translation is missing, the default text renders. In development it's prefixed with `[i18n missing nl-NL]` so gaps are easy to spot; production falls back silently.

`text` reads the locale from the URL at call time. Since the router caches route results per pathname and the locale is part of the path, rendered pages and their translations stay in sync.

## Loading other per-locale content

Dictionaries are for labels. They're the wrong shape for a whole page of prose, an image, a data file, or markup that genuinely differs between languages rather than just saying the same thing in different words. Putting a page of text through `text` means one enormous dictionary key, and it still can't express markup that differs structurally.

`localization.branch` picks one of several loaders and runs only the matching one:

```ts
const source = await localization.branch({
  'en-GB': () => import('./about.en-GB.md'),
  'nl-NL': () => import('./about.nl-NL.md'),
})

append(create(Markdown, { source }))
```

This is not a replacement for `text`. Use it for the big structural things and keep `text` for labels.

You need one entry per configured locale. Leaving one out is a compile error, and so is adding a locale that isn't configured. That's a stronger guarantee than `dictionaries` gives, since `dictionaries` defines the locale set from its own keys rather than checking it against one.

Only the current locale's loader is ever called. Writing them as dynamic imports means each locale ends up in its own chunk and a visitor downloads one of them, the same property dictionary loaders have.

It's generic, so it isn't only for markdown. Anything a loader can resolve to works:

```ts
const hero = await localization.branch({
  'en-GB': () => import('./hero.en-GB.webp'),
  'nl-NL': () => import('./hero.nl-NL.webp'),
})
```

The value comes back untouched, so what you get is whatever the loader resolved to. For a dynamic import that's the module, not its default export. With `.md` files that's what you want, since the markdown plugin exports `html` by name and the module already matches what `Markdown` takes. For anything exported as a default, reach for `.default` yourself:

```ts
const pricing = (await localization.branch({
  'en-GB': () => import('./pricing.en-GB.mts'),
  'nl-NL': () => import('./pricing.nl-NL.mts'),
})).default
```

If the current locale has no entry at runtime, which needs a version skew between the configured locales and the call site, it warns and falls back to the default locale, the same way `text` falls back to the default text. If the default is missing too there's no value left to hand back, so it rejects.

See the [markdown guide](./markdown.md) for the `.md` side of the first example.

## SEO

### Localized titles and descriptions

Route `seo` metadata accepts a [lazy function](./seo.md#lazy-metadata), and `localization.text` inside it translates like anywhere else. The inline text is the dictionary key:

```ts
export const CategoriesRoute = route`/${localization.parameter}/categories/`({
  async resolve({ create }) {
    await localization.load()
    const { Categories } = await import('./categories.mts')
    return create(Categories)
  },
  seo: () => ({
    title: localization.text`Browse categories`,
    description: localization.text`Browse all recipe categories.`,
  }),
})
```

```ts
// src/_shared/i18n/dictionaries/nl-NL.mts
export default dictionary(
  translation('Browse categories', 'Categorieën bekijken'),
  translation('Browse all recipe categories.', 'Bekijk alle receptcategorieën.'),
)
```

This works in both worlds. At runtime the function runs per navigation, after your resolver loaded the dictionary. At build time it runs once per generated page, as if the browser were at that page's URL, and the build plugin preloads every dictionary first. So `/nl-NL/categories/` is prerendered with the Dutch title and `/en-GB/categories/` with the English one.

### Alternates, lang, and og:locale

Localized pages should also declare their language and alternates. Two pieces, use both:

**At runtime**, `observeDocument` keeps the live document current across navigations: the `lang` attribute on `<html>`, one `<link rel="alternate" hreflang>` per locale plus `x-default`, and the `og:locale`/`og:locale:alternate` metas:

```ts
const dispose = localization.observeDocument({ deploymentUrl: 'https://example.com/' })
```

**At build time**, the `localizationSeo` Vite plugin writes the same things into the prerendered HTML (the runtime tags never end up in static files, prerender snapshots only capture the document body):

```ts
// vite.config.mts
import { localizationSeo } from '@rooted/localization/vite'

plugins: [
  generateRouteManifest({ glob: './src/**/_routes.mts', routeManifestPath: './src/_routes.g.mts' }),
  localizationSeo(),
  myAdapter(),
]
```

The plugin reads the locales straight off `localization.parameter`, so it takes no options.

## Translated URLs and international SEO

The locale segment is the part of the path that changes per language. Everything after it is shared:

```
/en-GB/about/
/nl-NL/about/
```

Full international SEO usually wants the whole URL in the reader's language, so the Dutch page would live at `/nl-NL/over-ons/`. This section is about where that line sits, and which side of it your app is on.

### What's already covered

Google's [Managing multi-regional and multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) asks for two things: give every language version its own URL rather than swapping content behind one URL based on a cookie or `Accept-Language`, and connect those versions with hreflang annotations. That's what the locale token and `localizationSeo` do between them, including `x-default`, the `lang` attribute, and `og:locale`. A subdirectory per locale is also the structure most practitioner guides land on, since it keeps everything on one domain.

So the parts that are easy to get wrong, and expensive to fix later, are handled.

### Where it stops

Google's [URL structure best practices](https://developers.google.com/search/docs/crawling-indexing/url-structure) asks for simple, descriptive words in a URL, preferably in the language of the people reading it, and says localized words in URLs are fine as long as they're UTF-8 encoded and escaped properly when you link to them. A shared English slug under a Dutch locale prefix meets the first half of that and not the second.

Worth being precise about how strong this guidance is: Google permits localized URLs, it doesn't require them. Ranking impact from the slug alone is small. The clearer arguments are relevance and trust in the target market, and practitioner guides ([Search Engine Journal on multilingual URL structure](https://www.searchenginejournal.com/multilingual-seo-url-structure/298747/), [Weglot on slug translation](https://www.weglot.com/blog/translate-url)) generally treat translated slugs as the default for that reason. They also note the other side: global brands often keep one slug set deliberately, because it's recognisable across markets and there's only one set of links to maintain.

### When the locale token is the right shape

Most multilingual apps aren't competing for organic search separately in each market, and for those the token is the whole answer with none of the cost:

- Internal tools and anything behind a login, where search engines never see the pages.
- Apps discovered through a store listing, a single brand domain, or word of mouth rather than per-market search.
- Products that keep one slug vocabulary on purpose, so support and documentation can refer to one URL.

You still get correct language delivery, hreflang, `lang`, `og:locale`, per-locale prerendering and sitemap entries. The thing you're giving up is a ranking signal you weren't competing for.

The cost of the other approach is real and permanent: a slug per locale per route, a redirect for every slug you ever change, and a mapping that has to stay in sync with the content forever. That's worth paying when a market is a genuine acquisition channel, and not otherwise.

### If you do need translated slugs

Define the routes per locale yourself, one pattern each, rather than composing with `localization.parameter`. The automatic alternate grouping only covers routes built with the token, so supply the alternates yourself through `addRouteHeadLinks` on the `SeoApi` from `@rooted/adapter`, which is the same seam `localizationSeo` uses.

Everything else in the package keeps working, because none of it depends on the token: `text` reads the locale from the URL, and `load`, `branch` and `localized` all go through `currentLocale`. You'd be replacing the routing half, not the localization half.

### A note on AI answers

It's tempting to assume this matters less now that a lot of traffic arrives through AI answers rather than search results, since training data skews heavily towards English. The evidence doesn't really support dropping translated URLs on that basis. Analysis of [multilingual AI search](https://searchengineland.com/multilingual-regions-ai-search-future-478282) suggests the language of the question reshapes which sources get cited, and points towards local-language coverage alongside English rather than instead of it. This is moving quickly and nobody has good numbers yet, so it's not a reason to decide either way.

## Honest limitations (v1)

- `llms.txt` lists every locale variant, so the same page appears once per language.
- The sitemap gets one entry per locale variant, but no `xhtml:link` alternate annotations, so the hreflang tags in the HTML head are the only place that signal lives. See [#253](https://github.com/Marvin-Brouwer/rooted/issues/253).
- Mixed routes (a locale token plus a typed token or a wildcard) aren't unrolled, so they're not prerendered and not in the sitemap. A typed token has no value set to walk, so there's nothing to enumerate unless the route supplies the values itself. See [#254](https://github.com/Marvin-Brouwer/rooted/issues/254).
- A build-time check for missing dictionary entries doesn't exist yet. Missing translations surface at runtime, in development, with the `[i18n missing]` marker. See [#252](https://github.com/Marvin-Brouwer/rooted/issues/252).
- `dictionaries` doesn't check that you covered every locale, because it's what defines the locale set in the first place. `branch` does check, since by then the locales are known.
- `localized` re-renders its whole subtree on a locale change. There's no partial update, so keep the callback cheap or wrap a smaller part of the tree.
- Path segments other than the locale are shared across locales, so slugs aren't translated. See [Translated URLs and international SEO](#translated-urls-and-international-seo) for what that does and doesn't affect.
- `load`'s `changed` flag relies on localization's own `popstate` listener running first. It's registered when `configureLocalization` runs, so anything registered later (a component's `onMount`, for instance) sees the right value. A module-scope listener registered before localization is imported would see the previous navigation's value.
