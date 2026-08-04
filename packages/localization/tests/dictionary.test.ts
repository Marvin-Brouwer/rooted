import { describe, test, expect, vi, afterEach } from 'vitest'

import { translation, dictionary, parseTemplate, lookupKey, compileDictionary } from '../src/dictionary.mts'

afterEach(() => {
	vi.restoreAllMocks()
})

describe('translation()', () => {
	test('pairs the key with its translated value', () => {
		expect(translation('hello {name}', 'hallo {name}')).toEqual(['hello {name}', 'hallo {name}'])
	})
})

describe('dictionary()', () => {
	test('bundles translations into a dictionary', () => {
		const greeting = translation('hi', 'hoi')
		const example = translation('example', 'voorbeeld')
		expect(dictionary(greeting, example)).toEqual([greeting, example])
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
})

describe('lookupKey()', () => {
	test('erases names: dictionary key and call-site parts produce the same key', () => {
		const dictionaryKey = parseTemplate('hello {lastName}, {firstName}')
		// A text call site only has the raw string parts
		const callSiteParts = ['hello ', ', ', '']
		expect(lookupKey(dictionaryKey.parts)).toBe(lookupKey(callSiteParts))
	})

	test('different text parts produce different keys', () => {
		expect(lookupKey(['hello ', ''])).not.toBe(lookupKey(['goodbye ', '']))
	})
})

describe('compileDictionary()', () => {
	test('a translation referencing an unknown parameter warns in dev', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => void 0)
		compileDictionary('nl-NL', dictionary(translation('hi {name}', 'hoi {typo}')))
		expect(warn).toHaveBeenCalledOnce()
		expect(warn.mock.calls[0][0]).toContain('{typo}')
		expect(warn.mock.calls[0][0]).toContain('nl-NL')
	})

	test('reordered and omitted parameters do not warn', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => void 0)
		compileDictionary('nl-NL', dictionary(
			translation('hello {lastName}, {firstName}', 'hallo {firstName} {lastName}'),
			translation('hi {name}', 'hoi'),
		))
		expect(warn).not.toHaveBeenCalled()
	})

	test('does not warn in production', () => {
		vi.stubEnv('DEV', false)
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => void 0)
		compileDictionary('nl-NL', dictionary(translation('hi {name}', 'hoi {typo}')))
		expect(warn).not.toHaveBeenCalled()
		vi.unstubAllEnvs()
	})
})
