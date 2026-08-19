# [`@rooted/localization`](https://www.npmjs.com/package/@rooted/localization)

URL-based localization for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework. The locale lives in the URL, translations live in overlay dictionaries, and the default language lives inline in your code.

The locale segment is the only part of the path that changes per language, so `/en-GB/about/` and `/nl-NL/about/` share a slug. That's the right shape for most multilingual apps; if you're competing for organic search per market you probably want translated slugs too, which the guide covers under [translated URLs and international SEO](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/localization.md#translated-urls-and-international-seo).

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add @rooted/localization
```

```ts
import { configureLocalization } from '@rooted/localization'

export const localization = configureLocalization({
  default: 'en-GB',
  dictionaries: {
    'nl-NL': () => import('./dictionaries/nl-NL.mts'),
  },
})
```

```ts
// dictionaries/nl-NL.mts
import { dictionary, translation } from '@rooted/localization'

export default dictionary(
  translation('hello {name}', 'hallo {name}'),
)
```

```ts
import { route } from '@rooted/router/routes'

import { localization } from '../_shared/i18n/localization.mts'

export const AboutRoute = route`/${localization.parameter}/about/`({
  resolve: ({ create, tokens }) => create(About, { locale: tokens.locale })
})
```

More in the [localization guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/localization.md).
