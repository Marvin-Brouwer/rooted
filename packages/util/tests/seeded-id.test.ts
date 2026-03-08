import { describe, expect, test } from 'vitest'
import { seededId } from '../src/seeded-id.mts'

describe('seededId', () => {
	test('returns a non-empty string', () => {
		expect(seededId('test')).toBeTruthy()
	})

	test('output contains only base-36 characters (lowercase alphanumeric)', () => {
		const id = seededId('test')
		expect(id).toMatch(/^[0-9a-z]+$/)
	})

	test('output length is between 8 and 14 characters', () => {
		const id = seededId('some-component')
		expect(id.length).toBeGreaterThanOrEqual(8)
		expect(id.length).toBeLessThanOrEqual(14)
	})

	test('empty name still produces a valid id', () => {
		const id = seededId('')
		expect(id).toMatch(/^[0-9a-z]+$/)
		expect(id.length).toBeGreaterThanOrEqual(8)
		expect(id.length).toBeLessThanOrEqual(14)
	})

	test('consecutive calls with the same name return different ids', () => {
		const id1 = seededId('duplicate-name')
		const id2 = seededId('duplicate-name')
		// Counter increments per call so duplicate names produce distinct scope ids
		expect(id1).not.toBe(id2)
	})

	test('consecutive calls with different names return different ids', () => {
		const id1 = seededId('component-a')
		const id2 = seededId('component-b')
		expect(id1).not.toBe(id2)
	})

	test('produces unique ids across many calls', () => {
		const ids = Array.from({ length: 50 }, (_, i) => seededId(`component-${i}`))
		const unique = new Set(ids)
		expect(unique.size).toBe(ids.length)
	})
})
