import { component } from '@rooted/components'
import { navigate } from './navigation.mts'

/**
 * @todo write docs.
 */
export type LinkOptions = {
	href: string
	className?: string
	children?: string | Node | Node[]
}

/**
 * @todo write docs.
 *
 * A component that renders an `<a>` navigating without a full page reload.
 * Click listeners are automatically cleaned up when the component unmounts.
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
