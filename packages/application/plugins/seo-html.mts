import type { RouteSeoMetadata } from '@rooted/router/routes'
import type { ManifestOptions } from 'vite-plugin-pwa'

export function injectMetaTags(
	html: string,
	seo: RouteSeoMetadata | undefined,
	canonicalUrl: string,
	defaultOgImage: string | undefined,
	titleSuffix: string | undefined,
): string {
	if (seo?.title) {
		const fullTitle = titleSuffix ? `${seo.title}${titleSuffix}` : seo.title
		html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`)
	}

	if (seo?.description) {
		html = replaceOrInsertMeta(html, 'name', 'description', seo.description)
	}

	if (seo?.noIndex) {
		html = insertBeforeHead(html, `\t<meta name="robots" content="noindex" />`)
	}

	html = injectCanonical(html, canonicalUrl)
	html = injectOgTags(html, seo, canonicalUrl, defaultOgImage)

	return html
}

export function injectCanonical(html: string, canonicalUrl: string): string {
	if (/<link[^>]+rel=["']canonical["']/i.test(html)) return html
	return insertBeforeHead(html, `\t<link rel="canonical" href="${escapeAttribute(canonicalUrl)}" />`)
}

export function injectOgTags(
	html: string,
	seo: RouteSeoMetadata | undefined,
	canonicalUrl: string,
	defaultOgImage: string | undefined,
): string {
	const ogImage = seo?.image ?? defaultOgImage
	const tags: string[] = []

	if (seo?.title && !hasMeta(html, 'property', 'og:title'))
		tags.push(`\t<meta property="og:title" content="${escapeAttribute(seo.title)}" />`)
	if (seo?.description && !hasMeta(html, 'property', 'og:description'))
		tags.push(`\t<meta property="og:description" content="${escapeAttribute(seo.description)}" />`)
	if (!hasMeta(html, 'property', 'og:url'))
		tags.push(`\t<meta property="og:url" content="${escapeAttribute(canonicalUrl)}" />`)
	if (ogImage && !hasMeta(html, 'property', 'og:image'))
		tags.push(`\t<meta property="og:image" content="${escapeAttribute(ogImage)}" />`)
	if (!hasMeta(html, 'property', 'og:type'))
		tags.push(`\t<meta property="og:type" content="website" />`)

	if (tags.length === 0) return html
	return insertBeforeHead(html, tags.join('\n'))
}

export function injectHeadLinks(
	html: string,
	links: Array<{ rel: string, hreflang?: string, href: string }>,
): string {
	const tags: string[] = []

	for (const link of links) {
		if (hasLink(html, link.rel, link.hreflang)) continue
		const hreflang = link.hreflang ? ` hreflang="${escapeAttribute(link.hreflang)}"` : ''
		tags.push(`\t<link rel="${escapeAttribute(link.rel)}"${hreflang} href="${escapeAttribute(link.href)}" />`)
	}

	if (tags.length === 0) return html
	return insertBeforeHead(html, tags.join('\n'))
}

function hasLink(html: string, rel: string, hreflang: string | undefined): boolean {
	if (!hreflang) return new RegExp(`<link[^>]+rel=["']${rel}["']`, 'i').test(html)
	// Attribute order is not guaranteed, so require both attributes on the same tag
	const pattern = new RegExp(`<link(?=[^>]+rel=["']${rel}["'])(?=[^>]+hreflang=["']${hreflang}["'])[^>]*>`, 'i')
	return pattern.test(html)
}

export function injectRootJsonLd(
	html: string,
	webManifest: Partial<ManifestOptions> & { name?: string, description?: string },
	deploymentUrl: string | undefined,
): string {
	if (html.includes('application/ld+json')) return html

	const schema: Record<string, string> = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
	}
	if (webManifest.name) schema['name'] = webManifest.name
	if (webManifest.description) schema['description'] = webManifest.description
	if (deploymentUrl) schema['url'] = deploymentUrl

	const jsonLd = JSON.stringify(schema, undefined, '\t\t')
	return insertBeforeHead(html, `\t<script type="application/ld+json">\n\t${jsonLd}\n\t</script>`)
}

function replaceOrInsertMeta(html: string, attribute: string, value: string, content: string): string {
	const pattern = new RegExp(`<meta[^>]+${attribute}=["']${value}["'][^>]*>`, 'i')
	const replacement = `<meta ${attribute}="${value}" content="${escapeAttribute(content)}" />`
	if (pattern.test(html)) return html.replace(pattern, replacement)
	return insertBeforeHead(html, `\t${replacement}`)
}

function hasMeta(html: string, attribute: string, value: string): boolean {
	return new RegExp(`<meta[^>]+${attribute}=["']${value}["']`, 'i').test(html)
}

function insertBeforeHead(html: string, snippet: string): string {
	return html.replace('</head>', `${snippet}\n</head>`)
}

function escapeHtml(text: string): string {
	return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function escapeAttribute(text: string): string {
	return text.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
}
