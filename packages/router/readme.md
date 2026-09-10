# [`@rooted/router`](https://www.npmjs.com/package/@rooted/router)

Typed routing for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework.

> [!IMPORTANT]
> This package is still in alpha.

```sh
pnpm add @rooted/router
```

```ts
import { route, token } from '@rooted/router/routes'

export const ArticleRoute = route`/articles/${token('id', Number)}/`({
  async resolve({ create, tokens }) {
    const { Article } = await import('./article.mts')
    return create(Article, { id: tokens.id })
  },
})
```

The Vite plugin collects those files into a generated `_routes.g.mts`. That file only exists after a build, so reference the ambient types in your env declarations to keep the import resolvable before then:

```ts
/// <reference types="@rooted/router/types" />
```

More in the [routing guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/routing.md).
