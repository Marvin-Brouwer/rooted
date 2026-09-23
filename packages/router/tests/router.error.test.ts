import { afterEach, beforeEach, describe, test, expect, vi } from 'vitest'

vi.mock('../src/dev-helper.mts', () => ({ devHelper: {} }))

import { NavigationErrorEvent } from '../src/navigate-event.mts'
import { route } from '../src/route.mts'
import { reportRouteError } from '../src/router.error.mts'

const broken = route`/broken/`({ resolve: () => Promise.reject(new Error('boom')) })

let reportError: ReturnType<typeof vi.fn>

beforeEach(() => {
	reportError = vi.fn()
	vi.stubGlobal('reportError', reportError)
})

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('reportRouteError', () => {
	test('the handler receives a NavigationErrorEvent with the error, route and href', () => {
		// Arrange
		const error = new Error('boom')
		const handler = vi.fn()

		// Act
		reportRouteError(handler, error, broken, '/broken/')

		// Assert
		const event = handler.mock.calls[0]?.[0] as NavigationErrorEvent
		expect(event).toBeInstanceOf(NavigationErrorEvent)
		expect(event).toMatchObject({ detail: error, route: broken, href: '/broken/' })
	})

	test('an error the handler leaves unhandled is passed to reportError', () => {
		// Arrange
		const error = new Error('boom')

		// Act
		reportRouteError(() => {}, error, broken, '/broken/')

		// Assert
		expect(reportError).toHaveBeenCalledExactlyOnceWith(error)
	})

	test('setting errorHandled keeps the error away from reportError', () => {
		// Arrange
		const handler = (event: NavigationErrorEvent) => { event.errorHandled = true }

		// Act
		reportRouteError(handler, new Error('boom'), broken, '/broken/')

		// Assert
		expect(reportError).not.toHaveBeenCalled()
	})

	test('without a handler the error is passed to reportError', () => {
		// Arrange
		const error = new Error('boom')

		// Act
		reportRouteError(undefined, error, broken, '/broken/')

		// Assert
		expect(reportError).toHaveBeenCalledExactlyOnceWith(error)
	})

	test('a handler that throws is reported instead of escaping', () => {
		// Arrange
		const handlerError = new Error('handler broke')
		const handler = () => { throw handlerError }

		// Act
		const act = () => reportRouteError(handler, new Error('boom'), broken, '/broken/')

		// Assert
		expect(act).not.toThrow()
		expect(reportError).toHaveBeenCalledWith(handlerError)
	})
})
