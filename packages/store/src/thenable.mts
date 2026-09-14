// Anything with a callable `then`. That's what `await` itself treats as a promise, which is the point: if `await` would use it, we can't copy it and we can't serialise it either.
export function isThenable(value: unknown): value is PromiseLike<unknown> {
	return typeof (value as PromiseLike<unknown> | undefined)?.then === 'function'
}
