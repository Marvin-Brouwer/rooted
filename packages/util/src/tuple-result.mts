/** A successful result tuple carrying a value of type `T`. */
export type SuccessTuple<T> = [success: true, value: T]
/** A failed result tuple carrying an `Error`. */
export type ErrorTuple = [success: false, value: never, error: Error]
/**
 * A discriminated tuple that is either a {@link SuccessTuple} or an {@link ErrorTuple}.
 *
 * Use {@link tupleResult.isSuccess} / {@link tupleResult.isError} to narrow the type,
 * or {@link tupleResult.value} to extract the payload, or {@link tupleResult.unTuple}
 * to unwrap and throw on failure.
 */
export type TupleResult<T> = SuccessTuple<T> | ErrorTuple

const never = void 0 as never

/** Creates a {@link SuccessTuple} wrapping `value`. */
function success<T>(value: T): SuccessTuple<T> {
	return [true, value]
}
/** Creates an {@link ErrorTuple} wrapping the given error (coerced to `Error` if needed). */
function error(error: unknown): ErrorTuple
function error(error: Error): ErrorTuple
function error(error: Error | unknown): ErrorTuple {
	return [false, never, error instanceof Error ? error : new Error(String(error))]
}
/** Returns `true` if `value` is a {@link SuccessTuple}. */
function isSuccess<T>(value: TupleResult<T>): value is SuccessTuple<T> {
	return value.length == 2 && value[0]
}
/** Returns `true` if `value` is an {@link ErrorTuple}. */
function isError<T>(value: TupleResult<T>): value is ErrorTuple {
	return value.length == 3 && value[0] === false
}
/** Extracts the payload from a {@link TupleResult}: the value on success, or the `Error` on failure. */
function value<T>(tupleResult: ErrorTuple): Error
function value<T>(tupleResult: SuccessTuple<T>): T
function value<T>([success, value, error]: TupleResult<T>): T | Error {

	if(!success) return error
	return value
}
/**
 * Unwraps a {@link TupleResult}, returning the value on success or throwing the error on failure.
 */
function unTuple(tupleResult: ErrorTuple): void
function unTuple<T>(tupleResult: SuccessTuple<T>): T
function unTuple<T>(tupleResult: TupleResult<T>): T
function unTuple<T>([success, value, error]: TupleResult<T>): T {

	if(!success) throw error
	return value
}


export const tupleResult = {
	success,
	isSuccess,
	error,
	isError,
	value,
	unTuple
}