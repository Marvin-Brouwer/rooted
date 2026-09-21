import { handOver, workersSupported } from './registration.mts'

/**
 * When a newly installed version is allowed to take over from the one serving the open page.
 *
 * Neither value updates a running page.
 * Swapping the bundle underneath a document that is already rendering breaks the router,
 * whose route chunks are resolved with `await import()` against the precache the page started on.
 */
export type UpdateStrategy =
	/** A version that was already waiting when the page opened is taken on the spot. */
	| 'automatic'
	/** The waiting version keeps waiting until something calls {@link applyUpdate}. */
	| 'explicit'

/** Options for {@link registerWorker}. */
export type RegisterWorkerOptions = {
	/**
	 * Where the worker script lives.
	 * Defaults to `worker.js` next to the script that calls this,
	 * which is right for the registration script rooted emits and probably wrong anywhere else,
	 * so pass it if you register the worker yourself.
	 */
	workerUrl?: string | URL
	/** Defaults to `'automatic'`. */
	updates?: UpdateStrategy
	/**
	 * How often to re-check the worker script, in milliseconds.
	 * Defaults to an hour.
	 * `false` turns polling off, which leaves you with the browser's own check on document load.
	 */
	checkInterval?: number | false
	/**
	 * Stops the update checks and removes the listeners when it aborts.
	 * Nothing needs this in an app, where the registration lives as long as the page does,
	 * but it keeps tests from leaking into each other.
	 */
	signal?: AbortSignal
}

const oneHour = 60 * 60 * 1000

/**
 * Registers the service worker and keeps checking for a new one while the app runs:
 * on an interval, when the tab becomes visible again, and when the network comes back.
 * Without those checks an installed PWA that is opened once and left running only ever looks at launch.
 *
 * `rootedManifest` emits a script that calls this for you, so an app normally doesn't.
 * Call it yourself only if you're registering the worker by hand,
 * and then pass {@link RegisterWorkerOptions.workerUrl}.
 *
 * Under `'automatic'` it also takes a version that was already waiting when the page opened,
 * which costs one quick extra load and is the only way to hand over without disturbing a page that is already running.
 * See {@link UpdateStrategy}.
 *
 * Resolves to `undefined` where service workers aren't available.
 */
export async function registerWorker(options: RegisterWorkerOptions = {}): Promise<ServiceWorkerRegistration | undefined> {
	if (!workersSupported()) return undefined

	const {
		workerUrl = new URL('worker.js', import.meta.url),
		updates = 'automatic',
		checkInterval = oneHour,
		signal,
	} = options

	// No scope: the default is the directory the worker script sits in,
	// which is what we want, and it keeps sub-path deploys (GitHub Pages) working for free.
	const registration = await navigator.serviceWorker.register(workerUrl)

	function checkForUpdate() {
		registration.update().catch(() => {
			// A failed check is a network blip, not an app error.
		})
	}

	if (checkInterval !== false) {
		const polling = setInterval(checkForUpdate, checkInterval)
		signal?.addEventListener('abort', () => clearInterval(polling), { once: true })
	}

	window.addEventListener('online', checkForUpdate, { signal })
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') checkForUpdate()
	}, { signal })

	if (updates === 'automatic') takeWaitingVersion(registration)

	return registration
}

/**
 * Takes a version that was already waiting when the page opened, and reloads onto it.
 *
 * Only at startup, and only for a version that was waiting before this page got going.
 * One that finishes installing later in the session is left alone:
 * taking that one would swap the bundle under a page that is already rendering,
 * and its routes resolve chunks out of the precache it started on.
 *
 * Handing over on the way out of the page instead would avoid the extra load, and it does not work.
 * The message doesn't reach the worker before the navigation does,
 * so the incoming document is served by the old worker anyway and the handover completes underneath it,
 * which is the problem this is meant to avoid, one document later.
 *
 * The reload only happens once the new version is actually in control,
 * so a handover that doesn't take leaves the page alone rather than reloading in a loop.
 */
function takeWaitingVersion(registration: ServiceWorkerRegistration) {
	if (!handOver(registration)) return

	navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true })
}
