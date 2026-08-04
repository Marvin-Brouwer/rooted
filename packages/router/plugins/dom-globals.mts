import { Window } from 'happy-dom'

// Globals copied from the happy-dom window onto globalThis. Node built-ins
// (setTimeout, process, Buffer, URL, …) are intentionally left alone.
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
	'MutationObserver', 'PerformanceObserver',
	'DOMParser', 'XMLSerializer', 'Range', 'Attr', 'NodeList', 'HTMLCollection',
	'CSSStyleSheet',
	'getComputedStyle',
	'requestAnimationFrame', 'cancelAnimationFrame',
] as const

// Installed as live accessors rather than copied values: `location` and
// `history` change as the window navigates, and Node 21+ defines
// `globalThis.navigator` as a getter-only property that a plain assignment
// cannot overwrite (it throws in strict mode).
const DYNAMIC_GLOBALS = ['location', 'history', 'navigator', 'screen'] as const

// Only one DOM may be installed at a time. Overlapping calls would capture the
// already-installed fake globals as the "previous" ones and restore those,
// leaving a fake DOM behind for the rest of the process.
let queue: Promise<unknown> = Promise.resolve()

type SavedDescriptors = Map<string, PropertyDescriptor | undefined>

/**
 * Runs `evaluate` with a temporary DOM installed on `globalThis`, then restores
 * the environment exactly as it was.
 *
 * Route files are ordinary application modules: importing one can pull in
 * components, and the framework evaluates DOM at module scope (custom element
 * registration, adopted stylesheets, classes extending `HTMLElement` or
 * `ErrorEvent`). Plain Node has none of that, so evaluating a route file there
 * throws before any route metadata can be read. This hands Node a DOM for
 * exactly as long as that evaluation takes.
 *
 * Globals are captured and restored as property descriptors, not values, so
 * anything that existed before keeps its original shape. That matters for
 * `location` and `navigator`: replacing an accessor with a plain value breaks
 * later build code that expects to assign or delete them.
 *
 * Calls are serialized, and the previous environment is restored even when
 * `evaluate` throws.
 *
 * Note: Rollup runs `buildStart` as a parallel hook, so another plugin's async
 * `buildStart` can interleave with the short window where these globals exist.
 * Isolating this in a worker is not an option, because the evaluated routes
 * carry live `resolve`, `match` and `seo` functions that later plugins call.
 */
export async function withDomGlobals<T>(evaluate: () => Promise<T>): Promise<T> {
	const run = queue.then(async () => {
		const window = new Window({ url: 'http://localhost/' })
		const saved = captureGlobals()

		try {
			installGlobals(window as unknown as Record<string, unknown>)
			return await evaluate()
		}
		finally {
			restoreGlobals(saved)
			// Release happy-dom's timers and observers so the build can exit
			await window.happyDOM?.close?.()
		}
	})

	queue = run.catch(() => void 0)
	return run
}

function captureGlobals(): SavedDescriptors {
	const saved: SavedDescriptors = new Map()
	for (const key of ['window', ...DYNAMIC_GLOBALS, ...WINDOW_GLOBALS]) {
		saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
	}
	return saved
}

function installGlobals(window: Record<string, unknown>): void {
	define('window', { value: window, writable: true, configurable: true })

	for (const key of DYNAMIC_GLOBALS) {
		define(key, { get: () => window[key], configurable: true })
	}

	for (const key of WINDOW_GLOBALS) {
		if (window[key] === undefined) continue
		define(key, { value: window[key], writable: true, configurable: true })
	}
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
