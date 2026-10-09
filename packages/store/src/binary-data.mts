// Values whose contents live in an ArrayBuffer's bytes rather than in own properties: ArrayBuffer itself, every typed array and DataView. None of them survive a structural copy, since the bytes sit in internal slots.
export function isBinaryData(value: object): value is ArrayBuffer | ArrayBufferView {
	return value instanceof ArrayBuffer || ArrayBuffer.isView(value)
}
