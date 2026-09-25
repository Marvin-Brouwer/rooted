/** What a route falls back to when its seo doesn't set a title or description. */
export type SeoDefaults = {
	title: string
	description: string
}

/**
 * The title and description from the app's `index.html`, which is what the build leaves on a page whose route doesn't set them.
 *
 * `rootedManifest` puts these in `import.meta.env` at build time. Without it both are empty,
 * so a route without a title gets an empty one.
 */
export function readSeoDefaults(): SeoDefaults {
	const title: unknown = import.meta.env?.ROOTED_DEFAULT_TITLE
	const description: unknown = import.meta.env?.ROOTED_DEFAULT_DESCRIPTION
	return {
		title: typeof title === 'string' ? title : '',
		description: typeof description === 'string' ? description : '',
	}
}
