import { workersSupported } from './registration.mts'

/** Options for {@link registerWorker}. */
export type RegisterWorkerOptions = {
	/**
	 * Where the worker script lives.
	 * Defaults to `worker.js` next to the script that calls this,
	 * which is right for the registration script rooted emits and probably wrong anywhere else,
	 * so pass it if you register the worker yourself.
	 */
	workerUrl?: string | URL
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
 * It never hands over to a new version itself.
 * The browser does that once every window of the app is closed, and `applyUpdate` does it on request.
 * Taking over a page that is already running breaks the router,
 * whose route chunks are resolved with `await import()` against the precache the page started on.
 *
 * So when a new version takes over anyway, because another tab called `applyUpdate`, this reloads the page onto it.
 * Whatever the page held in memory is lost, but without the reload its next route change could 404.
 *
 * Resolves to `undefined` where service workers aren't available.
 */
export async function registerWorker(options: RegisterWorkerOptions = {}): Promise<ServiceWorkerRegistration | undefined> {
	if (!workersSupported()) return undefined

	const {
		workerUrl = new URL('worker.js', import.meta.url),
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

	// A page nothing controlled was loaded from the network, so whichever worker claims it serves the same build.
	if (navigator.serviceWorker.controller) {
		navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { signal })
	}

	window.addEventListener('online', checkForUpdate, { signal })
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') checkForUpdate()
	}, { signal })

	return registration
}

