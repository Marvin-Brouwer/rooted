import { TargetedEvent } from './event.mts'

/**
 * Event names rooted exposes on the `'global'` channel of the mount context's
 * `on(target, key, handler)`. Currently only `'unhandled-error'`, which folds
 * `window.error` and `window.unhandledrejection` into a single typed event.
 */
export type GlobalEventMap = {
	'unhandled-error': UnhandledErrorEvent
}

/** Handler type for events on the `'global'` channel. */
export type GlobalEventHandler<K extends keyof GlobalEventMap>
	= ((event: TargetedEvent<GlobalEventMap[K], Window>) => void | Promise<void>)
	| (() => void | Promise<void>)

type StackFrame = { filename: string, lineno: number, colno: number }

/**
 * @internal
 * Wraps a handler so it only fires for app-origin promise rejections (filters
 * out cross-origin and extension noise). Used by the mount context's
 * `on('global', 'unhandled-error', ...)` wiring.
 */
export function mapUnhandledRejection(handler: GlobalEventHandler<'unhandled-error'>) {
	return (rejectionEvent: PromiseRejectionEvent) => {
		if (!isApplicationErrorError(rejectionEvent)) return
		void handler(UnhandledErrorEvent.forRejection(rejectionEvent))
	}
}

/**
 * @internal
 * Wraps a handler so it only fires for app-origin synchronous errors (filters
 * out cross-origin and extension noise). Used by the mount context's
 * `on('global', 'unhandled-error', ...)` wiring.
 */
export function mapUnhandledError(handler: GlobalEventHandler<'unhandled-error'>) {
	return (event: ErrorEvent) => {
		if (!isApplicationErrorError(event)) return
		void handler(UnhandledErrorEvent.forError(event))
	}
}

function parseFirstStackFrame(stack: string | undefined): StackFrame | undefined {
	if (!stack) return undefined
	for (const rawLine of stack.split('\n').slice(1)) {
		const line = rawLine.trim()
		if (!line.startsWith('at ')) continue
		// Named frame:  at name (url:line:col)
		const named = /^at\s+\S+\s+\((.+):(\d+):(\d+)\)$/.exec(line)
		if (named) return { filename: named[1], lineno: Number(named[2]), colno: Number(named[3]) }
		// Anonymous frame:  at url:line:col
		const anon = /^at\s+(.+):(\d+):(\d+)$/.exec(line)
		if (anon) return { filename: anon[1], lineno: Number(anon[2]), colno: Number(anon[3]) }
	}
	return undefined
}

/**
 * The event passed to a `'global'`, `'unhandled-error'` handler. A subclass of
 * `ErrorEvent` so it's structurally compatible with anything that already
 * accepts `ErrorEvent`.
 *
 * Wraps both `window.error` (sync exceptions) and `window.unhandledrejection`
 * (async rejections). Use `instanceof UnhandledErrorEvent` to access the
 * original `.innerEvent` and (for rejections) `.promise`.
 *
 * @example
 * ```ts
 * onMount({ on }) {
 *   on('global', 'unhandled-error', (event) => {
 *     if (event instanceof UnhandledErrorEvent && event.promise) {
 *       // came from a promise rejection
 *     }
 *     reportToTelemetry(event.error)
 *   })
 * }
 * ```
 */
export class UnhandledErrorEvent extends ErrorEvent {
	public static forRejection(innerEvent: PromiseRejectionEvent) {
		const reason: unknown = innerEvent.reason
		const reasonObject = typeof reason === 'object' && reason !== null && 'stack' in reason
			? (reason as { stack?: string, message?: string })
			: undefined
		const frame = parseFirstStackFrame(reasonObject?.stack)
		const init: ErrorEventInit = {
			bubbles: innerEvent.bubbles,
			cancelable: innerEvent.cancelable,
			error: reason,
			message: reasonObject?.message ?? '',
			filename: frame?.filename ?? '',
			lineno: frame?.lineno ?? 0,
			colno: frame?.colno ?? 0,
		}

		return new UnhandledErrorEvent(innerEvent, init, innerEvent.promise) as
			& TargetedEvent<UnhandledErrorEvent, Window>
	}

	public static forError(innerEvent: ErrorEvent) {
		const init: ErrorEventInit = {
			bubbles: innerEvent.bubbles,
			cancelable: innerEvent.cancelable,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			error: innerEvent.error,
			message: innerEvent.message ?? '',
			filename: innerEvent.filename ?? '',
			lineno: innerEvent.lineno ?? 0,
			colno: innerEvent.colno ?? 0,
		}
		return new UnhandledErrorEvent(innerEvent, init) as
			& TargetedEvent<UnhandledErrorEvent, Window>
	}

	private constructor(
		public readonly innerEvent: PromiseRejectionEvent | ErrorEvent,
		init: ErrorEventInit,
		public readonly promise?: Promise<unknown>,
	) {
		super('unhandled-error', init)
	}
}

/**
 * Returns `true` when the error originated from app code on the page's origin.
 * Filters out two classes of noise:
 *
 * - Cross-origin errors (`'Script error.'` with `lineno === 0` and
 *   `colno === 0`). Browsers strip the details, so there's nothing useful to
 *   report.
 * - Errors from browser extensions (`chrome-extension://`,
 *   `moz-extension://`, `safari-extension://`, `about:srcdoc`).
 *
 * Used internally by the `'global'`, `'unhandled-error'` channel. If you need
 * unfiltered events, listen on `window.error` directly.
 */
export function isApplicationErrorError(event: ErrorEvent | PromiseRejectionEvent): boolean {
	const error: unknown = event instanceof ErrorEvent ? event.error : event.reason
	if (!error) return false

	// 'Script error.' and lineno/colno === 0 are browser-specific cross-origin signals
	// that only apply to ErrorEvents, not to PromiseRejectionEvents.
	if (event instanceof ErrorEvent && (event.message === 'Script error.' || (event.lineno === 0 && event.colno === 0))) {
		return false
	}

	const errorWithStack = typeof error === 'object' && error !== null && 'stack' in error
		? (error as { stack?: string })
		: undefined

	// For ErrorEvent: filename is provided by the browser directly.
	// For PromiseRejectionEvent: parse it from reason.stack.
	const filename = (event instanceof ErrorEvent && event.filename)
		|| parseFirstStackFrame(errorWithStack?.stack)?.filename
		|| ''

	const extensionProtocols = [
		'chrome-extension://',
		'moz-extension://',
		'safari-extension://',
		'about:srcdoc',
	]

	if (extensionProtocols.some(protocol => filename.includes(protocol))) {
		return false
	}

	return filename.includes(globalThis.location.origin)
}
