import type { Window } from 'happy-dom'

const deferredEvents = new Set(['load', 'error'])

/**
 * Makes `load` and `error` on `<link>` and `<script>` fire after `appendChild` returns, like they do in a browser.
 *
 * With file loading switched off, happy-dom fires them synchronously while it connects the element,
 * so code that appends first and listens second never hears back.
 * Vite's preload helper does exactly that for a lazy chunk's CSS, which left the chunk's import hanging forever.
 *
 * The prototypes are shared by every happy-dom window in the thread, so only call this where there's one window per thread,
 * like the render worker. An app's own `dispatchEvent(new Event('load'))` on these elements is deferred too, and always returns `true`.
 * This can go once happy-dom queues those events itself.
 */
export function deferLoadEvents(window: Window): void {
	for (const { prototype } of [window.HTMLLinkElement, window.HTMLScriptElement]) {
		const dispatch = prototype.dispatchEvent
		prototype.dispatchEvent = function (event) {
			if (!deferredEvents.has(event.type)) return dispatch.call(this, event)

			queueMicrotask(() => dispatch.call(this, event))
			return true
		}
	}
}
