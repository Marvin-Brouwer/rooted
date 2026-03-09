import { component } from '@rooted/components'
import type { Component, GenericComponent } from '@rooted/components'
import { typedParameter, type BoundGateDefinition, type OmitGate } from './gate-factory.mjs'
import { dev } from './dev-helper.mts'

/**
 * Configuration object passed to {@link router}.
 *
 * - `home` — Component rendered at `/`.
 * - `notFound` — Component rendered when the path is not `/` and no gate matches.
 * - All other keys must be {@link BoundGateDefinition} values produced by {@link gate}.
 */
type RouterConfig = {
	home: Component
	notFound: Component
	[key: string]: Component | BoundGateDefinition<any, any>
}

/**
 * Constrains a gate to be **router-compatible**: its component must not require
 * any external options beyond the automatically-injected `gate` parameter.
 *
 * A gate is compatible when:
 * - Its component has no options at all (`Component<never>`), **or**
 * - Every key in the options type beyond `gate` is optional (`{} extends OmitGate<O>`).
 *
 * Gates that require mandatory external options will produce a `never` type,
 * causing a compile-time error when passed to {@link router}.
 */
// A gate is router-compatible if it has no required external options (everything beyond `gate`).
// The [O] extends [never] check (non-distributive) handles Component<never> gates that have no options at all.
export type RouterCompatibleGate<G> = G extends BoundGateDefinition<infer O, infer T>
	? ([O] extends [never] ? BoundGateDefinition<O, T> : ({} extends OmitGate<O> ? BoundGateDefinition<O, T> : never))
	: never

/**
 * The validated version of a {@link RouterConfig}.
 *
 * `home` and `notFound` keys are passed through as-is. Every other key must be
 * a {@link RouterCompatibleGate}; incompatible gates produce `never` and
 * therefore a compile-time error.
 */
export type ValidatedRouterConfig<T extends RouterConfig> = {
	[K in keyof T]: K extends 'home' | 'notFound' ? T[K] : RouterCompatibleGate<T[K]>
}

/**
 * Type guard that identifies a {@link BoundGateDefinition} by the presence of the
 * internal `typedParameter` symbol.
 *
 * @param value - Any component or gate definition.
 * @returns `true` if `value` is a {@link BoundGateDefinition}.
 */
export function isGate(value: unknown): value is BoundGateDefinition<any, any> {
	return typeof value === 'object' && value !== null && typedParameter in value
}

/**
 * Creates the application router component.
 *
 * The router mounts all provided gates, then independently manages the `home`
 * and `notFound` components based on the current URL:
 *
 * - **`home`** — mounted at `/`, unmounted everywhere else.
 * - **`notFound`** — mounted when the path is not `/` and no registered gate matches.
 * - **Gates** — self-managing; each gate listens to `popstate` and shows/hides
 *   its component when the URL matches its pattern.
 *
 * Duplicate gates (same object reference under multiple keys) are silently
 * deduplicated — the first key wins. In development a console warning is emitted.
 *
 * @param config - Router configuration with `home`, `notFound`, and gate entries.
 * @returns A {@link Component} that can be mounted like any other component.
 *
 * @example Basic usage
 * ```ts
 * import { router } from '@rooted/router'
 *
 * const Router = router({
 *   home:     HomeComponent,
 *   notFound: NotFoundComponent,
 *   ArticleGate,
 *   CommentsGate,
 * })
 * ```
 *
 * @example With auto-discovered routes (Vite plugin)
 * ```ts
 * import { router } from '@rooted/router'
 * import { appRoutes } from './_routes.g.mts'
 *
 * const Router = router({ home, notFound, ...appRoutes })
 * ```
 *
 * @see {@link gate}
 * @see {@link generateRouteManifest}
 */
export function router<const T extends RouterConfig>(config: ValidatedRouterConfig<T>): Component {
	const { home, notFound } = config
	const entries = Object.entries(config).filter(([k]) => k !== 'home' && k !== 'notFound')

	// Deduplicate by identity — first-wins, applied in both dev and prod
	const seen = new Set<object>()
	const gates: Array<{ key: string; gate: BoundGateDefinition<any, any> }> = []
	for (const [key, value] of entries) {
		if (!isGate(value)) continue
		if (!seen.has(value)) {
			seen.add(value)
			gates.push({ key, gate: value })
		}
	}

	return component({
		name: 'rooted:router',
		onMount({ append, signal }) {


			dev.validateDuplicateRoutes?.(entries, gates)

			// Gates self-manage their own visibility via popstate
			for (const { gate } of gates) {
				append(gate as unknown as Component)
			}

			let homeEl: GenericComponent | null = null
			let notFoundEl: GenericComponent | null = null

			const update = () => {
				const isHome = location.pathname === '/'
				const anyMatches = !isHome && gates.some(({ gate: g }) => {
					const result = g.matchFrom(location.pathname)
					return result !== false && (!g.exact || result.end < location.pathname.length)
				})

				if (isHome && !homeEl) homeEl = append(home)
				else if (!isHome && homeEl) { homeEl.remove(); homeEl = null }

				if (!isHome && !anyMatches && !notFoundEl) notFoundEl = append(notFound)
				else if ((isHome || anyMatches) && notFoundEl) { notFoundEl.remove(); notFoundEl = null }
			}

			window.addEventListener('popstate', update, { signal })
			update()
		}
	})
}
