import { describe, test, expect, vi } from 'vitest'

import { route, token } from '@rooted/router/routes'

import { resolveRouteSeo } from '../src/resolve-route-seo.mts'

describe('resolveRouteSeo()', () => {
	test('passes a plain seo object through', async () => {
		// Arrange
		const plainRoute = route`/plain/`({ resolve: () => Promise.resolve(void 0), seo: { title: 'Plain' } })

		// Act
		const seo = await resolveRouteSeo(plainRoute, '/plain/')

		// Assert
		expect(seo).toEqual({ title: 'Plain' })
	})

	test('passes undefined through', async () => {
		// Arrange
		const plainRoute = route`/plain/`({ resolve: () => Promise.resolve(void 0) })

		// Act
		const seo = await resolveRouteSeo(plainRoute, '/plain/')

		// Assert
		expect(seo).toBeUndefined()
	})

	test('evaluates a resolver with tokens recovered from the path', async () => {
		// Arrange
		const documentationRoute = route`/docs/${token('version', [1, 2])}/`({
			resolve: () => Promise.resolve(void 0),
			seo: ({ tokens }) => ({ title: `Docs v${tokens.version}` }),
		})

		// Act
		const seo = await resolveRouteSeo(documentationRoute, '/docs/2/')

		// Assert
		expect(seo?.title).toBe('Docs v2')
	})

	test('spoofs the location at the generated path during evaluation', async () => {
		// Arrange
		let seenHref: string | undefined
		const aboutRoute = route`/${token('locale', ['en-GB', 'nl-NL'])}/about/`({
			resolve: () => Promise.resolve(void 0),
			seo: () => {
				seenHref = location.href
				return { title: 'x' }
			},
		})

		// Act
		await resolveRouteSeo(aboutRoute, '/nl-NL/about/')

		// Assert
		expect(seenHref).toBe('http://localhost/nl-NL/about/')
	})

	test('restores the previous globals after evaluation', async () => {
		// Arrange
		const previousHref = location.href
		const aboutRoute = route`/plain/about/`({
			resolve: () => Promise.resolve(void 0),
			seo: () => ({ title: 'x' }),
		})

		// Act
		await resolveRouteSeo(aboutRoute, '/plain/about/')

		// Assert
		expect(location.href).toBe(previousHref)
		expect(typeof window).not.toBe('undefined')
	})

	test('restores the previous globals when the resolver throws', async () => {
		// Arrange
		const previousHref = location.href
		const brokenRoute = route`/broken/`({
			resolve: () => Promise.resolve(void 0),
			seo: () => { throw new Error('boom') },
		})

		// Act
		const resolving = resolveRouteSeo(brokenRoute, '/broken/')

		// Assert
		await expect(resolving).rejects.toThrow('boom')
		expect(location.href).toBe(previousHref)
	})

	test('supports async resolvers', async () => {
		// Arrange
		const asyncRoute = route`/async/`({
			resolve: () => Promise.resolve(void 0),
			seo: () => Promise.resolve({ title: 'Later' }),
		})

		// Act
		const seo = await resolveRouteSeo(asyncRoute, '/async/')

		// Assert
		expect(seo?.title).toBe('Later')
	})

	test('caches per route and path', async () => {
		// Arrange
		const resolver = vi.fn(() => ({ title: 'Once' }))
		const cachedRoute = route`/cached/`({ resolve: () => Promise.resolve(void 0), seo: resolver })

		// Act
		await resolveRouteSeo(cachedRoute, '/cached/')
		await resolveRouteSeo(cachedRoute, '/cached/')

		// Assert
		expect(resolver).toHaveBeenCalledOnce()
	})
})
