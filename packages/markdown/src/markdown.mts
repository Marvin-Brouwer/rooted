import { component } from '@rooted/components'

import type { CssClasses } from '@rooted/components'

/**
 * What the Vite plugin turns a `.md` file into.
 *
 * A module namespace from `import('./about.md')` matches this shape, so it can
 * be passed as {@link MarkdownOptions.source} directly.
 */
export type MarkdownModule = {
	/** The parsed YAML frontmatter block. Cast it to your own shape. */
	frontmatter: Record<string, unknown>
	/** The body, rendered to HTML at build time. */
	html: string
}

/**
 * Content for {@link Markdown}: anything with an `html` property (a transformed
 * `.md` module), or an HTML string.
 *
 * A bare string is **HTML, not markdown**. There's no markdown parser in the
 * browser bundle, on purpose. Rendering happens at build time in the Vite
 * plugin.
 */
export type MarkdownSource = { html: string } | string

/**
 * Options for {@link Markdown}.
 */
export type MarkdownOptions = {
	/** The HTML to render, or a `.md` module to take it from. */
	source: MarkdownSource
	/** Tag for the wrapping element. Defaults to `div`. */
	tag?: keyof HTMLElementTagNameMap
	/** CSS classes applied to the wrapping element. */
	classes?: CssClasses
}

/**
 * Renders pre-rendered HTML into the DOM.
 *
 * Pair it with the Vite plugin (`@rooted/markdown/vite`), which turns `.md`
 * files into modules carrying an `html` export:
 *
 * ```ts
 * import * as about from './about.md'
 *
 * append(create(Markdown, { source: about }))
 * ```
 *
 * For content that differs per locale, hand it whichever module
 * `localization.branch` picked:
 *
 * ```ts
 * const source = await localization.branch({
 *   'en-GB': () => import('./about.en-GB.md'),
 *   'nl-NL': () => import('./about.nl-NL.md'),
 * })
 * append(create(Markdown, { source }))
 * ```
 *
 * The HTML is assigned as-is and is **not sanitised**. Treat `source` the way
 * you'd treat a `<script>` tag: fine for content you control (files in your
 * repo, your own CMS), not for anything a visitor can influence.
 */
export const Markdown = component<MarkdownOptions>({
	name: '@rooted/markdown',
	onMount({ options, append, element }) {
		const { source, tag, classes } = options

		append(
			element(tag ?? 'div', {
				classes,
				// Trusted by contract: the caller owns this HTML, see the TSDoc
				innerHTML: typeof source === 'string' ? source : source.html,
			}),
		)
	},
})
