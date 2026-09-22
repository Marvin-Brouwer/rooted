/** Where the code is running right now. */
export type Environment = 'client' | 'preRenderer' | 'server'

/**
 * Baked into the bundle by `rootedManifest()`. Absent when an app wires up Vite by hand,
 * and absent in a plain Node import of this package.
 */
declare const __ROOTED_ENVIRONMENT__: Environment | undefined

/**
 * Where the pre-render leaves its mark.
 *
 * It has to be a global, and only because everything better is closed off.
 * The pre-render imports the built client bundle, so no build-time constant can tell the two apart.
 * Vite replaces `process.env` with `{}` in a browser build, in every spelling,
 * so the environment variable that would otherwise carry this never arrives.
 * Nothing writes this in a browser: `definePrerendering` is called by the build tooling only,
 * so in a shipped app the property does not exist.
 */
const environmentGlobal = '__rooted_environment'

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
		return resolveEnvironment()
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
 * @internal
 * Marks the current process as the pre-render, or clears the mark.
 *
 * For the build tooling only: `@rooted/adapter` calls this around the static render pass,
 * and the router's manifest plugin around its route evaluation. App code has no reason to.
 */
export function definePrerendering(prerendering: boolean): void {
	if (prerendering) globals()[environmentGlobal] = 'preRenderer'
	else delete globals()[environmentGlobal]
}

function resolveEnvironment(): Environment {
	// The pre-render runs the client bundle in Node, so no build-time constant can tell it apart. It says so itself.
	if (globals()[environmentGlobal] === 'preRenderer') return 'preRenderer'

	// What this bundle was built for.
	if (typeof __ROOTED_ENVIRONMENT__ !== 'undefined') return __ROOTED_ENVIRONMENT__

	// Neither signal is there, so guess from the surroundings and assume a browser when one looks present.
	// That's an app wiring up Vite by hand, or an older adapter, and both should keep working.
	return hasDom() ? 'client' : 'server'
}

function globals(): Record<string, string | undefined> {
	return globalThis as unknown as Record<string, string | undefined>
}

function hasDom(): boolean {
	// eslint-disable-next-line unicorn/prefer-global-this
	return typeof window !== 'undefined'
}
