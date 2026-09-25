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
}

/** What a worker hands back. */
export type RenderResult = { html: string } | { error: string }

// Captured at import, before any window is installed on globalThis
const nodeSetTimeout = globalThis.setTimeout.bind(globalThis)

// A worker is a fresh module graph, so the app boots from scratch for every page: no stylesheets,
// component state or stores left over from another route. It also keeps the fake DOM off the build's own globalThis.
const job = workerData as RenderJob
const result: RenderResult = await renderPage(job).then(
	html => ({ html }),
	(error: unknown) => ({ error: String(error) }),
)
parentPort?.postMessage(result)

async function renderPage({ html, url, bundlePath }: RenderJob): Promise<string> {
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
			await settle(happyWindow.document)
			return serialize(happyWindow.document)
		}
		finally {
			await shutDown(happyWindow, pendingIO)
		}
	}, { window: noOpWindow, fetch: true })
}

// Route components load lazily, so the page isn't done when the bundle finishes evaluating,
// and nothing tells us when it is. So this waits for 30ms without a change to the document, 2 seconds at most.
// A page that keeps changing (a clock, an animation) gets rendered as it is after those 2 seconds.
async function settle(document: Window['document']): Promise<void> {
	let previous = ''
	let quietChecks = 0
	for (let check = 0; check < 200 && quietChecks < 3; check++) {
		await tick(10)
		const current = document.documentElement.outerHTML
		quietChecks = current === previous ? quietChecks + 1 : 0
		previous = current
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
