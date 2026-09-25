// Captured at import, before any window is installed on globalThis
const nodeSetTimeout = globalThis.setTimeout.bind(globalThis)

/**
 * Puts no-op versions of the browser APIs happy-dom lacks or that would keep the build waiting onto `window`.
 * Every `fetch` call stays pending until its entry in `pendingIO` is called, which rejects it with an `AbortError`.
 */
export function installStubs(window: Record<string, unknown>, pendingIO: Array<() => void>): void {
	window['fetch'] = () => new Promise((_resolve: unknown, reject: (error: unknown) => void) => {
		pendingIO.push(() => reject(new DOMException('The operation was aborted', 'AbortError')))
	})
	window['matchMedia'] = (query: string) => ({
		matches: false, media: query, onchange: undefined,
		addListener: () => {}, removeListener: () => {},
		addEventListener: () => {}, removeEventListener: () => {},
		dispatchEvent: () => false,
	})
	window['ResizeObserver'] = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	window['IntersectionObserver'] = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	window['requestAnimationFrame'] = (callback: (time: number) => void) => nodeSetTimeout(() => callback(0), 0)
	window['cancelAnimationFrame'] = clearTimeout
	window['scrollTo'] = () => {}
	window['scroll'] = () => {}
	window['scrollBy'] = () => {}
	// Returns a proxy so any CSS property access returns '' rather than throwing
	window['getComputedStyle'] = () => new Proxy({}, {
		get(_target, property) {
			if (property === 'getPropertyValue') return () => ''
			return ''
		},
	})
	window['PerformanceObserver'] = class {
		observe() {}
		disconnect() {}
		static supportedEntryTypes: string[] = []
	}
}
