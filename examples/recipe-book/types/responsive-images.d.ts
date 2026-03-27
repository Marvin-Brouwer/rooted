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
