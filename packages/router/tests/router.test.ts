import { describe, test, expect, vi } from 'vitest'

vi.mock('../src/dev-helper.mts', () => ({ devHelper: {} }))

import { routeMetadata, isRoute } from '../src/route.metadata.mts'
import { route } from '../src/route.mts'
import { token, wildcard } from '../src/route.tokens.mts'

describe('RouterCompatibleRoute type', () => {
	test('valid routes pass isRoute check', () => {
		const r = route`/test/`({ resolve: () => Promise.resolve(void 0) })
		expect(isRoute(r)).toBe(true)
	})

	test('routes have the routeMetaData symbol', () => {
		const r = route`/test/${token('id', Number)}/`({ resolve: () => Promise.resolve(void 0) })
		expect(r[routeMetadata]).toBeDefined()
		expect(r[routeMetadata].hasParameterTokens).toBe(true)
	})

	test('wildcard route is flagged correctly', () => {
		const r = route`/search/${wildcard()}/`({ resolve: () => Promise.resolve(void 0) })
		expect(r[routeMetadata].hasWildcard).toBe(true)
	})

	test('non-wildcard route is flagged correctly', () => {
		const r = route`/articles/`({ resolve: () => Promise.resolve(void 0) })
		expect(r[routeMetadata].hasWildcard).toBe(false)
	})
})
