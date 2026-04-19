import { isClient } from '@rooted/util'

import type { Route } from './route.mts'
import type { ElementFactory } from '@rooted/components/elements'

/* eslint-disable @typescript-eslint/no-explicit-any */

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
	route: Route<any>,
	currentPath: string,
	options: RouterSeoOptions | undefined,
	elementFactory: ElementFactory,
): void {
	if (!isClient()) return

	const seo = route.getMetadata().seo
	if (!seo) return

	if (seo.title) {
		document.title = options?.titleSuffix
			? `${seo.title}${options.titleSuffix}`
			: seo.title
	}

	setMetaByName('description', seo.description, elementFactory)
	setMetaByName('robots', seo.noIndex ? 'noindex' : undefined, elementFactory)

	const base = options?.deploymentUrl ?? location.origin
	const canonicalUrl = new URL(currentPath, base).href
	setLinkCanonical(canonicalUrl, elementFactory)

	setMetaByProperty('og:title', seo.title, elementFactory)
	setMetaByProperty('og:description', seo.description, elementFactory)
	setMetaByProperty('og:url', canonicalUrl, elementFactory)

	const ogImage = seo.image ?? options?.defaultOgImage
	if (ogImage) setMetaByProperty('og:image', ogImage, elementFactory)
}

function setMetaByName(name: string, content: string | undefined, elementFactory: ElementFactory): void {
	let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
	if (!content) {
		tag?.remove()
		return
	}
	if (!tag) {
		tag = elementFactory('meta', { name, content })
		document.head.append(tag)
		return
	}
	tag.content = content
}

function setMetaByProperty(property: string, content: string | undefined, elementFactory: ElementFactory): void {
	let tag = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
	if (!content) {
		tag?.remove()
		return
	}
	if (!tag) {
		// `property` is an OG attribute, not a standard DOM property, so setAttribute is needed
		tag = elementFactory('meta', { content })
		tag.setAttribute('property', property)
		document.head.append(tag)
		return
	}
	tag.content = content
}

function setLinkCanonical(href: string, elementFactory: ElementFactory): void {
	let tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
	if (!tag) {
		tag = elementFactory('link', { rel: 'canonical', href })
		document.head.append(tag)
		return
	}
	tag.href = href
}
