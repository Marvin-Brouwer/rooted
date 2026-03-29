import { cssArtifacts, type CssArtifacts, type CssModule } from './css-artifacts.mts'

/** Map from injected href to its <link> element, for cache-busting on HMR. */
const injectedLinks = new Map<string, HTMLLinkElement>()

/** True when the browser supports `@scope` — detected once at module load time. */
const supportsScope: boolean = await (async () => {
	try {
		const sheet = new CSSStyleSheet()
		await sheet.replace('@scope {}')
		return sheet.cssRules.length > 0
	}
	catch { return false }
})()

export function injectStyles(styles: CssModule) {
	const artifacts = styles[cssArtifacts]
	const href = supportsScope ? artifacts.scoped : artifacts.tagged
	if (injectedLinks.has(href)) return

	// This doesn't use the createElementFactory on purpose
	// It gave really weird chunking errors in DTS
	const link = Object.assign(document.createElement('link'), {
		rel: 'stylesheet',
		href,
	})

	document.head.append(link)
	injectedLinks.set(href, link)
}

function getDisplayStyle(element: Element) {
	if (!('computedStyleMap' in Element.prototype))
		return globalThis.getComputedStyle(element).display

	return element.computedStyleMap()?.get('display')?.toString()
		?? globalThis.getComputedStyle(element).display
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
