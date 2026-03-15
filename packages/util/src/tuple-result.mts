// TODO document inline

export type SuccessTuple<T> = [success: true, value: T]
export type ErrorTuple = [success: false, value: never, error: Error]
export type TupleResult<T> = SuccessTuple<T> | ErrorTuple

const never = void 0 as never

function success<T>(value: T): SuccessTuple<T> {
	return [true, value]
}
function error(error: unknown): ErrorTuple
function error(error: Error): ErrorTuple
function error(error: Error | unknown): ErrorTuple {
	return [false, never, error instanceof Error ? error : new Error(String(error))]
}
function isSuccess<T>(value: TupleResult<T>): value is SuccessTuple<T> {
	return value.length == 2 && value[0]
}
function isError<T>(value: TupleResult<T>): value is ErrorTuple {
	return value.length == 3 && value[0] === false
}
function value<T>(tupleResult: ErrorTuple): Error
function value<T>(tupleResult: SuccessTuple<T>): T
function value<T>([success, value, error]: TupleResult<T>): T | Error {

	if(!success) return error
	return value
}

export const tupleResult = {
	success,
	isSuccess,
	error,
	isError,
	value
}