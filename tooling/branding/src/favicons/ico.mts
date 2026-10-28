/** One image in an `.ico`: its pixel size and the PNG it's stored as. */
export type IcoImage = {
	size: number
	png: Buffer
}

const headerSize = 6
const entrySize = 16

/**
 * Packs square PNGs into an `.ico` file.
 *
 * Each image is stored as a PNG, which every browser that still asks for `favicon.ico` reads.
 * Sizes go up to 256.
 *
 * @example
 * ```ts
 * const ico = packIco([{ size: 16, png: small }, { size: 32, png: large }])
 * ```
 */
export function packIco(images: IcoImage[]): Buffer {
	const header = Buffer.alloc(headerSize)
	header.writeUInt16LE(0, 0)
	header.writeUInt16LE(1, 2)
	header.writeUInt16LE(images.length, 4)

	let offset = headerSize + entrySize * images.length
	const entries = images.map(({ size, png }) => {
		const entry = Buffer.alloc(entrySize)
		// A width or height of 0 means 256.
		entry.writeUInt8(size % 256, 0)
		entry.writeUInt8(size % 256, 1)
		entry.writeUInt16LE(1, 4)
		entry.writeUInt16LE(32, 6)
		entry.writeUInt32LE(png.length, 8)
		entry.writeUInt32LE(offset, 12)
		offset += png.length
		return entry
	})

	return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)])
}
