// @vitest-environment node
import { describe, expect, test } from 'vitest'

import { redirectToCanonical } from '../src/routed-not-found/response.mts'
import { requestTarget } from '../src/utility/request-url.mts'
import { createRouteMatcher } from '../src/utility/route-matcher.mts'
import { buildRouteTable } from '../src/utility/server-preamble/route-table.mts'

import type { ResolvedConfig } from 'vite'

type Routes = { staticPaths: string[], dynamicPatterns: string[] }

const routeSets = {
	empty: { staticPaths: [], dynamicPatterns: [] },
	slashed: { staticPaths: ['/categories/'], dynamicPatterns: [] },
	// Manual `routes` are never normalised on the way in, so this is the shape
	// that used to match in dev and not in the generated server.
	unslashed: { staticPaths: ['/privacy'], dynamicPatterns: [] },
	oneParameter: { staticPaths: [], dynamicPatterns: ['/recipe/:id/'] },
	twoParameters: { staticPaths: [], dynamicPatterns: ['/blog/:year/:slug/'] },
	parameterAtRoot: { staticPaths: [], dynamicPatterns: ['/:slug/'] },
	parameterInside: { staticPaths: [], dynamicPatterns: ['/recipe/:id/edit/'] },
	overlapping: { staticPaths: ['/recipe/new/'], dynamicPatterns: ['/recipe/:id/'] },
} satisfies Record<string, Routes>

type RouteSetName = keyof typeof routeSets

/** pathname is already base-relative, the way both matchers receive it. */
const routeCases: Array<[RouteSetName, string, boolean]> = [
	['empty', '/', true],
	['empty', '/anything/', false],
	['slashed', '/categories/', true],
	['slashed', '/categories', false],
	['slashed', '/Categories/', false],
	['slashed', '/categories//', false],
	['unslashed', '/privacy/', true],
	['oneParameter', '/recipe/42/', true],
	['oneParameter', '/recipe//', false],
	['oneParameter', '/recipe/42/extra/', false],
	['oneParameter', '/recipe/', false],
	['oneParameter', '/recipe/42.json/', true],
	['twoParameters', '/blog/2026/hello/', true],
	['twoParameters', '/blog/2026/', false],
	['parameterAtRoot', '/anything/', true],
	['parameterAtRoot', '/', true],
	['parameterInside', '/recipe/42/edit/', true],
	['parameterInside', '/recipe/42/', false],
	['overlapping', '/recipe/new/', true],
	['overlapping', '/recipe/42/', true],
]

/** [route set, base, url, expected Location or undefined] */
const redirectCases: Array<[RouteSetName, string, string, string | undefined]> = [
	['slashed', '/', '/categories', '/categories/'],
	['slashed', '/', '/categories/', undefined],
	['unslashed', '/', '/privacy', '/privacy/'],
	['oneParameter', '/', '/recipe/42', '/recipe/42/'],
	['oneParameter', '/', '/recipe/42?sort=name&page=2', '/recipe/42/?sort=name&page=2'],
	['oneParameter', '/', '/recipe/42/?sort=name', undefined],
	// The parameter swallows the dot, but a path that looks like a file is left
	// to the static handler rather than redirected.
	['oneParameter', '/', '/recipe/42.json', undefined],
	['oneParameter', '/', '/icon.svg', undefined],
	['oneParameter', '/', '/index.html', undefined],
	['oneParameter', '/', '/nope', undefined],
	['oneParameter', '/', '/.well-known/acme', undefined],
	['oneParameter', '/', '/@vite/client', undefined],
	['oneParameter', '/my-app/', '/my-app/recipe/42', '/my-app/recipe/42/'],
	['oneParameter', '/my-app/', '/my-app/recipe/42/', undefined],
	['slashed', '/my-app/', '/my-app/categories', '/my-app/categories/'],
	['slashed', '/my-app/', '/elsewhere/categories', undefined],
	// A prefix collision: /my-appx is not inside /my-app.
	['slashed', '/my-app/', '/my-appx/categories', undefined],
]

describe('the generated route table and the typescript matcher agree', () => {
	test.each(routeCases)('%s: isRoute(%s)', async (setName, pathname, expected) => {
		// Arrange
		const routes = routeSets[setName]
		const generated = await evaluateRouteTable('/', routes)

		// Act
		const fromGenerated = generated.isRoute(pathname)
		const fromTypescript = createRouteMatcher(routes)(pathname)

		// Assert -- pinned as well as compared, or two identically broken
		// implementations would agree with each other and pass
		expect(fromGenerated).toBe(expected)
		expect(fromTypescript).toBe(expected)
	})

	test.each(redirectCases)('%s (base %s): canonicalRedirect(%s)', async (setName, base, url, expected) => {
		// Arrange
		const routes = routeSets[setName]
		const generated = await evaluateRouteTable(base, routes)

		// Act
		const fromGenerated = generated.canonicalRedirect(url)
		const fromTypescript = typescriptRedirect(url, base, routes)

		// Assert
		expect(fromGenerated).toBe(expected)
		expect(fromTypescript).toBe(expected)
	})
})

// ---------------------------------------------------------------------------

/**
 * Runs the emitted snippet, so the test drives the code a deployed server
 * really runs rather than asserting on how the source was spelled.
 */
async function evaluateRouteTable(base: string, routes: Routes) {
	const code = `\
const base = ${JSON.stringify(base)}
const staticRoutes = ${JSON.stringify(routes.staticPaths)}
const dynamicRoutes = ${JSON.stringify(routes.dynamicPatterns)}
${buildRouteTable()}
export { isRoute, canonicalRedirect }`

	return await import(`data:text/javascript,${encodeURIComponent(code)}`) as {
		isRoute(pathname: string): boolean
		canonicalRedirect(rawUrl: string): string | undefined
	}
}

/** The pair `canonicalRedirect` is the emitted twin of, behind one signature. */
function typescriptRedirect(rawUrl: string, base: string, routes: Routes): string | undefined {
	const target = requestTarget({ url: rawUrl, method: 'GET', headers: {} }, { base } as ResolvedConfig)
	if (!target) return undefined

	let location: string | undefined
	const response = {
		statusCode: 0,
		setHeader: (name: string, value: string) => { if (name === 'Location') location = value },
		end: () => undefined,
	}
	redirectToCanonical(response as never, target, createRouteMatcher(routes))
	return location
}
