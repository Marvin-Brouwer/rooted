import { describe, test, expect, vi } from 'vitest'

import { route, token } from '@rooted/router/routes'

import { resolveRouteSeo } from '../src/resolve-route-seo.mts'

describe('resolveRouteSeo()', () => {
	test('passes a plain seo object through', async () => {
		const r = route`/plain/`({ resolve: () => Promise.resolve(void 0), seo: { title: 'Plain' } })
		expect(await resolveRouteSeo(r, '/plain/')).toEqual({ title: 'Plain' })
	})

	test('passes undefined through', async () => {
		const r = route`/plain/`({ resolve: () => Promise.resolve(void 0) })
		expect(await resolveRouteSeo(r, '/plain/')).toBeUndefined()
	})

	test('evaluates a resolver with tokens recovered from the path', async () => {
		const r = route`/docs/${token('version', [1, 2])}/`({
			resolve: () => Promise.resolve(void 0),
			seo: ({ tokens }) => ({ title: `Docs v${tokens.version}` }),
		})
		expect((await resolveRouteSeo(r, '/docs/2/'))?.title).toBe('Docs v2')
	})

	test('spoofs the location at the generated path during evaluation', async () => {
		let seenHref: string | undefined
		const r = route`/${token('locale', ['en-GB', 'nl-NL'])}/about/`({
			resolve: () => Promise.resolve(void 0),
			seo: () => {
				seenHref = location.href
				return { title: 'x' }
			},
		})

		await resolveRouteSeo(r, '/nl-NL/about/')
		expect(seenHref).toBe('http://localhost/nl-NL/about/')
	})

	test('restores the previous globals after evaluation', async () => {
		const previousHref = location.href
		const r = route`/plain/about/`({
			resolve: () => Promise.resolve(void 0),
			seo: () => ({ title: 'x' }),
		})

		await resolveRouteSeo(r, '/plain/about/')
		expect(location.href).toBe(previousHref)
		expect(typeof window).not.toBe('undefined')
	})

	test('restores the previous globals when the resolver throws', async () => {
		const previousHref = location.href
		const r = route`/broken/`({
			resolve: () => Promise.resolve(void 0),
			seo: () => { throw new Error('boom') },
		})

		await expect(resolveRouteSeo(r, '/broken/')).rejects.toThrow('boom')
		expect(location.href).toBe(previousHref)
	})

	test('supports async resolvers', async () => {
		const r = route`/async/`({
			resolve: () => Promise.resolve(void 0),
			seo: () => Promise.resolve({ title: 'Later' }),
		})
		expect((await resolveRouteSeo(r, '/async/'))?.title).toBe('Later')
	})

	test('caches per route and path', async () => {
		const resolver = vi.fn(() => ({ title: 'Once' }))
		const r = route`/cached/`({ resolve: () => Promise.resolve(void 0), seo: resolver })

		await resolveRouteSeo(r, '/cached/')
		await resolveRouteSeo(r, '/cached/')
		expect(resolver).toHaveBeenCalledOnce()
	})
})
