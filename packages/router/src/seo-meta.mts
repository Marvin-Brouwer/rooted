import { isClient } from '@rooted/util'

import type { AnyRoute } from './route.mts'
import type { ElementFactory } from '@rooted/components/elements'

/**
 * Options for runtime SEO meta tag injection, passed via `seo` in
 * {@link RouterOptions}.
 *
 * @example
 * ```ts
 * create(Router, {
 *   seo: {
 *     deploymentUrl: 'https://example.com/app/',
 *     titleSuffix: ' | My App',
 *   },
 * })
 * ```
 */
export type RouterSeoOptions = {
	/**
	 * Base URL of the deployed site (e.g. `homepage` from `package.json`).
	 * Used to build the `og:url` and canonical href for dynamic routes.
	 */
	deploymentUrl?: string
	/**
	 * Fallback `og:image` URL when a route has no `seo.image`.
	 * Should be an absolute URL.
	 */
	defaultOgImage?: string
	/**
	 * String appended to every `<title>` set at runtime, e.g. `' | My App'`.
	 * Only applied when the matched route has a `seo.title`.
	 */
	titleSuffix?: string
}

/**
 * Updates `document.title` and the relevant `<meta>` / `<link>` tags in
 * `document.head` to reflect the SEO metadata of the matched route.
 *
 * Called by the router after each successful route match. No-ops when the
 * route has no `seo` metadata or when running outside a browser context.
 */
export function applyRouteSeoMeta(
	route: AnyRoute,
	currentPath: string,
	options: RouterSeoOptions | undefined,
	element: ElementFactory,
): void {
	if (!isClient()) return

	const seo = route.getMetadata().seo
	if (!seo) return

	if (seo.title) {
		document.title = options?.titleSuffix
			? `${seo.title}${options.titleSuffix}`
			: seo.title
	}

	setMetaByName('description', seo.description, element)
	setMetaByName('robots', seo.noIndex ? 'noindex' : undefined, element)

	const base = options?.deploymentUrl ?? location.origin
	const canonicalUrl = new URL(currentPath, base).href
	setLinkCanonical(canonicalUrl, element)

	setMetaByProperty('og:title', seo.title, element)
	setMetaByProperty('og:description', seo.description, element)
	setMetaByProperty('og:url', canonicalUrl, element)

	const ogImage = seo.image ?? options?.defaultOgImage
	if (ogImage) setMetaByProperty('og:image', ogImage, element)
}

function setMetaByName(name: string, content: string | undefined, element: ElementFactory): void {
	let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
	if (!content) {
		tag?.remove()
		return
	}
	if (!tag) {
		tag = element('meta', { name, content })
		document.head.append(tag)
		return
	}
	tag.content = content
}

function setMetaByProperty(property: string, content: string | undefined, element: ElementFactory): void {
	let tag = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
	if (!content) {
		tag?.remove()
		return
	}
	if (!tag) {
		tag = element('meta', { property, content })
		document.head.append(tag)
		return
	}
	tag.content = content
}

function setLinkCanonical(href: string, element: ElementFactory): void {
	let tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
	if (!tag) {
		tag = element('link', { rel: 'canonical', href })
		document.head.append(tag)
		return
	}
	tag.href = href
}
