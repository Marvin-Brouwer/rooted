import { href } from '@rooted/router'
import { isClient } from '@rooted/util'

/** Options for `localization.observeDocument`. */
export type ObserveDocumentOptions = {
	/**
	 * Base URL of the deployed site, e.g. `'https://example.com/my-app/'`.
	 * Used to build absolute alternate URLs. Defaults to `location.origin`.
	 */
	deploymentUrl?: string
}

const managedAttribute = 'data-rooted-localization'

/** @internal Creates the observeDocument function for a set of configured locales. */
export function createDocumentObserver(supportedLocales: readonly string[], defaultLocale: string) {
	return function observeDocument(options?: ObserveDocumentOptions): () => void {
		if (!isClient()) return () => { /* nothing to dispose outside the browser */ }

		function update() {
			const path = href.current().pathOnly
			const segment = path.split('/')[1]

			if (!supportedLocales.includes(segment)) {
				removeManagedTags()
				document.documentElement.lang = defaultLocale
				return
			}

			document.documentElement.lang = segment

			const rest = path.slice(1 + segment.length)
			const seen = new Set<Element>()
			for (const locale of supportedLocales) {
				seen.add(upsertLink(locale, toAbsolute(`/${locale}${rest}`, options?.deploymentUrl)))
			}
			seen.add(upsertLink('x-default', toAbsolute(`/${defaultLocale}${rest}`, options?.deploymentUrl)))

			seen.add(upsertMeta('og:locale', toOgLocale(segment)))
			for (const locale of supportedLocales) {
				if (locale === segment) continue
				seen.add(upsertMeta('og:locale:alternate', toOgLocale(locale), true))
			}

			// Drop tags for locales that are no longer configured or applicable
			for (const element of document.head.querySelectorAll(`[${managedAttribute}]`)) {
				if (!seen.has(element)) element.remove()
			}
		}

		window.addEventListener('popstate', update)
		update()

		return () => {
			window.removeEventListener('popstate', update)
			removeManagedTags()
		}
	}
}

// The og format uses an underscore: nl-NL becomes nl_NL
function toOgLocale(locale: string): string {
	return locale.replaceAll('-', '_')
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

function upsertMeta(property: string, content: string, matchContent = false): Element {
	const selector = matchContent
		? `meta[property="${property}"][content="${content}"]`
		: `meta[property="${property}"]`
	const existing = document.head.querySelector(selector)
	if (existing) {
		existing.setAttribute('content', content)
		existing.setAttribute(managedAttribute, '')
		return existing
	}

	const meta = document.createElement('meta')
	meta.setAttribute('property', property)
	meta.setAttribute('content', content)
	meta.setAttribute(managedAttribute, '')
	document.head.append(meta)
	return meta
}

function removeManagedTags() {
	for (const element of document.head.querySelectorAll(`[${managedAttribute}]`)) {
		element.remove()
	}
}
