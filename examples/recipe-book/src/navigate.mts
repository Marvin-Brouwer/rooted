import { component } from '@rooted/components'

/**
 * SPA navigation: push a new URL and fire `popstate` so the router re-evaluates.
 */
export function navigate(href: string) {
	history.pushState(null, '', href)
	window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
}

export type NavLinkOptions = {
	href: string
	className?: string
	children?: string | Node | Node[]
}

/**
 * A component that renders an `<a>` navigating without a full page reload.
 * Click listeners are automatically cleaned up when the component unmounts.
 */
export const NavLink = component<NavLinkOptions>({
	name: 'nav-link',
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
