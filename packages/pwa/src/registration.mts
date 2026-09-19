/**
 * True when this browser has service workers at all. They need a secure context,
 * so this is `false` on plain `http://` pages that aren't localhost.
 */
export function workersSupported(): boolean {
	return typeof navigator !== 'undefined' && navigator.serviceWorker != null
}

/**
 * The registration covering the current page, or `undefined` when there is none
 * yet. Deliberately asked of the browser every time rather than cached: the
 * registration script rooted injects and the copy of this package bundled into
 * your app are two separate module instances, and only the browser's own state
 * is shared between them.
 */
export async function currentRegistration(): Promise<ServiceWorkerRegistration | undefined> {
	if (!workersSupported()) return undefined

	try {
		return await navigator.serviceWorker.getRegistration()
	}
	catch {
		// Blocked, usually by a storage or security policy. No registration means
		// nothing to watch, which is the same answer as not having one yet.
		return undefined
	}
}

/**
 * Tells a waiting worker to stop waiting, so it activates and the next document
 * gets served by it. Returns `false` when nothing was waiting.
 *
 * The message is what workbox's generated worker listens for when `skipWaiting`
 * is off, which is how rooted configures it.
 */
export function handOver(registration: ServiceWorkerRegistration): boolean {
	const { waiting } = registration
	if (!waiting) return false

	waiting.postMessage({ type: 'SKIP_WAITING' })
	return true
}
