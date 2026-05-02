import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { Event as HappyEvent, PopStateEvent as HappyPopStateEvent, Window } from 'happy-dom'

import type { ResolvedConfig } from 'vite'

// Capture Node's timer before any globals are overridden
const nodeSetTimeout = globalThis.setTimeout.bind(globalThis)

const SCRIPT_MODULE_RE = /<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i

// Globals copied from the happy-dom window onto globalThis.
// Node.js built-ins (setTimeout, process, Buffer, URL, …) are intentionally excluded.
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
	'FormData', 'Headers', 'Request', 'Response', 'Blob', 'File',
	'CSSStyleSheet',
	'getComputedStyle',
	'requestAnimationFrame', 'cancelAnimationFrame',
	'fetch',
] as const

export type StaticRenderer = {
	render(staticPath: string): Promise<string | undefined>
	dispose(): Promise<void>
}

/**
 * Creates a happy-dom based static renderer for pre-rendering static route HTML.
 *
 * Loads the built JS bundle into a happy-dom window, boots the application,
 * and exposes `render(path)` which navigates to the given path and returns the
 * resulting `document.body.innerHTML`. Call `dispose()` once all routes are
 * rendered to drain pending IO and tear down the happy-dom instance.
 *
 * Returns `undefined` when no module entry script can be found in `index.html`.
 */
export async function createStaticRenderer(
	config: ResolvedConfig,
	outputDirectory: string,
): Promise<StaticRenderer | undefined> {
	const indexHtml = await readFile(path.join(outputDirectory, 'index.html'), 'utf8')

	const scriptMatch = SCRIPT_MODULE_RE.exec(indexHtml)
	if (!scriptMatch) {
		config.logger.warn('[static-renderer] No module script found in built index.html — skipping SSG pre-render')
		return undefined
	}

	const scriptSource = scriptMatch[1]
	const relativeSource = scriptSource.startsWith(config.base)
		? scriptSource.slice(config.base.length)
		: scriptSource.replace(/^\//, '')
	const bundlePath = path.join(outputDirectory, relativeSource)

	const happyWindow = new Window({
		url: `http://localhost${config.base}`,
		settings: {
			disableJavaScriptFileLoading: true,
			disableCSSFileLoading: true,
		},
	})

	const pendingIO: Array<() => void> = []
	installStubs(happyWindow as unknown as Record<string, unknown>, pendingIO)

	// Seed the document body with the app mount point before the bundle boots
	happyWindow.document.body.innerHTML = '<div id="app"></div>'

	const savedGlobals = captureGlobals()
	installGlobals(happyWindow as unknown as Record<string, unknown>)

	try {
		// The bundle reads DOM globals on import — they must be in place first
		await import(pathToFileURL(bundlePath).href)
	}
	catch (error) {
		restoreGlobals(savedGlobals)
		config.logger.warn(`[static-renderer] Bundle load failed: ${String(error)} — skipping SSG pre-render`)
		return undefined
	}

	// One macrotask tick lets the router's async onMount (and all microtask awaits inside) complete
	await tick()

	return {
		async render(staticPath: string): Promise<string | undefined> {
			try {
				happyWindow.history.pushState(undefined, '', config.base + staticPath.slice(1))
				happyWindow.dispatchEvent(new HappyPopStateEvent('popstate', { state: undefined }))
				await tick()
				const body = happyWindow.document.body.innerHTML
				return body || undefined
			}
			catch {
				return undefined
			}
		},

		async dispose(): Promise<void> {
			// Drain pending IO — reject all pending fetch stubs with AbortError
			for (const cancel of pendingIO) cancel()
			pendingIO.length = 0

			// pagehide(persisted=false) triggers the framework's AbortController chain,
			// which aborts component signals and clears all setInterval/setTimeout in components
			happyWindow.dispatchEvent(new HappyEvent('pagehide'))

			// One tick lets the abort microtasks (disconnectedCallback → onUnmount → clearInterval) drain
			await tick()

			const happyDom = (happyWindow as unknown as Record<string, unknown>)['happyDOM']
			if (happyDom !== undefined && typeof happyDom === 'object') {
				const dom = happyDom as Record<string, unknown>
				if (typeof dom['abort'] === 'function') await (dom['abort'] as () => Promise<void>)()
				if (typeof dom['whenAsyncComplete'] === 'function') await (dom['whenAsyncComplete'] as () => Promise<void>)()
			}

			restoreGlobals(savedGlobals)
		},
	}
}

/**
 * Replaces the content of `<div id="app">` in `html` with `snapshot`.
 * The snapshot is inserted verbatim without HTML parsing.
 */
export function injectSnapshot(html: string, snapshot: string): string {
	const open = '<div id="app">'
	const start = html.indexOf(open)
	if (start === -1) return html
	const contentStart = start + open.length
	const end = html.indexOf('</div>', contentStart)
	if (end === -1) return html
	return html.slice(0, contentStart) + snapshot + html.slice(end)
}

// ---------------------------------------------------------------------------

function tick(): Promise<void> {
	return new Promise(resolve => nodeSetTimeout(resolve, 0))
}

function installStubs(window: Record<string, unknown>, pendingIO: Array<() => void>): void {
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
	window['getComputedStyle'] = () => new Proxy({} as Record<string, string>, {
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

function captureGlobals(): Record<string, unknown> {
	const globals = globalThis as unknown as Record<string, unknown>
	const saved: Record<string, unknown> = {
		window: globals['window'],
		location: globals['location'],
		history: globals['history'],
		navigator: globals['navigator'],
		screen: globals['screen'],
	}
	for (const key of WINDOW_GLOBALS) {
		saved[key] = globals[key]
	}
	return saved
}

function installGlobals(window: Record<string, unknown>): void {
	// Proxy so missing properties return a no-op instead of throwing
	;(globalThis as unknown as Record<string, unknown>)['window'] = new Proxy(window, {
		get(target, property): unknown {
			return (Reflect.get(target, property) as unknown) ?? (() => {})
		},
	})

	// Dynamic globals — defineProperty so the getter always returns the live window value
	// after history.pushState mutates location
	for (const key of ['location', 'history', 'navigator', 'screen'] as const) {
		Object.defineProperty(globalThis, key, {
			get: () => window[key],
			configurable: true,
		})
	}

	// Static globals — constructor classes and document
	const globals = globalThis as unknown as Record<string, unknown>
	for (const key of WINDOW_GLOBALS) {
		globals[key] = window[key]
	}
}

function restoreGlobals(saved: Record<string, unknown>): void {
	// Remove the defineProperty descriptors for dynamic globals
	for (const key of ['location', 'history', 'navigator', 'screen'] as const) {
		if (saved[key] === undefined) {
			Reflect.deleteProperty(globalThis, key)
		}
		else {
			Object.defineProperty(globalThis, key, {
				value: saved[key],
				writable: true,
				configurable: true,
			})
		}
	}

	const globals = globalThis as unknown as Record<string, unknown>
	for (const key of ['window', ...WINDOW_GLOBALS] as const) {
		if (saved[key] === undefined) {
			Reflect.deleteProperty(globalThis, key)
		}
		else {
			globals[key] = saved[key]
		}
	}
}
