// @vitest-environment node
// Runs in plain Node on purpose: route-manifest generation evaluates route files there,
// so a happy-dom environment would hide exactly the crash this guards against.
import { describe, test, expect } from 'vitest'

import { withDomGlobals } from '@rooted/dom-globals'

describe('route manifest evaluation', () => {
	test('the router root barrel can be imported inside withDomGlobals()', async () => {
		// Act: the exact import that crashes route-manifest generation without a DOM.
		// It reaches @rooted/components -> @rooted/elements -> @rooted/events,
		// where a class extends ErrorEvent at module scope.
		const routerModule = await withDomGlobals(() => import('../src/_module/router.mts'))

		// Assert
		expect(routerModule.href).toBeDefined()
		expect(routerModule.Link).toBeDefined()
		expect(typeof window).toBe('undefined')
	})
})
