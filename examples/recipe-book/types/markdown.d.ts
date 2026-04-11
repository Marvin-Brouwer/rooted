/**
 * Type for markdown recipe files imported directly (e.g. `import pasta from './pasta.md'`).
 * Parsed at build time by the markdownPlugin in vite.config.ts — no browser-side parsing.
 */

declare module '*.md' {
	type IngredientGroup = {
		heading?: string
		items: string[]
	}

	const recipe: {
		title: string
		category: string
		tags: string[]
		servings: number
		prepTime: number
		cookTime: number
		difficulty: 'easy' | 'medium' | 'hard'
		featured: boolean
		description: string
		/** Ingredients parsed into groups. Flat lists produce a single group with no heading. */
		ingredients: IngredientGroup[]
		/** Everything outside the ingredients block, rendered to HTML by `marked`. */
		instructionsHtml: string
	}
	export default recipe
}
