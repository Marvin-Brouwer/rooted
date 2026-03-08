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
 * The stack frame index is hardcoded to `3`, assuming the call stack is:
 * `Error → appendSourceLocation → component() → call site`
 *
 * This will produce incorrect results if `component()` is called through
 * an additional wrapper (e.g. a `defineComponent` helper or build plugin),
 * as the call site frame will shift down by one per extra wrapper.
 */
export function appendSourceLocation() {
	// Stack: Error -> appendSourceLocation -> component() -> call site
	// TODO claude, instead of a static stack frame, find the component() stack frame and use that index
	const definitionStackFrame = new Error().stack?.split('\n')[3]
	return formatStackFrame(definitionStackFrame)
}