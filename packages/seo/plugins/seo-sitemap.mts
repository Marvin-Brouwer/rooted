import type { SitemapEntry } from './seo-api.mts'

export function buildSitemapXml(entries: SitemapEntry[]): string {
	const hasImages = entries.some(entry => entry.images && entry.images.length > 0)
	const hasAlternates = entries.some(entry => entry.alternates && entry.alternates.length > 0)
	const namespaces = [
		`xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
		...(hasImages ? [`xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`] : []),
		...(hasAlternates ? [`xmlns:xhtml="http://www.w3.org/1999/xhtml"`] : []),
	]

	return [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<urlset ${namespaces.join(' ')}>`,
		...entries.map(entry => buildUrlElement(entry)),
		`</urlset>`,
	].join('\n')
}

function buildUrlElement({ loc, lastmod, changeFrequency, priority, images, alternates }: SitemapEntry): string {
	const alternateLines = alternates?.map(({ hreflang, href }) =>
		`\t\t<xhtml:link rel="alternate" hreflang="${escapeAttribute(hreflang)}" href="${escapeAttribute(href)}" />`,
	) ?? []

	const imageLines = images?.flatMap(({ loc: imageLoc, title, caption }) => [
		`\t\t<image:image>`,
		`\t\t\t<image:loc>${imageLoc}</image:loc>`,
		...(title ? [`\t\t\t<image:title>${escapeXml(title)}</image:title>`] : []),
		...(caption ? [`\t\t\t<image:caption>${escapeXml(caption)}</image:caption>`] : []),
		`\t\t</image:image>`,
	]) ?? []

	return [
		`\t<url>`,
		`\t\t<loc>${loc}</loc>`,
		...(lastmod ? [`\t\t<lastmod>${lastmod}</lastmod>`] : []),
		...(changeFrequency ? [`\t\t<changefreq>${changeFrequency}</changefreq>`] : []),
		...(priority === undefined ? [] : [`\t\t<priority>${priority.toFixed(1)}</priority>`]),
		...alternateLines,
		...imageLines,
		`\t</url>`,
	].join('\n')
}

export function buildSitemapIndexXml(sitemaps: Array<{ loc: string, lastmod: string }>): string {
	return [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
		...sitemaps.map(({ loc, lastmod }) =>
			`\t<sitemap>\n\t\t<loc>${loc}</loc>\n\t\t<lastmod>${lastmod}</lastmod>\n\t</sitemap>`,
		),
		`</sitemapindex>`,
	].join('\n')
}

function escapeXml(text: string): string {
	return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function escapeAttribute(text: string): string {
	return escapeXml(text).replaceAll('"', '&quot;')
}
