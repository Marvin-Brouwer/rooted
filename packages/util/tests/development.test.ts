import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { formatStackFrame, isDevelopment } from '../src/development.mts'

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
