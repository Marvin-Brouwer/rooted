# Distributed pages

I've been on a project where we had "micro-apps" on the front-end, split by high-over vertical slices (or features).

We can support this in the app structure.

- Main APP
  - Page for feature
    - vertical slices

Where the main app has the regular 404 page, main UI etc.
Defining a page is similar to defining a route, however, it will create a stand-alone app, and it will provide the user with a proxy. \
The proxy may be generated with a transformer to be either a fastify, express or nginx proxy, it's in the user's hands.

For example, a cruise booking site;

- Main page
  - /trips/* (page)
  - /book/* (page)
  - /my-account/* (page)

- `https://example-cruise.code/about-us` Shows the main site with some content pages
- `https://example-cruise.code/accessibility` Shows the main site with some content pages
- `https://example-cruise.code/trips/` Shows the main route of the trips app
- `https://example-cruise.code/trips/middle-of-the-ocean/` Shows the detail page of the trip in the trips app
- `https://example-cruise.code/book/` Shows the main 404
- `https://example-cruise.code/book/middle-of-the-ocean/` Shows the booking page of the trip in the booking app
- `https://example-cruise.code/my-account/` Shows the main page of the user-account in the my-account app
- `https://example-cruise.code/my-account/trips/` Shows the trip history of the user in the my-account app
- `https://example-cruise.code/my-account/trips/2026-02-02` Shows the details of specific trip in the my-account app

Project structure:

- `src/`
  - `_layout/`
  - `_shared/`
  - `content/`
    - `_routes.mts`
    - `about-us.mts`
    - `accessibility.mts`
  - `navigation/`
    - `home.mts`
    - `not-found.mts`
  - `trips/`
    - `_routes.mts`
    - `trips.mts`
    - `trip-detail.mts`
  - `book/`
    - `_routes.mts`
    - `booking-detail.mts`
  - `my-account/`
    - `_routes.mts`
    - `user-profile/`
      - `_routes.mts`
      - `user-profile.mts`
      - `password-reset.mts`
      - `login.mts`
      - `register.mts`
    - `trips/`
      - `_routes.mts`
      - `booking-detail.mts`

Api design:

```typescript
// # src/my-account/_routes.mts
export const AccountPage = page`/my-account/`({
	async resolve({ response, tokens }) {
		return UserProfile()
	},
})
```

```typescript
// # src/my-account/user-profile/_routes.mts
export const PasswordResetRoute = route`/${AccountPage}/password-reset/`({
	async resolve({ response, tokens }) {
		return PasswordReset()
	},
})
```

Since we're now routing from the server, perhaps returning responses next to components may be useful? \
This way we can return `response('not-allowed', Component())`, or `response('redirect', './login')`

Additionally, when using response routes, static apps like AzureStaticWebApps or GitHubPages can no longer be generated. So maybe we should think about that first.
