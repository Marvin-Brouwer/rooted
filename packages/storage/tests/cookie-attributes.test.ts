import { describe, expect, test } from 'vitest'

import { buildCookieString, parseCookieHeader } from '../src/web/cookies/cookie-helper.mts'

describe('buildCookieString', () => {
	test('URL-encodes name and value', () => {
		expect(buildCookieString({ name: 'a b', value: 'c=d; e' }))
			.toBe('a%20b=c%3Dd%3B%20e')
	})

	test('includes Path, Domain, Expires, SameSite when provided', () => {
		const result = buildCookieString({
			name: 'session',
			value: 'abc',
			domain: 'example.com',
			path: '/',
			expires: Date.UTC(2030, 0, 1),
			sameSite: 'lax',
		})

		expect(result).toContain('session=abc')
		expect(result).toContain('Domain=example.com')
		expect(result).toContain('Path=/')
		expect(result).toContain('Expires=')
		expect(result).toContain(new Date(Date.UTC(2030, 0, 1)).toUTCString())
		expect(result).toContain('SameSite=Lax')
	})

	test('SameSite=None auto-adds Secure', () => {
		const result = buildCookieString({ name: 'x', value: '1', sameSite: 'none' })
		expect(result).toContain('SameSite=None')
		expect(result).toContain('Secure')
	})

	test('SameSite=Strict does not add Secure', () => {
		const result = buildCookieString({ name: 'x', value: '1', sameSite: 'strict' })
		expect(result).toContain('SameSite=Strict')
		expect(result).not.toContain('Secure')
	})

	test('omits attributes when undefined', () => {
		expect(buildCookieString({ name: 'x', value: '1' })).toBe('x=1')
	})
})

describe('parseCookieHeader', () => {
	test('returns empty map for empty header', () => {
		expect(parseCookieHeader('').size).toBe(0)
	})

	test('parses a single cookie', () => {
		const parsed = parseCookieHeader('a=1')
		expect(parsed.get('a')).toBe('1')
	})

	test('parses multiple cookies with whitespace', () => {
		const parsed = parseCookieHeader('a=1; b=2;c=3')
		expect(parsed.get('a')).toBe('1')
		expect(parsed.get('b')).toBe('2')
		expect(parsed.get('c')).toBe('3')
	})

	test('URL-decodes names and values', () => {
		const parsed = parseCookieHeader('a%20b=c%3Dd')
		expect(parsed.get('a b')).toBe('c=d')
	})

	test('handles values containing = signs', () => {
		const parsed = parseCookieHeader('token=abc=def=ghi')
		expect(parsed.get('token')).toBe('abc=def=ghi')
	})

	test('skips malformed entries without throwing', () => {
		const parsed = parseCookieHeader('valid=1; %ZZ=broken; other=2')
		expect(parsed.get('valid')).toBe('1')
		expect(parsed.get('other')).toBe('2')
	})
})
