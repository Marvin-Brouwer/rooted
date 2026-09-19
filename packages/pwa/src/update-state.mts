import { currentRegistration, handOver } from './registration.mts'

/** Options for {@link onUpdateReady}. */
export type UpdateReadyOptions = {
	/** Stops listening when it aborts. Pass the `signal` from a component's mount context. */
	signal?: AbortSignal
}

/**
 * Calls `handler` once a new version is installed and waiting to take over, and
 * straight away if one already is. Returns a function that stops listening.
 *
 * It fires at most once, because a waiting worker only stops waiting by
 * activating, and that reloads the page.
 *
 * @example Show something when there's an update
 * ```ts
 * onUpdateReady(() => {
 *   banner.hidden = false
 * })
 * ```
 */
export function onUpdateReady(handler: () => void, options: UpdateReadyOptions = {}): () => void {
	const listening = new AbortController()
	options.signal?.addEventListener('abort', () => listening.abort(), { once: true })

	void watchForUpdate(handler, listening)

	return () => listening.abort()
}

async function watchForUpdate(handler: () => void, listening: AbortController) {
	const registration = await currentRegistration()
	if (!registration || listening.signal.aborted) return

	function fire() {
		if (listening.signal.aborted) return

		listening.abort()
		handler()
	}

	if (registration.waiting) {
		fire()
		return
	}

	registration.addEventListener('updatefound', () => {
		const { installing } = registration
		if (!installing) return

		installing.addEventListener('statechange', () => {
			// Without a controller this is a first install, not an update: there is no
			// older version on screen for it to replace.
			if (installing.state === 'installed' && navigator.serviceWorker.controller) fire()
		}, { signal: listening.signal })
	}, { signal: listening.signal })
}

/** How long to wait for the new worker to take control before reloading anyway. */
const handOverTimeout = 5000

/**
 * Lets the waiting version take over and reloads onto it. Resolves `false`
 * when there was nothing waiting, in which case nothing happens.
 *
 * Reloading is the point, so anything the page is holding in memory is gone.
 * Call it when the user asked for it. `ApplyUpdateButton` from
 * `@rooted/pwa/components` is that button, if you want one off the shelf.
 *
 * If the new worker doesn't take control within five seconds the page reloads
 * regardless. That reload can come back on the old version, but it beats a
 * click that hangs.
 */
export async function applyUpdate(): Promise<boolean> {
	const registration = await currentRegistration()
	if (!registration || !handOver(registration)) return false

	await new Promise<void>((resolve) => {
		const timeout = setTimeout(resolve, handOverTimeout)
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			clearTimeout(timeout)
			resolve()
		}, { once: true })
	})

	location.reload()
	return true
}
