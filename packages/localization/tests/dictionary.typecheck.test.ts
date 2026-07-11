import { test, expect } from 'vitest'

import { template, translation } from '../src/dictionary.mts'

test('translation type probe', () => {
	// Valid: reorder and omit are allowed
	const valid = translation(template`hello ${'lastName'}, ${'firstName'}`, template`hallo ${'firstName'}`)
	expect(valid).toBeDefined()

	// @ts-expect-error a name the key doesn't declare must not compile
	const typo = translation(template`hello ${'lastName'}`, template`hallo ${'typo'}`)
	expect(typo).toBeDefined()

	// @ts-expect-error a plain string is not a template and must not compile
	const plain = translation('hello {name}', 'hallo {name}')
	expect(plain).toBeDefined()

	// @ts-expect-error a value with names needs a key that declares them
	const noKeyNames = translation(template`hello`, template`hallo ${'name'}`)
	expect(noKeyNames).toBeDefined()
})
