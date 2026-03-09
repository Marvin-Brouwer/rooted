/// <reference types="vite/client" />

/**
 * Type for markdown recipe files imported directly (e.g. `import pasta from './pasta.md'`).
 * Parsed at build time by the markdownPlugin in vite.config.ts — no browser-side parsing.
 */
declare module '*.md' {
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
		/** Markdown body converted to an HTML string by `marked`. */
		html: string
	}
	export default recipe
}
