import { component } from '@rooted/components'
import type { Component, GenericComponent } from '@rooted/components'
import { typedParameter, type BoundGateDefinition, type OmitGate } from './gate-factory.mjs'
import { dev } from './dev-helper.mts'

type RouterConfig = {
	home: Component
	notFound: Component
	[key: string]: Component | BoundGateDefinition<any, any>
}

// A gate is router-compatible if it has no required external options (everything beyond `gate`).
// The [O] extends [never] check (non-distributive) handles Component<never> gates that have no options at all.
export type RouterCompatibleGate<G> = G extends BoundGateDefinition<infer O, infer T>
	? ([O] extends [never] ? BoundGateDefinition<O, T> : ({} extends OmitGate<O> ? BoundGateDefinition<O, T> : never))
	: never

export type ValidatedRouterConfig<T extends RouterConfig> = {
	[K in keyof T]: K extends 'home' | 'notFound' ? T[K] : RouterCompatibleGate<T[K]>
}

export function isGate(value: Component | BoundGateDefinition<any, any>): value is BoundGateDefinition<any, any> {
	return typedParameter in value
}

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
		name: 'router',
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
