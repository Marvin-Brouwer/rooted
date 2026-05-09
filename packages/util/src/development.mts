/**
 * Returns `true` when running in a Vite dev build (`import.meta.env.DEV`).
 * Used by rooted's dev-mode helpers, which are dropped in production.
 */
export function isDevelopment() {
	return import.meta.env?.DEV ?? false
}

/**
 * @internal
 * Strips a stack frame down to a usable file:line:col by removing the
 * `at `prefix, the page origin, and any query string Vite tacks on.
 */
export function formatStackFrame(frame: string | undefined): string | undefined {
	if (!frame) return void 0

	const trimmedFrame = frame
		.trim()
		.replace('at ', '')
		.replace(location.origin + '/', '')

	const queryLocation = trimmedFrame.indexOf('?')
	if (queryLocation === -1) return trimmedFrame

	return trimmedFrame.slice(0, queryLocation)
		+ trimmedFrame.slice(trimmedFrame.indexOf(':', queryLocation))
}

/**
 * @internal
 * Captures the call site of `component()` from the stack trace, used in
 * dev-mode warnings.
 *
 * Locates the `appendSourceLocation` frame, then steps two frames forward to
 * skip past `component()` and land on the actual call site. Robust to
 * different stack prefixes (the `Error` line is absent in some runtimes).
 *
 * Returns the wrong frame if `component()` is called through an extra
 * wrapper (a `defineComponent` helper or a build plugin), since the call site
 * shifts one frame deeper per wrapper.
 */
export function appendSourceLocation() {
	// Stack: Error -> appendSourceLocation -> component() -> call site
	// eslint-disable-next-line unicorn/error-message
	const frames = new Error().stack?.split('\n') ?? []
	const selfIndex = frames.findIndex(f => f.includes('appendSourceLocation'))
	const definitionStackFrame = selfIndex === -1 ? undefined : frames[selfIndex + 2]
	return formatStackFrame(definitionStackFrame)
}
