/**
 * The opening of a generated `server.mjs`, up to the point where the framework
 * instance is created: the imports, `routes.json`, the route table, and the
 * canonical-slash redirect.
 *
 * It lives here because Fastify and Express only differ in how they register
 * handlers. Everything before that is the same, and if the two copies drift then
 * the two servers start disagreeing about what a route is, which is exactly the
 * bug this is meant to prevent.
 *
 * The emitted code has no imports beyond node builtins and whatever
 * `frameworkImports` adds, so a deployed app never needs `@rooted/*` at runtime.
 *
 * Pair it with {@link nodeMiddlewareServer} and `routedNotFound` so `vite dev`
 * answers the same way; `createRouteMatcher` is the TypeScript twin of the
 * `isRoute` this emits, and the two are meant to stay in step.
 *
 * @example
 * ```ts
 * return `${buildServerPreamble({
 *   frameworkImports: `import Fastify from 'fastify'`,
 *   hasMiddleware,
 * })}const app = Fastify()
 * ${middlewareBlock}
 * // ... framework-specific handlers
 * `
 * ```
 */
export function buildServerPreamble(options: {
	/** The framework's own imports, e.g. `import Fastify from 'fastify'`. */
	frameworkImports: string
	/** Whether the adapter wrote a `middleware` folder to load at startup. */
	hasMiddleware: boolean
}): string {
	const fsImport = options.hasMiddleware
		? `import { readFileSync, readdirSync } from 'node:fs'`
		: `import { readFileSync } from 'node:fs'`

	return `\
${fsImport}
import { fileURLToPath } from 'node:url'
import path from 'node:path'
${options.frameworkImports}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { base, staticRoutes, dynamicRoutes, fallback } = JSON.parse(
  readFileSync(path.join(__dirname, 'routes.json'), 'utf8')
)

const prefix = base.replace(/\\/$/, '')
const fallbackHtml = readFileSync(path.join(__dirname, fallback), 'utf8')

// One canonical URL per route: /recipe/42 redirects to /recipe/42/. Only paths
// that really are routes redirect, so files, and anything the app does not know
// about, are left alone.
const knownStatic = new Set(staticRoutes)
const knownDynamic = dynamicRoutes.map(route => route.split('/'))
const isRoute = (pathname) => {
  if (pathname === '/' || knownStatic.has(pathname)) return true
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

/**
 * The startup loop that runs the files an adapter wrote to `dist/middleware`,
 * in lexicographic order, before any of the rooted handlers.
 *
 * Returns an empty string when there is no middleware, so it can be dropped
 * straight into a template.
 */
export function buildMiddlewareBlock(hasMiddleware: boolean): string {
	if (!hasMiddleware) return ''
	return `
// User middleware -- applied before rooted handlers
const middlewareDir = path.join(__dirname, 'middleware')
for (const file of readdirSync(middlewareDir).filter(f => f.endsWith('.mjs')).sort()) {
  const mod = await import(path.join(middlewareDir, file))
  if (mod.default) await mod.default(app)
}
`
}
