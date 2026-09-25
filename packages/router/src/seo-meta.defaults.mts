import { environment } from '@rooted/util'

/** What a route falls back to when its seo doesn't set a title or description. */
export type SeoDefaults = {
	title: string | undefined
	description: string | undefined
}

/**
 * The title and description from the app's `index.html`, which is what the build leaves on a page whose route doesn't set them.
 *
 * `rootedManifest` puts these in `import.meta.env` at build time. Without it, this reads the document as it is right now,
 * which is the same thing unless the page was a pre-rendered static route: the build swaps that page's title for the route's own.
 * So call it once, before the router changes anything.
 */
export function readSeoDefaults(): SeoDefaults {
	const title: unknown = import.meta.env?.ROOTED_DEFAULT_TITLE
	const description: unknown = import.meta.env?.ROOTED_DEFAULT_DESCRIPTION
	if (typeof title === 'string' || typeof description === 'string') {
		return {
			title: typeof title === 'string' && title !== '' ? title : undefined,
			description: typeof description === 'string' && description !== '' ? description : undefined,
		}
	}

	if (!environment.hasDom) return { title: undefined, description: undefined }
	return {
		title: document.title || undefined,
		description: document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content || undefined,
	}
}
