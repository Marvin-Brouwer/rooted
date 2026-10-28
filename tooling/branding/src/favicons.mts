/**
 * Writes `favicon.ico` for the docs site to `docs/public/`.
 *
 * It holds the logo tiers the style guide asks for: tier 3 (`r` and a dot) at 16 px, tier 2 (`r` and `d`) at 32 and 48 px.
 * Browsers pick the size they need, so each size gets the tier that's readable at it.
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import { packIco } from './favicons/ico.mts'

const brandingDirectory = path.resolve(import.meta.dirname, '../../../docs/branding')
const outputFile = path.resolve(import.meta.dirname, '../../../docs/public/favicon.ico')

const tiers = [
	{ size: 16, file: 'logo-r-dot.svg' },
	{ size: 32, file: 'logo-rd.svg' },
	{ size: 48, file: 'logo-rd.svg' },
]

/** The logo files are 256 px; rendering them at the target density keeps the small sizes sharp. */
async function render(file: string, size: number) {
	const svg = await readFile(path.join(brandingDirectory, file))
	return sharp(svg, { density: (72 * size) / 256 }).resize(size, size).png().toBuffer()
}

const images = await Promise.all(tiers.map(async ({ size, file }) => ({ size, png: await render(file, size) })))
await writeFile(outputFile, packIco(images))

console.log(`Wrote ${path.relative(process.cwd(), outputFile)}`)
