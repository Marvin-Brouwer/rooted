# [`@rooted/localization`](https://www.npmjs.com/package/@rooted/localization)

URL-based localization for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework. The locale lives in the URL, translations live in overlay dictionaries, and the default language lives inline in your code.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add @rooted/localization
```

```ts
import { configureLocalization, template } from '@rooted/localization'

export const localization = configureLocalization({
  default: 'en-GB',
  dictionaries: {
    'nl-NL': {
      [template`hello ${'name'}`]: template`hallo ${'name'}`,
    },
  },
})
```

```ts
import { route } from '@rooted/router/routes'

import { localization } from '../_shared/i18n/localization.mts'

export const AboutRoute = route`/${localization.parameter}/about/`({
  resolve: ({ create, tokens }) => create(About, { locale: tokens.locale })
})
```

More in the [localization guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/localization.md).
