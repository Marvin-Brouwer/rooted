import { createReadStream } from 'node:fs'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { Logger, Plugin, ResolvedConfig } from 'vite'

const UNSPLASH_URL_RE = /^https:\/\/unsplash\.com\/photos\/([\w-]+)/
const UNSPLASH_ID_RE = /([A-Za-z0-9_-]{11})$/
const VIRTUAL_PREFIX = '\0ri:'
const MIDDLEWARE_PATH = '/__ri__/'

const DEFAULT_WIDTHS = [400, 800, 1200, 1920]

const UNSPLASH_LICENSE = `\
# Unsplash License

Photos downloaded via this plugin are sourced from [Unsplash](https://unsplash.com)
and are subject to the [Unsplash License](https://unsplash.com/license).

## Summary

- All photos can be downloaded and used for **free**
- For **commercial and non-commercial** purposes
- **No permission needed** (though attribution is appreciated)

## Restrictions

- Photos may not be sold without significant modification
- Compiling photos from Unsplash to replicate a similar or competing service is not permitted

For full terms, see https://unsplash.com/license
`

/** 1×1 transparent pixel GIF, used as a placeholder when images can't be loaded. */
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

type ImageEntry = { url: string, width: number }

type Metadata = {
	author: string
	rawUrl: string
}

export type ResponsiveImagesOptions = {
	accessKey: string | undefined
}

export function responsiveImages({ accessKey }: ResponsiveImagesOptions): Plugin {
	let cacheDirectory: string
	let isDevelopment = false
	let logger: Logger
	let licenseWritten = false

	return {
		name: 'recipe-book:responsive-images',
		enforce: 'pre',

		configResolved(config: ResolvedConfig) {
			cacheDirectory = path.join(config.root, '.cache', 'responsive-images')
			isDevelopment = config.command === 'serve'
			logger = config.logger

			if (!accessKey) {
				logger.warn('[responsive-images] UNSPLASH_ACCESS_KEY is not set — imports will use a transparent pixel placeholder')
			}
		},

		configureServer(server) {
			server.middlewares.use(MIDDLEWARE_PATH, (request, response, next) => {
				// URL: /{photoId}/{width}.webp
				const parts = (request.url ?? '').replace(/^\//, '').split('/')
				if (parts.length !== 2) return next()

				const [photoId, file] = parts
				const filePath = path.join(cacheDirectory, photoId, file)

				response.setHeader('Content-Type', 'image/webp')
				response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
				createReadStream(filePath)
					.on('error', () => next())
					.pipe(response)
			})
		},

		transform(code) {
			if (!code.includes('unsplash.com')) return
			// Rewrite `https://unsplash.com/...` import specifiers to a virtual:ri/ prefix
			// so Vite's importAnalysis doesn't treat them as browser-external URLs and
			// skip resolveId entirely.
			return code.replaceAll(
				/(from\s+['"])https:\/\/(unsplash\.com\/photos\/[\w-]+(?:\?[^'"]*)?)/g,
				'$1virtual:ri/https://$2',
			)
		},

		resolveId(id) {
			const bare = id.startsWith('virtual:ri/') ? id.slice('virtual:ri/'.length) : id
			if (UNSPLASH_URL_RE.test(bare.split('?')[0])) {
				return VIRTUAL_PREFIX + bare
			}
		},

		async load(id) {
			if (!id.startsWith(VIRTUAL_PREFIX)) return

			if (!licenseWritten) {
				licenseWritten = true
				await mkdir(cacheDirectory, { recursive: true })
				await writeFile(path.join(cacheDirectory, 'LICENSE.md'), UNSPLASH_LICENSE, 'utf8')
			}

			const rawId = id.slice(VIRTUAL_PREFIX.length)
			const [urlPart, queryPart] = rawId.split('?')

			const slugMatch = UNSPLASH_URL_RE.exec(urlPart)
			if (!slugMatch) return

			const slug = slugMatch[1]
			const photoIdMatch = UNSPLASH_ID_RE.exec(slug)
			if (!photoIdMatch) throw new Error(`[responsive-images] Could not extract photo ID from: ${urlPart}`)
			const photoId = photoIdMatch[1]

			const widths = queryPart
				?.split('&')
				?.find(p => p.startsWith('widths='))
				?.slice('widths='.length)
				?.split(',')
				?.map(Number)
				?.filter(n => n > 0)
				?? DEFAULT_WIDTHS

			if (!accessKey) {
				return buildFallbackModule(widths, urlPart)
			}

			const photoCacheDirectory = path.join(cacheDirectory, photoId)

			let metadata: Metadata
			try {
				metadata = await getOrFetchMetadata(photoId, photoCacheDirectory, accessKey)
				await downloadImages(metadata.rawUrl, photoCacheDirectory, widths)
			}
			catch (error) {
				logger.warn(`[responsive-images] Failed to load photo ${photoId}: ${String(error)} — using placeholder`)
				return buildFallbackModule(widths, urlPart)
			}

			if (isDevelopment) {
				const images: ImageEntry[] = widths.map(width => ({
					url: `${MIDDLEWARE_PATH}${photoId}/${width}.webp`,
					width,
				}))
				return buildModule(images, urlPart, metadata.author)
			}

			// Build mode: emit files as Vite assets
			const images: ImageEntry[] = await Promise.all(widths.map(async (width) => {
				const source = await readFile(path.join(photoCacheDirectory, `${width}.webp`))
				const reference = this.emitFile({
					type: 'asset',
					name: `${photoId}-${width}.webp`,
					source,
				})
				return { url: `import.meta.ROLLUP_FILE_URL_${reference}`, width }
			}))

			return buildModule(images, urlPart, metadata.author)
		},
	}
}

async function getOrFetchMetadata(photoId: string, photoCacheDirectory: string, accessKey: string): Promise<Metadata> {
	const metadataPath = path.join(photoCacheDirectory, 'metadata.json')

	try {
		await access(metadataPath)
		const raw = await readFile(metadataPath, 'utf8')
		return JSON.parse(raw) as Metadata
	}
	catch {
		// Not cached — fetch from Unsplash API
	}

	const response = await fetch(`https://api.unsplash.com/photos/${photoId}`, {
		headers: { Authorization: `Client-ID ${accessKey}` },
	})

	if (!response.ok) {
		throw new Error(`[responsive-images] Unsplash API error ${response.status} for photo ${photoId}`)
	}

	const photo = await response.json() as { urls: { raw: string }, user: { name: string } }
	const metadata: Metadata = {
		rawUrl: photo.urls.raw,
		author: `${photo.user.name} / Unsplash`,
	}

	await mkdir(photoCacheDirectory, { recursive: true })
	await writeFile(metadataPath, JSON.stringify(metadata, undefined, 2), 'utf8')

	return metadata
}

async function downloadImages(rawUrl: string, photoCacheDirectory: string, widths: number[]) {
	await mkdir(photoCacheDirectory, { recursive: true })

	await Promise.all(widths.map(async (width) => {
		const filePath = path.join(photoCacheDirectory, `${width}.webp`)

		try {
			await access(filePath)
			return // already cached
		}
		catch {
			// Download
		}

		const url = `${rawUrl}&w=${width}&fm=webp&q=80&fit=max`
		const response = await fetch(url)

		if (!response.ok) {
			throw new Error(`[responsive-images] Failed to download image at width ${width}: ${response.status}`)
		}

		const buffer = Buffer.from(await response.arrayBuffer())
		await writeFile(filePath, buffer)
	}))
}

function buildModule(images: ImageEntry[], sourceUrl: string, author: string): string {
	// URLs may be `import.meta.ROLLUP_FILE_URL_*` tokens that Rollup resolves
	// only when they appear as real JS expressions — not inside string literals.
	// Emit them as raw expressions so Rollup can replace them correctly.
	const urlExpr = (url: string) => url.startsWith('import.meta.') ? url : JSON.stringify(url)
	const imagesLiteral = '[\n' + images.map(img =>
		`  { "url": ${urlExpr(img.url)}, "width": ${img.width} }`,
	).join(',\n') + '\n]'
	const sourceSetLiteral = '`' + images.map(img => `\${${urlExpr(img.url)}} ${img.width}w`).join(', ') + '`'
	return [
		`export const images = ${imagesLiteral}`,
		`export const sourceSet = ${sourceSetLiteral}`,
		`export const source = ${JSON.stringify(sourceUrl)}`,
		`export const author = ${JSON.stringify(author)}`,
	].join('\n')
}

function buildFallbackModule(widths: number[], sourceUrl: string): string {
	const images: ImageEntry[] = widths.map(width => ({ url: TRANSPARENT_PIXEL, width }))
	const imagesJson = JSON.stringify(images, undefined, 2)
	const sourceSet = images.map(img => `${img.url} ${img.width}w`).join(', ')
	return [
		`if (import.meta.env.DEV) { console.warn('[responsive-images] No UNSPLASH_ACCESS_KEY — using placeholder images for ${sourceUrl}') }`,
		`export const images = ${imagesJson}`,
		`export const sourceSet = ${JSON.stringify(sourceSet)}`,
		`export const source = ${JSON.stringify(sourceUrl)}`,
		`export const author = "Unknown / Unsplash"`,
	].join('\n')
}
