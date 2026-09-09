import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { appBasePath, resolveCookiePath } from '../src/web/cookies/cookie-path.mts'

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('appBasePath', () => {
	test('drops the trailing slash from a sub-path base', () => {
		// Arrange
		vi.stubEnv('BASE_URL', '/my-repo/')

		// Act
		const result = appBasePath()

		// Assert
		expect(result).toBe('/my-repo')
	})

	test('keeps a root base as a single slash', () => {
		// Arrange
		vi.stubEnv('BASE_URL', '/')

		// Act
		const result = appBasePath()

		// Assert
		expect(result).toBe('/')
	})

	test('leaves a base that has no trailing slash alone', () => {
		// Arrange
		vi.stubEnv('BASE_URL', '/my-repo')

		// Act
		const result = appBasePath()

		// Assert
		expect(result).toBe('/my-repo')
	})

	test('falls back to the root for a relative base', () => {
		// Arrange
		vi.stubEnv('BASE_URL', './')

		// Act
		const result = appBasePath()

		// Assert
		expect(result).toBe('/')
	})

	test('falls back to the root for a base served from a CDN', () => {
		// Arrange
		vi.stubEnv('BASE_URL', 'https://cdn.example.com/assets/')

		// Act
		const result = appBasePath()

		// Assert
		expect(result).toBe('/')
	})
})

describe('resolveCookiePath — app served from a sub-path', () => {
	beforeEach(() => {
		vi.stubEnv('BASE_URL', '/my-repo/')
	})

	test('uses the app root when no path was given', () => {
		expect(resolveCookiePath(undefined)).toBe('/my-repo')
	})

	test('treats null as unset', () => {
		expect(resolveCookiePath(null)).toBe('/my-repo')
	})

	test('treats an empty string as unset', () => {
		expect(resolveCookiePath('')).toBe('/my-repo')
	})

	test('reads a single slash as the app root', () => {
		expect(resolveCookiePath('/')).toBe('/my-repo')
	})

	test('prefixes the base onto an absolute path', () => {
		expect(resolveCookiePath('/settings')).toBe('/my-repo/settings')
	})

	test('prefixes the base onto a bare path', () => {
		expect(resolveCookiePath('settings')).toBe('/my-repo/settings')
	})

	test('prefixes the base onto an explicitly relative path', () => {
		expect(resolveCookiePath('./settings')).toBe('/my-repo/settings')
	})

	test('drops a trailing slash', () => {
		expect(resolveCookiePath('/settings/')).toBe('/my-repo/settings')
	})

	test('does not add a second copy of the base', () => {
		expect(resolveCookiePath('/my-repo/settings')).toBe('/my-repo/settings')
	})

	test('does not mistake a longer segment for the base', () => {
		expect(resolveCookiePath('/my-repository/settings')).toBe('/my-repo/my-repository/settings')
	})
})

describe('resolveCookiePath — app served from the root', () => {
	beforeEach(() => {
		vi.stubEnv('BASE_URL', '/')
	})

	test('uses the root when no path was given', () => {
		expect(resolveCookiePath(undefined)).toBe('/')
	})

	test('leaves an absolute path alone', () => {
		expect(resolveCookiePath('/settings')).toBe('/settings')
	})

	test('makes a bare path absolute', () => {
		expect(resolveCookiePath('settings')).toBe('/settings')
	})
})

describe('resolveCookiePath — paths outside the app', () => {
	const outsidePaths = ['https://evil.example.com/', '//evil.example.com/x', '../other-app', '/settings/../../escape']

	test.each(outsidePaths)('throws on "%s" in development', (path) => {
		// Arrange
		vi.stubEnv('BASE_URL', '/my-repo/')
		vi.stubEnv('DEV', true)

		// Act, Assert
		expect(() => resolveCookiePath(path)).toThrow(TypeError)
	})

	test.each(outsidePaths)('falls back to the app root on "%s" in production', (path) => {
		// Arrange
		vi.stubEnv('BASE_URL', '/my-repo/')
		vi.stubEnv('DEV', false)

		// Act
		const result = resolveCookiePath(path)

		// Assert
		expect(result).toBe('/my-repo')
	})
})
