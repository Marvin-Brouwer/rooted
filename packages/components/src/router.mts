import { component } from './component.mts'
import type { Component } from './component.mts'
import type { GenericComponent } from './component/generic-component.mts'
import { typedParameter, type BoundGateDefinition, type OmitGate } from './gates/gate-factory.mts'
import { isDevelopment } from './dev-helper.mts'

type RouterConfig = {
	home: Component
	notFound: Component
	[key: string]: Component | BoundGateDefinition<any, any>
}

// A gate is router-compatible if it has no required external options (everything beyond `gate`)
type RouterCompatibleGate<G> = G extends BoundGateDefinition<infer O, infer T>
	? ({} extends OmitGate<O> ? BoundGateDefinition<O, T> : never)
	: never

type ValidatedRouterConfig<T extends RouterConfig> = {
	[K in keyof T]: K extends 'home' | 'notFound' ? T[K] : RouterCompatibleGate<T[K]>
}

function isGate(value: Component | BoundGateDefinition<any, any>): value is BoundGateDefinition<any, any> {
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
			// Dev: warn on duplicates at mount time
			if (isDevelopment()) {
				const devSeen = new Set<object>()
				for (const [key, value] of entries) {
					if (!isGate(value)) continue
					if (devSeen.has(value)) {
						console.warn(`[rooted/router] Duplicate gate at key "${key}" — ignored (first-wins)`)
					}
					devSeen.add(value)
				}
			}

			// Gates self-manage their own visibility via popstate
			for (const { gate } of gates) {
				append(gate as unknown as Component)
			}

			let homeEl: GenericComponent | null = null
			let notFoundEl: GenericComponent | null = null

			const update = () => {
				const isHome = location.pathname === '/'
				const anyMatches = !isHome && gates.some(({ gate: g }) => g.matchFrom(location.pathname))

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
