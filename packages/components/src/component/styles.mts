/// <reference path="../../node_modules/vite/types/import-meta.d.ts" />

import { create } from '../element-factory.mts'
import { type CssArtifacts, cssArtifacts, type CssModule } from './css-artifacts.mts'

/** Map from injected href to its <link> element, for cache-busting on HMR. */
const injectedLinks = new Map<string, HTMLLinkElement>()

/** True when the browser supports `@scope` — detected once at module load time. */
const supportsScope: boolean = await (async () => {
	try { await new CSSStyleSheet().replace('@scope {}'); return true }
	catch { return false }
})()

export function injectStyles(styles: CssModule) {
	const artifacts = styles[cssArtifacts]
	const href = supportsScope ? artifacts.scoped : artifacts.tagged
	if (injectedLinks.has(href)) return

	const link = create('link', {
		rel: 'stylesheet',
		href,
	})

	document.head.appendChild(link)
	injectedLinks.set(href, link)
}

function getDisplayStyle(element: Element) {
	if (!('computedStyleMap' in Element.prototype))
		return window.getComputedStyle(element, null).display

	return element.computedStyleMap()?.get('display')?.toString()
		?? window.getComputedStyle(element, null).display
}

// In case the style didn't take
export function applyContentStyleFallback(element: HTMLElement) {
	if (getDisplayStyle(element) === 'contents') return

	element.style.setProperty('display', 'contents', 'important')
}

export function applyScope(element: HTMLElement, styles: CssModule | undefined) {
	if (!styles) return

	element.setAttribute('r', styles[cssArtifacts].scopeId)
}

// Dev-mode HMR: when a source CSS file changes, the plugin sends this event
// so we can force-refetch the stylesheet without a full page reload.
import.meta.hot?.on('@rooted/components:css-update', ({ scoped, tagged }: CssArtifacts) => {
	for (const href of [scoped, tagged]) {
		const link = injectedLinks.get(href)
		if (link) link.href = `${href}?t=${Date.now()}`
	}
})
