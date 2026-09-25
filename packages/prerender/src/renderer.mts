import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { Event as HappyEvent, PopStateEvent as HappyPopStateEvent, Window } from 'happy-dom'

import { withDomGlobals } from '@rooted/dom-globals'

import { installStubs } from './renderer/stubs.mts'

// Captured at import, before any window is installed on globalThis
const nodeSetTimeout = globalThis.setTimeout.bind(globalThis)

const SCRIPT_MODULE_RE = /<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i

/** Options for {@link renderer}. The last two line up with Vite's `ResolvedConfig`, so `config.base` and `config.logger` fit. */
export type RendererOptions = {
	/** The page shell to boot the app in, usually the built `index.html`. Its module script says which bundle to load. */
	html: string
	/** The build output the module script's `src` is relative to. */
	outputDirectory: string
	/** The app's base path, `/` unless it's served from a subfolder. */
	base: string
	/** Where to report that pre-rendering was skipped. */
	logger: { warn(message: string): void }
}

/**
 * Navigates the booted app to `staticPath` and returns the whole document as HTML, doctype included.
 * That's the shell as the app left it: the rendered body, plus whatever the app added to `<head>`,
 * like component stylesheets and the route's title. Returns `undefined` when rendering fails.
 */
export type Render = (staticPath: string) => Promise<string | undefined>

/**
 * Boots the built app in happy-dom and hands `use` a function that renders one path at a time.
 *
 * The app boots inside `options.html`, so it finds its mount point the way it would in a browser, custom selector or not.
 * Scripts in the shell don't run, only the bundle does. Every render serializes the whole document,
 * so something the app added to `<head>` on one route (a stylesheet, say) is still there on the next.
 *
 * Once `use` settles, whether it returned or threw, the app is shut down and the globals are put back.
 * There's nothing to dispose by hand.
 *
 * Returns what `use` returned. When the app can't be booted (no module script in `options.html`,
 * or the bundle throws on import), it warns through `logger`, skips `use` and returns `undefined`.
 * An error thrown by `use` itself is passed on.
 *
 * Runs inside `withDomGlobals` from `@rooted/dom-globals`, so it waits for any other DOM install to finish first.
 * Don't call `withDomGlobals` from inside `use`, it would wait for this one.
 *
 * @example
 * ```ts
 * await renderer({ html: indexHtml, outputDirectory, base: config.base, logger: config.logger }, async render => {
 * 	for (const staticPath of staticPaths) {
 * 		const html = await render(staticPath)
 * 		if (html) await writePage(staticPath, html)
 * 	}
 * })
 * ```
 */
export async function renderer<T>(options: RendererOptions, use: (render: Render) => Promise<T>): Promise<T | undefined> {
	const bundlePath = findBundle(options)
	if (!bundlePath) return undefined

	const happyWindow = new Window({
		url: `http://localhost${options.base}`,
		settings: {
			// The bundle is imported by Node below. Nothing in the shell should run on its own.
			disableJavaScriptFileLoading: true,
			disableJavaScriptEvaluation: true,
			disableCSSFileLoading: true,
		},
	})

	const pendingIO: Array<() => void> = []
	installStubs(happyWindow as unknown as Record<string, unknown>, pendingIO)

	// The real shell, so the app mounts where it would in a browser
	happyWindow.document.write(options.html)

	// Proxied so a missing property on `window` is a no-op function instead of a throw
	const noOpWindow = new Proxy(happyWindow, {
		get(target, property): unknown {
			return (Reflect.get(target, property) as unknown) ?? (() => {})
		},
	})

	const render: Render = async (staticPath) => {
		try {
			happyWindow.history.pushState(undefined, '', options.base + staticPath.slice(1))
			happyWindow.dispatchEvent(new HappyPopStateEvent('popstate', { state: undefined }))
			await tick()
			return serialize(happyWindow.document)
		}
		catch {
			return undefined
		}
	}

	return withDomGlobals(async () => {
		try {
			try {
				// The bundle reads DOM globals on import, so they must be in place first.
				await import(pathToFileURL(bundlePath).href)

				// One macrotask tick lets the router's async onMount (and all microtask awaits inside) complete
				await tick()
			}
			catch (error) {
				options.logger.warn(`[static-renderer] Bundle load failed: ${String(error)}. Skipping SSG pre-render.`)
				return undefined
			}

			return await use(render)
		}
		finally {
			await shutDown(happyWindow, pendingIO)
		}
	}, { window: noOpWindow, fetch: true })
}

function findBundle(options: RendererOptions): string | undefined {
	const scriptMatch = SCRIPT_MODULE_RE.exec(options.html)
	if (!scriptMatch) {
		options.logger.warn('[static-renderer] No module script found in the page shell. Skipping SSG pre-render.')
		return undefined
	}

	const scriptSource = scriptMatch[1]
	const relativeSource = scriptSource.startsWith(options.base)
		? scriptSource.slice(options.base.length)
		: scriptSource.replace(/^\//, '')
	return path.join(options.outputDirectory, relativeSource)
}

function serialize(document: Window['document']): string {
	const doctype = document.doctype ? `<!DOCTYPE ${document.doctype.name}>\n` : ''
	return doctype + document.documentElement.outerHTML
}

async function shutDown(happyWindow: Window, pendingIO: Array<() => void>): Promise<void> {
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

function tick(): Promise<void> {
	return new Promise(resolve => nodeSetTimeout(resolve, 0))
}
