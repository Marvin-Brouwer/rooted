import { availableParallelism } from 'node:os'
import path from 'node:path'
import { Worker } from 'node:worker_threads'

import type { RenderJob, RenderResult } from './renderer/worker.mts'

const SCRIPT_MODULE_RE = /<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i

// Built, the worker sits next to this file in dist. Run from source (the tests), Node runs the .mts itself,
// and needs the `source` condition to find the other workspace packages' sources too.
const fromSource = import.meta.url.endsWith('.mts')
const workerUrl = new URL(fromSource ? './renderer/worker.mts' : './render-worker.mjs', import.meta.url)
const workerArguments = fromSource ? ['--conditions=source'] : []

/** How long to wait for a page to finish rendering before it's written. */
export type SettleOptions = {
	/**
	 * How long the document has to go without changing before the page counts as done, in milliseconds. Defaults to 30.
	 * Raise it when a page finishes in steps with pauses between them, like a component that fetches after a timeout.
	 */
	quietPeriod?: number
	/**
	 * The most to wait per page, in milliseconds. Defaults to 2000.
	 * A page that never stops changing, like one with a clock on it, is written as it looks when this runs out.
	 */
	timeout?: number
}

/** Options for {@link renderer}. `base` and `logger` line up with Vite's `ResolvedConfig`, so `config.base` and `config.logger` fit. */
export type RendererOptions = {
	/** The page shell to boot the app in, usually the built `index.html`. Its module script says which bundle to load. */
	html: string
	/** The build output the module script's `src` is relative to. */
	outputDirectory: string
	/** The app's base path, `/` unless it's served from a subfolder. */
	base: string
	/** Where to report that pre-rendering was skipped. */
	logger: { warn(message: string): void }
	/** How long to wait for each page to finish rendering. */
	settle?: SettleOptions
}

/**
 * Boots the app on `staticPath` and returns the whole document as HTML, doctype included.
 * That's the shell as the app left it: the rendered body, plus whatever the app added to `<head>`,
 * like component stylesheets and the route's title.
 * Returns `undefined`, after a warning, when the page couldn't be rendered.
 */
export type Render = (staticPath: string) => Promise<string | undefined>

/**
 * Hands `use` a function that pre-renders one path at a time, each in a freshly booted app.
 *
 * Every page gets its own worker thread, so its own module graph: nothing carries over from one route to the next,
 * not stylesheets, component state or stores. The app boots inside `options.html` at the page's own URL,
 * the way a browser opening that page would, and only the bundle runs, not the shell's scripts.
 * The fake DOM only ever exists inside the worker, the build's own globals are never touched.
 *
 * `render` is safe to call for many paths at once. It runs as many workers side by side as the machine has cores,
 * and queues the rest. The trade-off is a full boot per page, so it's slower than rendering every page in one app would be.
 *
 * Returns what `use` returned, or `undefined` without calling it when `options.html` has no module script to boot.
 *
 * @example
 * ```ts
 * await renderer({ html: indexHtml, outputDirectory, base: config.base, logger: config.logger }, render =>
 * 	Promise.all(staticPaths.map(async staticPath => {
 * 		const html = await render(staticPath)
 * 		if (html) await writePage(staticPath, html)
 * 	})),
 * )
 * ```
 */
export async function renderer<T>(options: RendererOptions, use: (render: Render) => Promise<T>): Promise<T | undefined> {
	const bundlePath = findBundle(options)
	if (!bundlePath) return undefined

	const limit = concurrencyLimit(availableParallelism())
	const quietPeriod = options.settle?.quietPeriod ?? 30
	const timeout = options.settle?.timeout ?? 2000

	const render: Render = async (staticPath) => {
		const url = `http://localhost${options.base}${staticPath.slice(1)}`
		const result = await limit(() => runWorker({ html: options.html, url, bundlePath, quietPeriod, timeout }))
		if ('html' in result) return result.html

		options.logger.warn(`[prerender] Rendering ${staticPath} failed: ${result.error}. Keeping the plain shell for it.`)
		return undefined
	}

	return use(render)
}

function findBundle(options: RendererOptions): string | undefined {
	const scriptMatch = SCRIPT_MODULE_RE.exec(options.html)
	if (!scriptMatch) {
		options.logger.warn('[prerender] No module script found in the page shell. Skipping SSG pre-render.')
		return undefined
	}

	const scriptSource = scriptMatch[1]
	const relativeSource = scriptSource.startsWith(options.base)
		? scriptSource.slice(options.base.length)
		: scriptSource.replace(/^\//, '')
	return path.join(options.outputDirectory, relativeSource)
}

async function runWorker(job: RenderJob): Promise<RenderResult> {
	const worker = new Worker(workerUrl, { workerData: job, execArgv: workerArguments })
	try {
		return await new Promise<RenderResult>((resolve) => {
			worker.once('message', (result: RenderResult) => resolve(result))
			worker.once('error', (error: Error) => resolve({ error: String(error) }))
			worker.once('exit', code => resolve({ error: `the worker exited with code ${code}` }))
		})
	}
	finally {
		// Whatever the app left running (timers, sockets) goes with the thread
		await worker.terminate()
	}
}

function concurrencyLimit(maximum: number): <T>(task: () => Promise<T>) => Promise<T> {
	let running = 0
	const waiting: Array<() => void> = []

	return async (task) => {
		if (running >= maximum) await new Promise<void>(resolve => waiting.push(resolve))
		running++
		try {
			return await task()
		}
		finally {
			running--
			waiting.shift()?.()
		}
	}
}
