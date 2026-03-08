import { isDevelopment } from '@rooted/util/dev'

import type { Component } from '@rooted/components'
import { isGate } from './router.mts'
import { BoundGateDefinition } from './gate-factory.mts'

type RouteEntries = [string, Component | BoundGateDefinition<any, any>][]
type Gates = Array<{ key: string; gate: BoundGateDefinition<any, any> }>

function validateDuplicateRoutes(entries: RouteEntries, gates: Gates) {
	const devSeen = new Set<object>()
	for (const [key, value] of entries) {
		if (!isGate(value)) continue
		if (devSeen.has(value)) {
			console.warn(`[rooted/router] Duplicate gate at key "${key}" — ignored (first-wins)`)
		}
		devSeen.add(value)
	}
	for (const { gate } of gates) {
		if (gate.exact && !gate.hasChildren) {
			console.warn(`[rooted/router] "${gate.name}" is marked .exact but has no child gates appended to it — it will never render`)
		}
	}
}

function verifyExactWillResolve(name: string, exact: boolean, result: false | {}, renders: boolean) {
	if (exact && result && !renders) {
		console.warn(`[rooted/gate] "${name}" is marked .exact but the current path "${location.pathname}" has no subroute — it will not render`)
	}
}

export const dev = {
	verifyExactWillResolve: isDevelopment() ? verifyExactWillResolve.bind(undefined) : void 0,
	validateDuplicateRoutes: isDevelopment() ? validateDuplicateRoutes.bind(undefined) : void 0
}