import { currentRegistration, handOver } from './registration.mts'

/** Called once a new version is installed and waiting to take over. */
export type UpdateReadyHandler = () => void

/**
 * Calls `handler` once a new version is installed and waiting to take over, and straight away if one already is.
 *
 * It fires at most once, because a waiting version only stops waiting by activating, and that reloads the page.
 *
 * This overload listens until the page unloads.
 * Use it at module scope, where there's no unmount to hang cleanup off.
 * Inside a component, use the overload that takes the component's `signal` instead.
 *
 * @example
 * ```ts
 * onUpdateReady(() => {
 *   banner.hidden = false
 * })
 * ```
 */
export function onUpdateReady(handler: UpdateReadyHandler): void
/**
 * Calls `handler` once a new version is installed and waiting to take over, and straight away if one already is.
 *
 * It fires at most once, because a waiting version only stops waiting by activating, and that reloads the page.
 *
 * The `signal` controls listener lifetime.
 * Inside a component, pass the component's `signal` so the listener is cleaned up on unmount.
 *
 * @example
 * ```ts
 * onUpdateReady(signal, () => {
 *   button.disabled = false
 * })
 * ```
 */
export function onUpdateReady(signal: AbortSignal, handler: UpdateReadyHandler): void
export function onUpdateReady(
	signalOrHandler: AbortSignal | UpdateReadyHandler,
	maybeHandler?: UpdateReadyHandler,
): void {
	const handler = maybeHandler ?? signalOrHandler as UpdateReadyHandler
	const signal = maybeHandler ? signalOrHandler as AbortSignal : undefined

	const listening = new AbortController()
	signal?.addEventListener('abort', () => listening.abort(), { once: true })

	void watchForUpdate(handler, listening)
}

async function watchForUpdate(handler: UpdateReadyHandler, listening: AbortController) {
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
			// Without a controller this is a first install, not an update:
			// there is no older version on screen for it to replace.
			if (installing.state === 'installed' && navigator.serviceWorker.controller) fire()
		}, { signal: listening.signal })
	}, { signal: listening.signal })
}

/**
 * Lets the waiting version take over and reloads onto it.
 * Resolves `false` when there was nothing waiting, in which case nothing happens.
 *
 * Reloading is the point, so anything the page is holding in memory is gone.
 * Call it when the user asked for it.
 * `ApplyUpdateButton` from `@rooted/pwa/components` is that button, if you want one off the shelf.
 *
 * Every other open tab of the app switches to the new version at the same moment, because a browser can't hand over one tab at a time.
 * The registration script reloads those too, since their route chunks are gone from the new precache.
 *
 * The reload waits until the new version is actually in control.
 * If that never happens the promise never settles and the page stays as it is.
 * It hasn't happened for a button press in testing, and reloading anyway would be worse:
 * the reload comes back on the old version, and the new one can still take over underneath it.
 * The update still lands once every window of the app is closed.
 */
export async function applyUpdate(): Promise<boolean> {
	const registration = await currentRegistration()
	if (!registration || !handOver(registration)) return false

	await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
	location.reload()
	return true
}

