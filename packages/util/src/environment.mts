/** Where the code is running right now. */
export type Environment = 'client' | 'preRenderer' | 'server'

/**
 * Which environment this is, and whether there's a DOM to touch. Two different questions,
 * which is why they're two different properties.
 *
 * Both are read on every access rather than resolved once. They have to be.
 * A single Vite process evaluates route files against a fake DOM, then pre-renders, then goes back to being a plain build,
 * and a value cached at module load would answer for whichever phase happened to load it first.
 *
 * @example
 * ```ts
 * if (environment.is('preRenderer')) {
 *   // Pre-rendering can't compute style, so don't ask.
 *   return fallbackHeight
 * }
 * ```
 *
 * @example
 * `hasDom` is the one you want for "can I call `document.something`".
 * It's true in a browser and in the build's fake DOM alike:
 * ```ts
 * if (!environment.hasDom) return noop
 * window.addEventListener('popstate', update)
 * ```
 */
export const environment = Object.freeze({
	/** The environment this is running in. */
	get value(): Environment {
		if (!hasDom()) return 'server'
		return isHappyDom() ? 'preRenderer' : 'client'
	},
	/** `true` when `test` is the environment this is running in. */
	is(test: Environment): boolean {
		return environment.value === test
	},
	/** `true` when `window` exists, so in a browser and in the build's fake DOM both. */
	get hasDom(): boolean {
		return hasDom()
	},
})

/**
 * happy-dom is what the build pre-renders in, so finding it means this is the pre-render.
 *
 * Read with `in`, never a property read.
 * The pre-render's `window` is a Proxy whose `get` hands back `() => {}` for anything missing,
 * so `window.happyDOM` is truthy there for any name at all, including a typo. `in` goes to the target and behaves.
 *
 * This says "running under happy-dom", which is a shade broader than "pre-rendering",
 * so a test suite using the happy-dom environment is caught by it too.
 * That's the accepted trade for having no flag for a page to set and nothing for the build to remember to clean up.
 * Stub a `window` without `happyDOM` on it to get `client` under test.
 */
function isHappyDom(): boolean {
	// eslint-disable-next-line unicorn/prefer-global-this
	return 'happyDOM' in window
}

function hasDom(): boolean {
	// eslint-disable-next-line unicorn/prefer-global-this
	return typeof window !== 'undefined'
}
