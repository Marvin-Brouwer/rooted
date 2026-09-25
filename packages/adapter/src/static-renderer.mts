import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { Event as HappyEvent, PopStateEvent as HappyPopStateEvent, Window } from 'happy-dom'

import { installDomGlobals } from '@rooted/dom-globals'

import { installStubs } from './static-renderer/stubs.mts'

import type { ResolvedConfig } from 'vite'

// Captured at import, before any window is installed on globalThis
const nodeSetTimeout = globalThis.setTimeout.bind(globalThis)

const SCRIPT_MODULE_RE = /<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i

export type StaticRenderer = {
	render(staticPath: string): Promise<string | undefined>
	dispose(): Promise<void>
}

/**
 * Creates a happy-dom based static renderer for pre-rendering static route HTML.
 *
 * Loads the built JS bundle into a happy-dom window, boots the application,
 * and exposes `render(path)` which navigates to the given path and returns the resulting `document.body.innerHTML`.
 * Call `dispose()` once all routes are rendered to drain pending IO and tear down the happy-dom instance.
 * Until then the DOM stays installed on `globalThis`, so call it in a `finally`.
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
		config.logger.warn('[static-renderer] No module script found in built index.html. Skipping SSG pre-render.')
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

	// Proxied so a missing property on `window` is a no-op function instead of a throw
	const noOpWindow = new Proxy(happyWindow, {
		get(target, property): unknown {
			return (Reflect.get(target, property) as unknown) ?? (() => {})
		},
	})
	const restoreGlobals = installDomGlobals(noOpWindow, { fetch: true })

	try {
		// The bundle reads DOM globals on import, so they must be in place first.
		await import(pathToFileURL(bundlePath).href)

		// One macrotask tick lets the router's async onMount (and all microtask awaits inside) complete
		await tick()
	}
	catch (error) {
		restoreGlobals()
		config.logger.warn(`[static-renderer] Bundle load failed: ${String(error)}. Skipping SSG pre-render.`)
		return undefined
	}

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
			try {
				// Drain pending IO. Reject all pending fetch stubs with AbortError.
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
			}
			finally {
				restoreGlobals()
			}
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

function tick(): Promise<void> {
	return new Promise(resolve => nodeSetTimeout(resolve, 0))
}
