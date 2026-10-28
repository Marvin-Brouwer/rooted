/**
 * Writes the README banner and the GitHub social preview to `docs/branding/`.
 *
 * - `banner.svg`: the full-width README banner, with a dark mode.
 * - `banner-narrow.svg`: the README banner for narrow screens, with a fixed shape.
 * - `social-card.svg`: the social preview.
 * - `social-card.png`: the same, rendered for uploading under Settings, General, Social preview.
 *   GitHub doesn't read it from the repository, so upload it again after running this.
 *
 * Change the code shown in both through `src/banners/code-example.mts`.
 */

import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import { bannerNarrow } from './banners/banner-narrow.mts'
import { banner } from './banners/banner.mts'
import { socialCard } from './banners/social-card.mts'

const outputDirectory = path.resolve(import.meta.dirname, '../../../docs/branding')

const socialCardSvg = socialCard()

await writeFile(path.join(outputDirectory, 'banner.svg'), banner())
await writeFile(path.join(outputDirectory, 'banner-narrow.svg'), bannerNarrow())
await writeFile(path.join(outputDirectory, 'social-card.svg'), socialCardSvg)
await sharp(Buffer.from(socialCardSvg)).png().toFile(path.join(outputDirectory, 'social-card.png'))

console.log(`Wrote banner.svg, banner-narrow.svg, social-card.svg and social-card.png to ${path.relative(process.cwd(), outputDirectory)}`)
