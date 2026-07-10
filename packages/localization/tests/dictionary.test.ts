import { describe, test, expect, vi, afterEach } from 'vitest'

import { template, parseTemplate, lookupKey } from '../src/dictionary.mts'

afterEach(() => {
	vi.restoreAllMocks()
})

describe('template()', () => {
	test('plain text passes through', () => {
		expect(template`hello`).toBe('hello')
	})

	test('interpolated names become placeholders', () => {
		expect(template`hello ${'name'}`).toBe('hello {name}')
	})

	test('multiple names keep their order', () => {
		expect(template`hello ${'lastName'}, ${'firstName'}`).toBe('hello {lastName}, {firstName}')
	})

	test('literal braces are escaped', () => {
		expect(template`use {braces}`).toBe('use {{braces}}')
	})

	test('invalid parameter name warns in dev', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => void 0)
		expect(template`x ${'bad name'}`).toBe('x {bad name}')
		expect(warn).toHaveBeenCalledOnce()
	})
})

describe('parseTemplate()', () => {
	test('plain text has one part and no names', () => {
		expect(parseTemplate('hello')).toEqual({ parts: ['hello'], names: [] })
	})

	test('placeholders split parts and collect names', () => {
		expect(parseTemplate('hello {name}')).toEqual({ parts: ['hello ', ''], names: ['name'] })
	})

	test('adjacent placeholders produce empty parts', () => {
		expect(parseTemplate('{a}{b}')).toEqual({ parts: ['', '', ''], names: ['a', 'b'] })
	})

	test('escaped braces unescape to literal braces', () => {
		expect(parseTemplate('use {{braces}}')).toEqual({ parts: ['use {braces}'], names: [] })
	})

	test('an unclosed brace is treated as literal text', () => {
		expect(parseTemplate('{unclosed')).toEqual({ parts: ['{unclosed'], names: [] })
	})

	test('round-trips template() output', () => {
		expect(parseTemplate(template`hello ${'lastName'}, ${'firstName'}`))
			.toEqual({ parts: ['hello ', ', ', ''], names: ['lastName', 'firstName'] })
	})
})

describe('lookupKey()', () => {
	test('erases names: dictionary key and call-site parts produce the same key', () => {
		const dictionaryKey = parseTemplate(template`hello ${'lastName'}, ${'firstName'}`)
		// A text call site only has the raw string parts
		const callSiteParts = ['hello ', ', ', '']
		expect(lookupKey(dictionaryKey.parts)).toBe(lookupKey(callSiteParts))
	})

	test('different text parts produce different keys', () => {
		expect(lookupKey(['hello ', ''])).not.toBe(lookupKey(['goodbye ', '']))
	})
})
