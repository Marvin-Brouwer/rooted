import { href } from '@rooted/router'
import { isClient } from '@rooted/util'

/** Options for `localization.observeHreflang`. */
export type ObserveHreflangOptions = {
	/**
	 * Base URL of the deployed site, e.g. `'https://example.com/my-app/'`.
	 * Used to build absolute alternate URLs. Defaults to `location.origin`.
	 */
	deploymentUrl?: string
}

const managedAttribute = 'data-rooted-localization'

/** @internal Creates the observeHreflang function for a set of configured locales. */
export function createHreflangObserver(supportedLocales: readonly string[], defaultLocale: string) {
	return function observeHreflang(options?: ObserveHreflangOptions): () => void {
		if (!isClient()) return () => { /* nothing to dispose outside the browser */ }

		function update() {
			const path = href.current().pathOnly
			const segment = path.split('/')[1]

			if (!supportedLocales.includes(segment)) {
				removeManagedLinks()
				return
			}

			const rest = path.slice(1 + segment.length)
			const seen = new Set<Element>()
			for (const locale of supportedLocales) {
				seen.add(upsertLink(locale, toAbsolute(`/${locale}${rest}`, options?.deploymentUrl)))
			}
			seen.add(upsertLink('x-default', toAbsolute(`/${defaultLocale}${rest}`, options?.deploymentUrl)))

			// Drop tags for locales that are no longer configured
			for (const element of document.head.querySelectorAll(`link[${managedAttribute}]`)) {
				if (!seen.has(element)) element.remove()
			}
		}

		window.addEventListener('popstate', update)
		update()

		return () => {
			window.removeEventListener('popstate', update)
			removeManagedLinks()
		}
	}
}

function toAbsolute(path: string, deploymentUrl: string | undefined): string {
	// href.path re-applies the app base the router stripped from the current path
	const pathWithBase = href.path(path).href
	return new URL(pathWithBase, deploymentUrl ?? location.origin).href
}

function upsertLink(hreflang: string, url: string): Element {
	const existing = document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)
	if (existing) {
		existing.setAttribute('href', url)
		existing.setAttribute(managedAttribute, '')
		return existing
	}

	const link = document.createElement('link')
	link.setAttribute('rel', 'alternate')
	link.setAttribute('hreflang', hreflang)
	link.setAttribute('href', url)
	link.setAttribute(managedAttribute, '')
	document.head.append(link)
	return link
}

function removeManagedLinks() {
	for (const element of document.head.querySelectorAll(`link[${managedAttribute}]`)) {
		element.remove()
	}
}
