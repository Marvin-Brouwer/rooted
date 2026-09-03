// @vitest-environment node
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { createMiddleware } from '../src/middleware.mts'

const middlewareSource = fileURLToPath(new URL('../src/middleware.mts', import.meta.url))

describe('createMiddleware()', () => {
	test('hands the middleware straight back', () => {
		// Arrange
		const handler = () => undefined

		// Act
		const typed = createMiddleware(handler)

		// Assert
		expect(typed).toBe(handler)
	})

	// This entry is imported by the built server and by anything else running a
	// middleware file. A value import here would put the vite plugin, and
	// whatever it drags along, on that startup path again (issue #291).
	test('has no runtime imports', async () => {
		// Arrange
		const source = await readFile(middlewareSource, 'utf8')

		// Act
		const imports = [...source.matchAll(/^import (?!type )/gm)]

		// Assert
		expect(imports, `${path.basename(middlewareSource)} must only use type-only imports`).toEqual([])
	})
})
