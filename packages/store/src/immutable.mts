import { deepFreeze } from './deepFreeze.mts'

import type { ReadonlyState, StateObject } from './store.mts'

/**
 * A value you've promised won't change, wrapped so the store shares it instead of copying it. Build one with {@link Immutable.from}, read it through `.value`.
 */
export class Immutable<T> {
	readonly #value: ReadonlyState<T>

	private constructor(value: ReadonlyState<T>) {
		this.#value = value
		Object.freeze(this)
	}

	/**
	 * Wraps a value the store should share instead of copying.
	 *
	 * Every read after an `update` gives you a deep copy of the state, and every `update` hashes all of it to see whether anything changed. For a large value that never changes (a file's bytes, a lookup table) that's a lot of work for nothing. Wrap it with `Immutable.from` and the store hands out the same wrapper every time, and hashes it by the identity of the value inside.
	 *
	 * The value is deep-frozen in place when you wrap it, so your own reference is frozen too. Bytes are the exception: a typed array, `ArrayBuffer` or `DataView` can't be frozen, so for those the "immutable" is a promise you make, not something the runtime holds you to. Write into them anyway and every snapshot sees it, and no `change` event fires.
	 *
	 * Change detection goes by the value inside, not by its contents. Wrapping the same value again doesn't fire `change`. Wrapping a different value does, even one with identical contents.
	 *
	 * @example
	 * ```ts
	 * import { createStore, Immutable } from '@rooted/store'
	 *
	 * const quiz = createStore({ title: 'Kana', file: Immutable.from(bytes) })
	 *
	 * new Blob([quiz.value.file.value])                          // the same Uint8Array you passed in, no copy
	 * quiz.update(state => { state.title = 'Kanji' })           // doesn't copy or re-read the bytes
	 * quiz.update(() => ({ file: Immutable.from(otherBytes) })) // fires 'change'
	 * ```
	 */
	static from<T extends StateObject>(value: T): Immutable<T> {
		return new Immutable(deepFreeze(value) as ReadonlyState<T>)
	}

	/** The wrapped value. Always the same reference, frozen as far as the runtime allows. */
	get value(): ReadonlyState<T> {
		return this.#value
	}
}
