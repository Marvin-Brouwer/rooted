// @vitest-environment node
import { describe, expect, test } from 'vitest'

import { buildRedirectsFile } from '../src/utility/redirects-file.mts'

describe('buildRedirectsFile()', () => {
	test('writes nothing when there are no dynamic routes', () => {
		// Act
		const contents = buildRedirectsFile([], '404.html')

		// Assert -- a catch-all here is what made every unknown path a soft 404
		expect(contents).toBe('')
	})

	test('writes one 200 rule per dynamic pattern', () => {
		// Act
		const contents = buildRedirectsFile(['/recipe/:id/', '/user/:name/'], '404.html')

		// Assert
		expect(contents).toBe('/recipe/:pa  /404.html  200\n/user/:pa  /404.html  200\n')
	})

	test('keeps the literal segments that follow a placeholder', () => {
		// Act
		const contents = buildRedirectsFile(['/user/:name/posts/'], '404.html')

		// Assert
		expect(contents).toBe('/user/:pa/posts  /404.html  200\n')
	})

	test('gives every placeholder in a pattern its own name', () => {
		// Act
		const contents = buildRedirectsFile(['/:year/:month/:slug/'], '404.html')

		// Assert
		expect(contents).toBe('/:pa/:pb/:pc  /404.html  200\n')
	})

	test('renames placeholders to letters, because the format allows nothing else', () => {
		// Act
		const contents = buildRedirectsFile(['/post/:post_id2/'], '404.html')

		// Assert
		expect(contents).toBe('/post/:pa  /404.html  200\n')
	})

	test('honours a fallback file the adapter renamed', () => {
		// Act
		const contents = buildRedirectsFile(['/recipe/:id/'], 'error.html')

		// Assert
		expect(contents).toBe('/recipe/:pa  /error.html  200\n')
	})
})
