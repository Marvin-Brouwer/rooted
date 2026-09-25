import type { PageSeoMetadata } from './seo-api.mts'
import type { ManifestOptions } from 'vite-plugin-pwa'

export function injectMetaTags(
	html: string,
	seo: PageSeoMetadata | undefined,
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
		html = replaceOrInsertMeta(html, 'name', 'robots', 'noindex')
	}

	html = injectCanonical(html, canonicalUrl)
	html = injectOgTags(html, seo, canonicalUrl, defaultOgImage)

	return html
}

// Replaces rather than skips: a pre-rendered page already carries the tags the app wrote at runtime,
// and those are built from the pre-renderer's `http://localhost` origin.
export function injectCanonical(html: string, canonicalUrl: string): string {
	return replaceOrInsert(html, /<link[^>]+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${escapeAttribute(canonicalUrl)}" />`)
}

export function injectOgTags(
	html: string,
	seo: PageSeoMetadata | undefined,
	canonicalUrl: string,
	defaultOgImage: string | undefined,
): string {
	if (seo?.title) html = replaceOrInsertMeta(html, 'property', 'og:title', seo.title)
	if (seo?.description) html = replaceOrInsertMeta(html, 'property', 'og:description', seo.description)
	html = replaceOrInsertMeta(html, 'property', 'og:url', canonicalUrl)

	// The page's own image wins, the default only fills a gap
	if (seo?.image) html = replaceOrInsertMeta(html, 'property', 'og:image', seo.image)
	else if (defaultOgImage && !hasMeta(html, 'property', 'og:image'))
		html = insertBeforeHead(html, `\t<meta property="og:image" content="${escapeAttribute(defaultOgImage)}" />`)

	if (!hasMeta(html, 'property', 'og:type'))
		html = insertBeforeHead(html, `\t<meta property="og:type" content="website" />`)

	return html
}

export function injectHeadLinks(
	html: string,
	links: Array<{ rel: string, hreflang?: string, href: string }>,
): string {
	const tags: string[] = []

	for (const link of links) {
		const hreflang = link.hreflang ? ` hreflang="${escapeAttribute(link.hreflang)}"` : ''
		const tag = `<link rel="${escapeAttribute(link.rel)}"${hreflang} href="${escapeAttribute(link.href)}" />`
		const existing = linkPattern(link.rel, link.hreflang)
		if (existing.test(html)) html = html.replace(existing, tag)
		else tags.push(`\t${tag}`)
	}

	if (tags.length === 0) return html
	return insertBeforeHead(html, tags.join('\n'))
}

function linkPattern(relation: string, hreflang: string | undefined): RegExp {
	if (!hreflang) return new RegExp(`<link[^>]+rel=["']${relation}["'][^>]*>`, 'i')
	// Attribute order is not guaranteed, so require both attributes on the same tag
	return new RegExp(`<link(?=[^>]+rel=["']${relation}["'])(?=[^>]+hreflang=["']${hreflang}["'])[^>]*>`, 'i')
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
	return replaceOrInsert(html, pattern, `<meta ${attribute}="${value}" content="${escapeAttribute(content)}" />`)
}

function replaceOrInsert(html: string, pattern: RegExp, tag: string): string {
	if (pattern.test(html)) return html.replace(pattern, tag)
	return insertBeforeHead(html, `\t${tag}`)
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
