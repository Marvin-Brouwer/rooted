import { describe, test, expect, vi, afterEach } from 'vitest'

import { translation, dictionary, parseTemplate, lookupKey, compileDictionary } from '../src/dictionary.mts'

afterEach(() => {
	vi.restoreAllMocks()
})

describe('translation()', () => {
	test('pairs the key with its translated value', () => {
		// Act
		const result = translation('hello {name}', 'hallo {name}')

		// Assert
		expect(result).toEqual(['hello {name}', 'hallo {name}'])
	})
})

describe('dictionary()', () => {
	test('bundles translations into a dictionary', () => {
		// Arrange
		const greeting = translation('hi', 'hoi')

		// Act
		const example = translation('example', 'voorbeeld')

		// Act
		const result = dictionary(greeting, example)

		// Assert
		expect(result).toEqual([greeting, example])
	})
})

describe('parseTemplate()', () => {
	test('plain text has one part and no names', () => {
		// Act
		const result = parseTemplate('hello')

		// Assert
		expect(result).toEqual({ parts: ['hello'], names: [] })
	})

	test('placeholders split parts and collect names', () => {
		// Act
		const result = parseTemplate('hello {name}')

		// Assert
		expect(result).toEqual({ parts: ['hello ', ''], names: ['name'] })
	})

	test('adjacent placeholders produce empty parts', () => {
		// Act
		const result = parseTemplate('{a}{b}')

		// Assert
		expect(result).toEqual({ parts: ['', '', ''], names: ['a', 'b'] })
	})

	test('escaped braces unescape to literal braces', () => {
		// Act
		const result = parseTemplate('use {{braces}}')

		// Assert
		expect(result).toEqual({ parts: ['use {braces}'], names: [] })
	})

	test('an unclosed brace is treated as literal text', () => {
		// Act
		const result = parseTemplate('{unclosed')

		// Assert
		expect(result).toEqual({ parts: ['{unclosed'], names: [] })
	})
})

describe('lookupKey()', () => {
	test('erases names: dictionary key and call-site parts produce the same key', () => {
		// Arrange
		const dictionaryKey = parseTemplate('hello {lastName}, {firstName}')
		// A text call site only has the raw string parts

		// Act
		const callSiteParts = ['hello ', ', ', '']

		// Act
		const result = lookupKey(dictionaryKey.parts)

		// Assert
		expect(result).toBe(lookupKey(callSiteParts))
	})

	test('different text parts produce different keys', () => {
		// Act
		const result = lookupKey(['hello ', ''])

		// Assert
		expect(result).not.toBe(lookupKey(['goodbye ', '']))
	})
})

describe('compileDictionary()', () => {
	test('a translation referencing an unknown parameter warns in dev', () => {
		// Arrange
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => void 0)

		// Act
		compileDictionary('nl-NL', dictionary(translation('hi {name}', 'hoi {typo}')))

		// Assert
		expect(warn).toHaveBeenCalledOnce()
		expect(warn.mock.calls[0][0]).toContain('{typo}')
		expect(warn.mock.calls[0][0]).toContain('nl-NL')
	})

	test('reordered and omitted parameters do not warn', () => {
		// Arrange
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => void 0)

		// Act
		compileDictionary('nl-NL', dictionary(
			translation('hello {lastName}, {firstName}', 'hallo {firstName} {lastName}'),
			translation('hi {name}', 'hoi'),
		))

		// Assert
		expect(warn).not.toHaveBeenCalled()
	})

	test('does not warn in production', () => {
		// Arrange
		vi.stubEnv('DEV', false)
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => void 0)

		// Act
		compileDictionary('nl-NL', dictionary(translation('hi {name}', 'hoi {typo}')))

		// Assert
		expect(warn).not.toHaveBeenCalled()
		vi.unstubAllEnvs()
	})
})
