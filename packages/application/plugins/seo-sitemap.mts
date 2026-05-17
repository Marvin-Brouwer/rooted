import type { SitemapEntry } from '@rooted/adapter'

export function buildSitemapXml(entries: SitemapEntry[]): string {
	const hasImages = entries.some(entry => entry.images && entry.images.length > 0)
	const namespace = hasImages
		? `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`
		: `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`

	return [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<urlset ${namespace}>`,
		...entries.map(entry => buildUrlElement(entry)),
		`</urlset>`,
	].join('\n')
}

function buildUrlElement({ loc, lastmod, changeFrequency, priority, images }: SitemapEntry): string {
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
