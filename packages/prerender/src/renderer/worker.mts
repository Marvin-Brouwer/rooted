import { pathToFileURL } from 'node:url'
import { parentPort, workerData } from 'node:worker_threads'

import { Event as HappyEvent, Window } from 'happy-dom'

import { withDomGlobals } from '@rooted/dom-globals'

import { installStubs } from './stubs.mts'

/** What the renderer hands a worker: one page to boot and serialize. */
export type RenderJob = {
	/** The page shell to boot the app in. */
	html: string
	/** The page's full URL, so the app boots straight into the route. */
	url: string
	/** The bundle the shell's module script points at, as a file path. */
	bundlePath: string
	/** Milliseconds without a document change before the page counts as done. */
	quietPeriod: number
	/** The most milliseconds to wait for that. */
	timeout: number
}

/** What a worker hands back. */
export type RenderResult = { html: string } | { error: string }

// Captured at import, before any window is installed on globalThis
const nodeSetTimeout = globalThis.setTimeout.bind(globalThis)

// A worker is a fresh module graph, so the app boots from scratch for every page: no stylesheets,
// component state or stores left over from another route. It also keeps the fake DOM off the build's own globalThis.
const job = workerData as RenderJob
await renderPage(job, html => send({ html }))
	// The renderer takes the first message, so an error after the page was already sent changes nothing
	.catch((error: unknown) => send({ error: String(error) }))

function send(result: RenderResult): void {
	parentPort?.postMessage(result)
}

async function renderPage({ html, url, bundlePath, quietPeriod, timeout }: RenderJob, rendered: (html: string) => void): Promise<void> {
	const happyWindow = new Window({
		url,
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
	happyWindow.document.write(html)

	// Proxied so a missing property on `window` is a no-op function instead of a throw
	const noOpWindow = new Proxy(happyWindow, {
		get(target, property): unknown {
			return (Reflect.get(target, property) as unknown) ?? (() => {})
		},
	})

	return withDomGlobals(async () => {
		try {
			// The bundle reads DOM globals on import, so they must be in place first.
			await import(pathToFileURL(bundlePath).href)
			await settle(happyWindow.document, quietPeriod, timeout)

			// Sent before shutting down: the app's own timers still run while happy-dom closes,
			// and one of them throwing then mustn't cost a page that's already rendered
			rendered(serialize(happyWindow.document))
		}
		finally {
			await shutDown(happyWindow, pendingIO)
		}
	}, { window: noOpWindow, fetch: true })
}

// Route components load lazily, so the page isn't done when the bundle finishes evaluating,
// and nothing tells us when it is. So this waits until the document goes `quietPeriod` without a change,
// or `timeout` runs out, whichever comes first.
async function settle(document: Window['document'], quietPeriod: number, timeout: number): Promise<void> {
	const started = Date.now()
	let lastChange = started
	let previous = ''

	while (Date.now() - started < timeout) {
		await tick(Math.min(10, quietPeriod))
		const current = document.documentElement.outerHTML
		if (current !== previous) {
			previous = current
			lastChange = Date.now()
		}
		else if (Date.now() - lastChange >= quietPeriod) return
	}
}

function serialize(document: Window['document']): string {
	const doctype = document.doctype ? `<!DOCTYPE ${document.doctype.name}>\n` : ''
	return doctype + document.documentElement.outerHTML
}

async function shutDown(happyWindow: Window, pendingIO: Array<() => void>): Promise<void> {
	// Reject all pending fetch stubs with AbortError
	for (const cancel of pendingIO) cancel()
	pendingIO.length = 0

	// pagehide(persisted=false) triggers the framework's AbortController chain,
	// which aborts component signals and clears all setInterval/setTimeout in components
	happyWindow.dispatchEvent(new HappyEvent('pagehide'))
	await tick()

	await happyWindow.happyDOM.abort()
	await happyWindow.happyDOM.close()
}

function tick(milliseconds = 0): Promise<void> {
	return new Promise(resolve => nodeSetTimeout(resolve, milliseconds))
}
