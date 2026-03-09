import { isDevelopment } from '@rooted/util/dev'

import type { Component } from '@rooted/components'
import { isGate } from './router.mts'
import type { BoundGateDefinition } from './gate-factory.mts'

type RouteEntries = [string, Component | BoundGateDefinition<any, any>][]
type Gates = Array<{ key: string; gate: BoundGateDefinition<any, any> }>

// Use the global symbol registry to avoid a circular value import from gate-factory
const wildcardBrand = Symbol.for('rooted:wildcard')

function isWildcard(v: unknown): v is { key: string } {
	return typeof v === 'object' && v !== null && wildcardBrand in (v as object)
}

function reconstructPattern(strings: TemplateStringsArray, values: readonly unknown[]): string {
	return Array.from(strings).reduce((acc, str, i) => {
		if (i === 0) return str
		const v = values[i - 1]
		let label: string
		if (isGate(v as any)) label = '${Gate}'
		else if (isWildcard(v)) label = `\${wildcard('${v.key}')}`
		else label = `\${${(v as { key: string }).key}}`
		return acc + label + str
	}, '')
}

function validatePattern(strings: TemplateStringsArray, values: readonly unknown[], isJunction: boolean) {
	const pattern = reconstructPattern(strings, values)
	const kind = isJunction ? 'junction' : 'gate'

	// Must start with /
	if (!strings[0]!.startsWith('/')) {
		console.error(`[rooted/router] ${kind} pattern must start with a slash: "${pattern}"`)
	}

	// Must end with /
	const lastString = strings[strings.length - 1]!
	if (!lastString.endsWith('/')) {
		console.error(`[rooted/router] ${kind} pattern must end with a slash: "${pattern}"`)
	}

	for (let i = 0; i < values.length; i++) {
		const v = values[i]

		if (isGate(v as any)) {
			// Gate/junction interpolation must be the very first interpolation
			if (i !== 0) {
				console.error(`[rooted/router] Gate interpolation must be at the start of the pattern: "${pattern}"`)
			}
			// Must be preceded by exactly a leading slash — strings[0] must be '/'
			if (strings[0] !== '/') {
				console.error(`[rooted/router] Gate interpolation must be preceded by a leading slash — use gate\`/\${ParentGate}/...\`: "${pattern}"`)
			}
			// Must be followed immediately by a slash
			if (!strings[1]?.startsWith('/')) {
				console.error(`[rooted/router] Gate interpolation must be followed by a slash: "${pattern}"`)
			}
		}

		if (isWildcard(v)) {
			// Wildcard must be the last interpolation
			if (i !== values.length - 1) {
				console.error(`[rooted/router] Wildcard interpolation must be at the end of the pattern: "${pattern}"`)
			}
			// Must be preceded by a slash
			if (!strings[i]!.endsWith('/')) {
				console.error(`[rooted/router] Wildcard interpolation must be preceded by a slash: "${pattern}"`)
			}
		}
	}
}

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
			console.warn(`[rooted/router] "${gate.name}" is a junction but has no child gates — it will never render`)
		}
	}
}

function verifyExactWillResolve(name: string, exact: boolean, result: false | {}, renders: boolean) {
	if (exact && result && !renders) {
		console.warn(`[rooted/gate] "${name}" is a junction but the current path "${location.pathname}" has no subroute — it will not render`)
	}
}

export const dev = {
	verifyExactWillResolve: isDevelopment() ? verifyExactWillResolve.bind(undefined) : void 0,
	validateDuplicateRoutes: isDevelopment() ? validateDuplicateRoutes.bind(undefined) : void 0,
	validatePattern: isDevelopment() ? validatePattern.bind(undefined) : void 0,
}
