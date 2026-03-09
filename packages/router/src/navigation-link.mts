import { component } from '@rooted/components'
import { navigate } from './navigation.mts'

/**
 * Options for {@link Link}.
 */
export type LinkOptions = {
	/** The destination URL passed to {@link navigate} on click. */
	href: string
	/** CSS class name applied to the rendered `<a>` element. */
	className?: string
	/**
	 * Content rendered inside the anchor.
	 * Pass a plain string, a single DOM {@link Node}, or an array of nodes.
	 */
	children?: string | Node | Node[]
}

/**
 * A built-in component that renders a client-side navigation link.
 *
 * `Link` renders a plain `<a>` element and intercepts clicks to perform
 * SPA navigation via {@link navigate} instead of a full-page reload.
 * The click listener is removed automatically when the component unmounts
 * (bound to the component's lifetime signal).
 *
 * Because the wrapper element uses `display: contents`, `Link` is
 * layout-transparent — the inner `<a>` participates directly in the
 * parent's flex or grid context as if the wrapper were not there.
 *
 * Import from `@rooted/router`:
 * ```ts
 * import { Link } from '@rooted/router'
 * ```
 *
 * @example Text link
 * ```ts
 * create(Link, { href: '/about/', children: 'About us' })
 * ```
 *
 * @example Link wrapping rich content with a CSS class
 * ```ts
 * create(Link, {
 *   href: `/categories/${slug}/`,
 *   className: 'category-card',
 *   children: [
 *     create('div', { className: 'name', textContent: label }),
 *     create('p',   { className: 'count', textContent: `${n} recipes` }),
 *   ],
 * })
 * ```
 *
 * @see {@link navigate} for programmatic navigation without a link element
 * @see {@link LinkOptions}
 */
export const Link = component<LinkOptions>({
	name: 'rooted:navigation-link',
	onMount({ options, append, signal }) {
		const resolvedChildren =
			typeof options.children === 'string'
				? document.createTextNode(options.children)
				: options.children
		const a = append('a', { href: options.href, children: resolvedChildren })
		if (options.className !== undefined) a.className = options.className
		a.addEventListener('click', e => {
			e.preventDefault()
			navigate(options.href)
		}, { signal })
	},
})
