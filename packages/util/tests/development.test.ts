import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { appendSourceLocation, formatStackFrame, isDevelopment } from '../src/development.mts'

// formatStackFrame strips location.origin from stack frame URLs
beforeAll(() => {
	vi.stubGlobal('location', { origin: 'http://localhost' })
})

afterAll(() => {
	vi.unstubAllGlobals()
})

describe('isDevelopment', () => {
	test('returns a boolean', () => {
		expect(typeof isDevelopment()).toBe('boolean')
	})

	test('returns true in vitest (import.meta.env.DEV is true)', () => {
		expect(isDevelopment()).toBe(true)
	})
})

describe('formatStackFrame', () => {
	test('returns undefined for undefined input', () => {
		expect(formatStackFrame(undefined)).toBeUndefined()
	})

	test('returns undefined for empty string', () => {
		expect(formatStackFrame('')).toBeUndefined()
	})

	test('strips "at " prefix and trims whitespace', () => {
		expect(formatStackFrame('  at somefile.ts  ')).toBe('somefile.ts')
	})

	test('returns path as-is (minus "at ") when no query string', () => {
		expect(formatStackFrame('at src/main.ts')).toBe('src/main.ts')
	})

	test('preserves line and column numbers when no query string', () => {
		expect(formatStackFrame('at src/main.ts:10:5')).toBe('src/main.ts:10:5')
	})

	test('strips query string but keeps line and column', () => {
		expect(formatStackFrame('at src/main.ts?v=abc123:10:5')).toBe('src/main.ts:10:5')
	})

	test('strips complex query string with multiple params', () => {
		expect(formatStackFrame('at path/to/file.ts?hash=abc&v=1:20:3')).toBe('path/to/file.ts:20:3')
	})

	test('strips location.origin prefix from absolute URLs', () => {
		expect(formatStackFrame('at http://localhost/src/main.ts:5:1')).toBe('src/main.ts:5:1')
	})
})

describe('appendSourceLocation', () => {
	test('does not throw', () => {
		expect(() => appendSourceLocation()).not.toThrow()
	})

	test('returns a string when called from a normal test body', () => {
		const result = appendSourceLocation()
		// Node V8 always produces a stack with enough frames in a test context
		expect(typeof result === 'string' || result === undefined).toBe(true)
		// In practice there are always more than 3 frames in vitest, so we get a string
		expect(result).toBeTypeOf('string')
	})

	test('returned string does not start with "at "', () => {
		const result = appendSourceLocation()
		expect(result).not.toMatch(/^at /)
	})

	test('returned string does not contain a query string "?"', () => {
		// Node file paths never have query strings; formatStackFrame would strip them anyway
		const result = appendSourceLocation()
		expect(result).not.toContain('?')
	})
})
