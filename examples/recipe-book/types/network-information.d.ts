declare global {
	type EffectiveConnectionType
		= 'slow-2g'
		| '2g'
		| '3g'
		| '4g'

	interface NetworkInformation extends EventTarget {
		readonly downlink: number // Mbps estimate
		readonly effectiveType: EffectiveConnectionType
		readonly rtt: number // ms estimate
		readonly saveData: boolean

		// Optional / less consistently supported
		readonly downlinkMax?: number
		readonly type?:
			| 'bluetooth'
			| 'cellular'
			| 'ethernet'
			| 'none'
			| 'wifi'
			| 'wimax'
			| 'other'
			| 'unknown'

		onchange: ((this: NetworkInformation, event: Event) => unknown) | null

		addEventListener(
			type: 'change',
			listener: (this: NetworkInformation, event: Event) => unknown,
			options?: boolean | AddEventListenerOptions
		): void

		removeEventListener(
			type: 'change',
			listener: (this: NetworkInformation, event: Event) => unknown,
			options?: boolean | EventListenerOptions
		): void
	}

	interface Navigator {
		readonly connection?: NetworkInformation
	}
}
// eslint-disable-next-line unicorn/require-module-specifiers
export {}
