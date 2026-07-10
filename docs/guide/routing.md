# Routing

Routing in rooted has three pieces:

- `route` declares a URL pattern bound to a component resolver.
- `gate` shows or hides content depending on whether a URL matches.
- `router` picks the best-matching route and renders it.

All three live in `@rooted/router`.

## Declaring a route

`route` is a tagged-template function. The pattern goes in the template string. Typed parameters go in interpolations.

```ts
import { route, token } from '@rooted/router/routes'

export const ArticleRoute = route`/articles/${token('id', Number)}/`({
  resolve: ({ create, tokens }) => create(Article, { id: tokens.id }),
})
```

Patterns must start and end with a `/`. The route is just a value, so you can import it from anywhere to build a link.

`resolve` returns the element to render. It receives `create` (the component factory) and `tokens` (the parsed parameters, typed). It can be `async`, which is how you lazy-load route components.

```ts
async resolve({ create, tokens }) {
  const { Article } = await import('./article.mts')
  return create(Article, { id: tokens.id })
}
```

### Token types

`token('id', Number)` parses the segment as a number. The token type flows through to `tokens.id` (which is typed `number`).

Built-ins: `String`, `Number`, `Boolean`, `BigInt`, `Date`. Pass any of them as the second argument to `token()`.

### Constant values

Pass an array instead of a constructor to only match the listed values. The matched value keeps its literal type.

```ts
export const AboutRoute = route`/${token('locale', ['en-GB', 'nl-NL'])}/about/`({
  resolve: ({ create, tokens }) => create(About, { locale: tokens.locale }),
})
// tokens.locale is 'en-GB' | 'nl-NL'; /de-DE/about/ does not match
```

The array must hold values of one kind, all strings or all numbers. Because the possible values are known, routes whose only dynamic parts are constant tokens are unrolled to concrete paths at build time: each value gets its own prerendered page and sitemap entry. Routes that mix a constant token with a typed token or wildcard stay dynamic.

This is the mechanism behind [`@rooted/localization`](./localization.md), but it isn't tied to locales.

### Wildcard

Use `wildcard()` as the last interpolation to match the rest of the path. Its key is `rest` by default.

```ts
import { route, wildcard } from '@rooted/router/routes'

export const ArchiveRoute = route`/archive/${wildcard()}/`({
  resolve: ({ create, tokens }) => create(Archive, { slug: tokens.rest }),
})
```

Wildcards must come last, and you can have at most one per pattern.

### Child routes

To compose a child URL onto a parent route, interpolate the parent route as the first value:

```ts
import { route, token } from '@rooted/router/routes'

import { ArticleRoute } from '../articles/_routes.mts'

export const CommentsRoute = route`/${ArticleRoute}/comments/`({
  resolve: ({ create, tokens }) => create(Comments, { articleId: tokens.id }),
})
```

The child route inherits the parent's tokens (`tokens.id` is in scope without re-declaring it). Only the first interpolation can be a parent route.

### Returning `undefined`

Returning `undefined` from `resolve` means "this URL does not match this route after all". The router treats it as a non-match and falls through to the `notFound` component. It also blocks shorter parent routes from catching the URL by accident.

This is how you gate dynamic routes on real data:

```ts
async resolve({ create, tokens }) {
  const found = await loadCategory(tokens.slug)
  if (!found) return // 404, instead of rendering with broken data
  return create(Category, { slug: tokens.slug })
}
```

### Per-route SEO

Pass a `seo` field next to `resolve`:

```ts
export const SearchRoute = route`/search/`({
  resolve: ({ create }) => create(Search),
  seo: {
    title: 'Search recipes',
    description: 'Find recipes by keyword, category, or ingredient.',
  },
})
```

See [SEO](./seo.md) for the full set of fields and what happens at build time vs. runtime.

## The router

`router` takes a config object with `home`, `notFound`, and any number of named routes. The names are used only for duplicate detection in development.

```ts
import { router } from '@rooted/router/application'

import { appRoutes } from './_routes.g.mts'
import { Home } from './home.mts'
import { NotFound } from './not-found.mts'

const Router = router({
  home:     Home,
  notFound: NotFound,
  ...appRoutes,
})
```

Mount it like any other component:

```ts
append(Router)
```

### How routes are picked

On every navigation the router evaluates every registered route in parallel. The route whose pattern consumes the most characters wins. If two routes match the same length, the one without a wildcard wins.

A `resolve` that returns `undefined` blocks shorter parent routes from catching the URL on the way down (suppression). This is what makes the "return undefined for 404" pattern safe.

Resolved routes are cached by pathname, so the resolver runs at most once per unique URL.

### Router options

Pass options as the second argument to `create(Router, ...)`:

```ts
create(Router, {
  viewTransition: true,
  scrollBehavior: { scrollToTop: 'on:end' },
  on: {
    navigate(event) {
      if (event.navigationType === 'start') showProgressBar()
      if (event.navigationType === 'end')   hideProgressBar()
    },
  },
})
```

| Option | What it does |
|--------|--------------|
| `viewTransition` | Wrap renders in `document.startViewTransition` when available. |
| `scrollBehavior.scrollToTop` | When to scroll to top: `on:start`, `on:end`, `on:start-and-end` (default), or `skip`. |
| `scrollBehavior.saveScrollBeforeNavigate` | Save scroll position before push navigations so back/forward restores it. Default `true`. |
| `scrollBehavior.target` | A custom scroll container. Defaults to `window`. |
| `on.navigate` | Fires twice per navigation, with `event.navigationType === 'start'` and `'end'`. |
| `on.error` | Fires when a route's `resolve` throws. |
| `seo` | Runtime SEO meta options. See [SEO](./seo.md). |

## Navigation

Two ways to navigate.

### `Link`

`Link` is a component. It renders an `<a>` and intercepts clicks for in-app navigation.

```ts
import { Link } from '@rooted/router'

create(Link, { href: '/about/', children: 'About' })
```

If `target` is set (other than `_self`), the click is not intercepted and the browser handles the link.

To build a typed `href` from a route reference, use `href.for`:

```ts
import { href, Link } from '@rooted/router'

import { ArticleRoute } from '../articles/_routes.mts'

create(Link, {
  href: href.for(ArticleRoute, { id: 42 }),
  children: 'Read article',
})
```

`href.for` requires every parameter the route declares (and any inherited from a parent). TypeScript complains if you forget one.

### `navigate`

`navigate` is the imperative version. Call it from anywhere.

```ts
import { navigate } from '@rooted/router'

navigate('/about/')
navigate(href.for(ArticleRoute, { id: 42 }))
```

There is also a state-only overload that pushes history state without changing the URL. Useful for modal state that should be back-button- aware:

```ts
navigate({ modal: 'confirm' })
```

## Gates

A gate is a self-managing component that mounts and unmounts a piece of UI based on whether a route matches. Gates run independently of the router. They are the right tool when one shell needs to show different sub-content at different URLs.

```ts
import { gate, route, token } from '@rooted/router'

export const ArticleRoute = route`/articles/${token('id', Number)}/`({
  resolve: ({ create }) => create(ArticleShell),
})

const ArticleGate = gate(ArticleRoute, ({ id }) => create(ArticleContent, { id }))

// Inside ArticleShell:
append(ArticleGate)
```

The gate calls its render function when the route matches and removes the rendered content when it stops matching. If the route stays matched but the tokens change (different article id), the content is re-rendered with the new tokens.
