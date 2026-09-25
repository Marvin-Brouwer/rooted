// Globals copied from the window onto globalThis. Node built-ins (setTimeout, process, Buffer, URL, …) are intentionally left alone.
// That's also why this isn't @happy-dom/global-registrator: it copies every window property that differs,
// which replaces 33 things Node already has, timers, queueMicrotask, Buffer, URL, crypto and fetch among them.
const WINDOW_GLOBALS = [
	'document', 'customElements',
	'HTMLElement', 'Element', 'Node', 'EventTarget', 'DocumentFragment', 'ShadowRoot',
	'HTMLDivElement', 'HTMLSpanElement', 'HTMLAnchorElement', 'HTMLButtonElement',
	'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'HTMLOptionElement',
	'HTMLImageElement', 'HTMLVideoElement', 'HTMLAudioElement',
	'HTMLParagraphElement', 'HTMLHeadingElement', 'HTMLLinkElement', 'HTMLScriptElement',
	'HTMLStyleElement', 'HTMLMetaElement', 'HTMLTitleElement', 'HTMLBodyElement',
	'HTMLHtmlElement', 'HTMLFormElement', 'HTMLLabelElement', 'HTMLLIElement',
	'HTMLUListElement', 'HTMLOListElement', 'HTMLUnknownElement',
	'HTMLSlotElement', 'HTMLTemplateElement', 'HTMLDialogElement',
	'Text', 'Comment',
	'SVGElement', 'SVGSVGElement', 'SVGGraphicsElement',
	'Event', 'CustomEvent', 'PopStateEvent', 'MouseEvent', 'KeyboardEvent',
	'InputEvent', 'FocusEvent', 'PointerEvent', 'WheelEvent', 'TouchEvent',
	'HashChangeEvent', 'ErrorEvent', 'ProgressEvent', 'SubmitEvent', 'UIEvent',
	'MutationObserver', 'PerformanceObserver', 'IntersectionObserver', 'ResizeObserver',
	'DOMParser', 'XMLSerializer', 'Range', 'Attr', 'NodeList', 'HTMLCollection',
	'CSSStyleSheet',
	'getComputedStyle',
	'requestAnimationFrame', 'cancelAnimationFrame',
] as const

// Node has its own versions of these, so they're only replaced when asked for.
const FETCH_GLOBALS = ['fetch', 'Request', 'Response', 'Headers', 'FormData', 'Blob', 'File'] as const

// Installed as live accessors rather than copied values: `location` and `history` change as the window navigates,
// and Node 21+ defines `globalThis.navigator` as a getter-only property that a plain assignment
// cannot overwrite (it throws in strict mode).
const DYNAMIC_GLOBALS = ['location', 'history', 'navigator', 'screen'] as const

// Puts `window` and its DOM classes onto globalThis, and returns a function that puts back exactly what was there before.
// Captured and restored as property descriptors, not values, so `location` and `navigator` keep their original shape:
// replacing an accessor with a plain value breaks later build code that assigns or deletes them.
// Keys the window doesn't have are skipped, checked with `in`, so a Proxy window that answers every `get` is fine.
// Nothing stops two installs from overlapping, which is why only withDomGlobals calls this.
export function installDomGlobals(window: object, includeFetch = false): () => void {
	const source = window as Record<string, unknown>
	const copied = includeFetch ? [...WINDOW_GLOBALS, ...FETCH_GLOBALS] : WINDOW_GLOBALS
	const saved = captureGlobals(['window', ...DYNAMIC_GLOBALS, ...copied])

	try {
		define('window', { value: window, writable: true, configurable: true })

		for (const key of DYNAMIC_GLOBALS) {
			define(key, { get: () => source[key], configurable: true })
		}

		for (const key of copied) {
			if (!(key in window)) continue
			define(key, { value: source[key], writable: true, configurable: true })
		}
	}
	catch (error) {
		// A half-installed DOM is worse than none
		restoreGlobals(saved)
		throw error
	}

	return () => restoreGlobals(saved)
}

type SavedDescriptors = Map<string, PropertyDescriptor | undefined>

function captureGlobals(keys: readonly string[]): SavedDescriptors {
	const saved: SavedDescriptors = new Map()
	for (const key of keys) {
		saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
	}
	return saved
}

function restoreGlobals(saved: SavedDescriptors): void {
	for (const [key, descriptor] of saved) {
		if (descriptor) Object.defineProperty(globalThis, key, descriptor)
		else Reflect.deleteProperty(globalThis, key)
	}
}

function define(key: string, descriptor: PropertyDescriptor): void {
	Object.defineProperty(globalThis, key, descriptor)
}
