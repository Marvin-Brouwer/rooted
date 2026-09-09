/**
 * The route table a generated `server.mjs` matches against: `isRoute`, and the
 * `canonicalRedirect` that sends `/recipe/42` to `/recipe/42/`.
 *
 * This is the emitted twin of `createRouteMatcher` and `redirectToCanonical`,
 * which is why it's generated on its own rather than inline: a test evaluates
 * this snippet and runs the same cases through both, so the built server and
 * `vite dev` can't quietly start disagreeing about what a route is.
 *
 * The emitted code expects `base`, `staticRoutes` and `dynamicRoutes` to already
 * be in scope, and declares `prefix`, `isRoute` and `canonicalRedirect`.
 */
export function buildRouteTable(): string {
	return `\
const prefix = base.replace(/\\/$/, '')

// One canonical URL per route: /recipe/42 redirects to /recipe/42/. Only paths
// that really are routes redirect, so files, and anything the app does not know
// about, are left alone.
const slashed = (value) => value.endsWith('/') ? value : value + '/'
const knownStatic = new Set(['/', ...staticRoutes.map(slashed)])
const knownDynamic = dynamicRoutes.map(route => slashed(route).split('/'))
const isRoute = (pathname) => {
  if (knownStatic.has(pathname)) return true
  const parts = pathname.split('/')
  return knownDynamic.some(pattern =>
    pattern.length === parts.length &&
    pattern.every((segment, index) => segment.startsWith(':') ? parts[index] !== '' : segment === parts[index])
  )
}

const canonicalRedirect = (rawUrl) => {
  const [pathname, search] = rawUrl.split('?')
  if (pathname.endsWith('/') || (pathname.split('/').pop() ?? '').includes('.')) return undefined
  const inBase = prefix === '' ? pathname
    : pathname.startsWith(prefix + '/') ? pathname.slice(prefix.length)
    : undefined
  if (inBase === undefined || !isRoute(inBase + '/')) return undefined
  return pathname + '/' + (search ? '?' + search : '')
}
`
}
