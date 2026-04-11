import matter from 'gray-matter'
import { minify, Options as MinifyOptions } from 'html-minifier-terser'
import { marked, type Tokens } from 'marked'

import type { Plugin } from 'vite'

const minifyOptions: MinifyOptions = {
	collapseWhitespace: true,
	removeComments: true,
	removeOptionalTags: true,
	decodeEntities: true,
}

/**
 * A single group of ingredients.
 * When `heading` is set, the items came from an `### h3` sub-section inside
 * the recipe's `## Ingredients` block. A plain recipe with a flat ingredient
 * list will have one group with `heading` left undefined.
 */
type IngredientGroup = {
	heading?: string
	items: string[]
}

/**
 * Transforms `.md` files into plain JS modules at build time (Node.js context).
 * Frontmatter becomes enumerable properties, the ingredients section is pulled
 * out as structured data for the recipe page, and the rest of the body is
 * rendered to HTML under `instructionsHtml`.
 * No Node-specific APIs (Buffer, fs, …) reach the browser bundle.
 */
export function markdownPlugin(): Plugin {
	let isDevelopment = false

	return {
		name: 'vite-plugin:markdown',
		configResolved(config) {
			isDevelopment = config.command === 'serve'
		},
		async transform(code, id) {
			if (!id.endsWith('.md')) return

			const { data, content } = matter(code)
			const tokens = marked.lexer(content)

			const { ingredients, remaining } = extractIngredients(tokens)
			const instructionsHtml = isDevelopment
				? marked.parser(remaining)
				: await minify(marked.parser(remaining), minifyOptions)

			return {
				code: `export default ${JSON.stringify({ ...data, ingredients, instructionsHtml })}`,
				map: undefined,
			}
		},
	}
}

/**
 * Walks the top-level tokens, finds the `## Ingredients` section, and turns
 * its list items into {@link IngredientGroup} values. Anything else (typically
 * `## Instructions`) is returned as `remaining` so the caller can render it
 * back to HTML.
 *
 * `### h3` sub-sections inside the ingredients block become separate groups;
 * a flat list produces a single group with no `heading`.
 */
function extractIngredients(tokens: Tokens.Generic[]) {
	const ingredients: IngredientGroup[] = []
	const remaining: Tokens.Generic[] = []

	let mode: 'other' | 'ingredients' = 'other'
	let currentGroup: IngredientGroup | undefined

	for (const token of tokens) {
		if (token.type === 'heading' && (token as Tokens.Heading).depth === 2) {
			const heading = token as Tokens.Heading
			if (heading.text.trim().toLowerCase() === 'ingredients') {
				mode = 'ingredients'
				currentGroup = undefined
				continue
			}
			mode = 'other'
			remaining.push(token)
			continue
		}

		if (mode === 'other') {
			remaining.push(token)
			continue
		}

		// Ingredients mode
		if (token.type === 'heading' && (token as Tokens.Heading).depth === 3) {
			currentGroup = { heading: (token as Tokens.Heading).text.trim(), items: [] }
			ingredients.push(currentGroup)
			continue
		}

		if (token.type === 'list') {
			if (!currentGroup) {
				currentGroup = { items: [] }
				ingredients.push(currentGroup)
			}
			for (const item of (token as Tokens.List).items) {
				currentGroup.items.push(item.text.trim())
			}
			continue
		}

		// Ignore stray space / paragraph tokens inside the ingredients block.
	}

	return { ingredients, remaining }
}
