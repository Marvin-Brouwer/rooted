import { expect, vi } from 'vitest'

type ObserverCallback<TEntry> = (entries: TEntry[], observer: unknown) => void

export type FakeObserver<TEntry> = {
	/** What the constructor was handed as its second argument, if anything. */
	init: unknown
	/** Every `observe()` call, in order. */
	observed: Array<{ options: unknown, target: unknown }>
	disconnectCount: number
	/** Fires the callback the way the browser would. */
	trigger(entries: TEntry[]): void
}

/**
 * Replaces a global observer constructor with a fake that records what it was
 * handed and lets the test fire the callback on demand.
 *
 * happy-dom does provide all three observers, but none of them fire without a
 * layout engine, and none of them let you read back the options they were
 * given. Returns the list every constructed instance lands in.
 */
export function stubObserver<TEntry>(name: string): Array<FakeObserver<TEntry>> {
	const instances: Array<FakeObserver<TEntry>> = []

	class Fake implements FakeObserver<TEntry> {
		readonly init: unknown
		readonly observed: Array<{ options: unknown, target: unknown }> = []
		disconnectCount = 0
		readonly #callback: ObserverCallback<TEntry>

		constructor(callback: ObserverCallback<TEntry>, init?: unknown) {
			this.#callback = callback
			this.init = init
			instances.push(this)
		}

		observe(target: unknown, options?: unknown): void {
			this.observed.push({ options, target })
		}

		unobserve(): void {}

		disconnect(): void {
			this.disconnectCount += 1
		}

		trigger(entries: TEntry[]): void {
			this.#callback(entries, this)
		}
	}

	vi.stubGlobal(name, Fake)
	return instances
}

/**
 * The one instance the wrapper should have constructed. Fails the test if the
 * wrapper built none, or more than one.
 */
export function only<TEntry>(instances: Array<FakeObserver<TEntry>>): FakeObserver<TEntry> {
	expect(instances).toHaveLength(1)
	return instances[0]!
}
