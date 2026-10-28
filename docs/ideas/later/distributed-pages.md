# Distributed pages

Split one site into several smaller front-end apps, one per big vertical slice, behind a single domain. The idea comes from a project that had "micro-apps" on the front end, split by feature. Nothing's built.

Rooted apps are already organised as [vertical slices](../../guide/application-model.md), so the project structure would barely change:

- The main app
  - A page per feature
    - The vertical slices inside it

The main app keeps the regular 404 page, the main UI, and so on. Declaring a page looks like declaring a route, but it produces a stand-alone app, plus a proxy that sends each path to the right app. A transformer could generate that proxy for Fastify, Express or nginx, whichever the user picks.

## Example: a cruise booking site

- The main app
  - `/trips/*` (page)
  - `/book/*` (page)
  - `/my-account/*` (page)

| URL | Served by |
|---|---|
| `https://example-cruise.code/about-us` | The main app, a content page |
| `https://example-cruise.code/accessibility` | The main app, a content page |
| `https://example-cruise.code/trips/` | The trips app, its main route |
| `https://example-cruise.code/trips/middle-of-the-ocean/` | The trips app, the trip's detail page |
| `https://example-cruise.code/book/` | The main app's 404 |
| `https://example-cruise.code/book/middle-of-the-ocean/` | The booking app, the booking page for the trip |
| `https://example-cruise.code/my-account/` | The my-account app, the user's main page |
| `https://example-cruise.code/my-account/trips/` | The my-account app, the user's trip history |
| `https://example-cruise.code/my-account/trips/2026-02-02` | The my-account app, the details of one trip |

Project structure:

```
src/
  _layout/
  _shared/
  content/
    _routes.mts
    about-us.mts
    accessibility.mts
  navigation/
    home.mts
    not-found.mts
  trips/
    _routes.mts
    trips.mts
    trip-detail.mts
  book/
    _routes.mts
    booking-detail.mts
  my-account/
    _routes.mts
    user-profile/
      _routes.mts
      user-profile.mts
      password-reset.mts
      login.mts
      register.mts
    trips/
      _routes.mts
      booking-detail.mts
```

## Sketch

A `page` is declared like a route:

```typescript
// # src/my-account/_routes.mts
export const AccountPage = page`/my-account/`({
	async resolve({ response, tokens }) {
		return UserProfile()
	},
})
```

Routes inside it use the page as their parent, the same way [child routes](../../guide/routing.md#child-routes) work today:

```typescript
// # src/my-account/user-profile/_routes.mts
export const PasswordResetRoute = route`/${AccountPage}/password-reset/`({
	async resolve({ response, tokens }) {
		return PasswordReset()
	},
})
```

## Open questions

- With routing on the server, a route could return a response next to a component: `response('not-allowed', Component())` or `response('redirect', './login')`.
- Response routes rule out static hosts like Azure Static Web Apps or GitHub Pages, which most of the adapters target. That needs thinking through before anything else.
