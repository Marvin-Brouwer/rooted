/// <reference types="vite/client" />
/// <reference types="@rooted/components/css-loader/styles" />

/**
 * Type for markdown recipe files imported directly (e.g. `import pasta from './pasta.md'`).
 * Parsed at build time by the markdownPlugin in vite.config.ts — no browser-side parsing.
 */
declare module 'https://unsplash.com/photos/*' {
	/** Responsive image url list. */
	export const images: Array<{ url: string, width: number }>
	/** Responsive image source string for use in a `srcset` attribute. */
	export const sourceSet: string,
	/** The original Unsplash photo page URL. */
	export const source: string
	/** Photographer attribution string, e.g. `"Name / Unsplash"`. */
	export const author: string
}

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
