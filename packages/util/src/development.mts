export function isDevelopment() {
	return import.meta.env.DEV
}

export function formatStackFrame(frame: string | undefined): string | undefined {
	if (!frame) return void 0

	const trimmedFrame = frame
		.trim()
		.replace('at ', '')
		.replace(location.origin + '/', '')

	const queryLocation = trimmedFrame.indexOf('?')
	if (queryLocation === -1) return trimmedFrame

	return trimmedFrame.slice(0, queryLocation) +
		trimmedFrame.slice(trimmedFrame.indexOf(':', queryLocation))
}

/**
 * Captures the call site of `component()` from the stack trace.
 *
 * @remarks
 * Locates the `appendSourceLocation` frame in the stack, then steps two
 * frames forward to skip past `component()` and land on the actual call site.
 * This is robust to different stack prefixes (e.g. the `Error` line being
 * absent in some runtimes).
 *
 * This will produce incorrect results if `component()` is called through
 * an additional wrapper (e.g. a `defineComponent` helper or build plugin),
 * as the call site frame will shift down by one per extra wrapper.
 */
export function appendSourceLocation() {
	// Stack: Error -> appendSourceLocation -> component() -> call site
	const frames = new Error().stack?.split('\n') ?? []
	const selfIndex = frames.findIndex(f => f.includes('appendSourceLocation'))
	const definitionStackFrame = selfIndex !== -1 ? frames[selfIndex + 2] : undefined
	return formatStackFrame(definitionStackFrame)
}