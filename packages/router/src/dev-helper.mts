import { isDevelopment } from '@rooted/util/dev'

import type { Component } from '@rooted/components'
import { isRoute } from './router.mts'
import type { RouteDefinition, BoundGateDefinition } from './gate-factory.mts'

type RouteEntries = [string, Component | RouteDefinition<any, any> | BoundGateDefinition<any, any>][]
type Routes = Array<{ key: string; route: RouteDefinition<any, any> }>

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
		if (isRoute(v as any)) label = '${Route}'
		else if (isWildcard(v)) label = `\${wildcard('${v.key}')}`
		else label = `\${${(v as { key: string }).key}}`
		return acc + label + str
	}, '')
}

function validatePattern(strings: TemplateStringsArray, values: readonly unknown[]) {
	const pattern = reconstructPattern(strings, values)
	const startsWithRoute = isRoute(values[0] as any) && strings[0] === ''

	// Must start with / — unless it starts with a parent route interpolation
	if (!startsWithRoute && !strings[0]!.startsWith('/')) {
		console.error(`[rooted/router] route pattern must start with a slash: "${pattern}"`)
	}

	// Must end with /
	const lastString = strings[strings.length - 1]!
	if (!lastString.endsWith('/')) {
		console.error(`[rooted/router] route pattern must end with a slash: "${pattern}"`)
	}

	for (let i = 0; i < values.length; i++) {
		const v = values[i]

		if (isRoute(v as any)) {
			// Route interpolation must be the very first interpolation
			if (i !== 0) {
				console.error(`[rooted/router] Route interpolation must be at the start of the pattern: "${pattern}"`)
			}
			// Must have no preceding text — strings[0] must be ''
			if (strings[0] !== '') {
				console.error(`[rooted/router] Route interpolation must have no preceding text — use route\`\${ParentRoute}/...\`: "${pattern}"`)
			}
			// Must be followed immediately by a slash
			if (!strings[1]?.startsWith('/')) {
				console.error(`[rooted/router] Route interpolation must be followed by a slash: "${pattern}"`)
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

function warnWildcardTie(wildcard: Routes[number], specific: Routes[number], pathname: string) {
	console.warn(
		`[rooted/router] "${wildcard.key}" (wildcard) and "${specific.key}" both matched "${pathname}" — ` +
		`wildcard takes precedence. If "${specific.key}" is intentionally a sub-route of "${wildcard.key}", ` +
		`remove it from the router config and export only a gate for it.`
	)
}

function validateDuplicateRoutes(entries: RouteEntries, routes: Routes) {
	const devSeen = new Set<object>()
	for (const [key, value] of entries) {
		if (!isRoute(value)) continue
		if (devSeen.has(value)) {
			console.warn(`[rooted/router] Duplicate route at key "${key}" — ignored (first-wins)`)
		}
		devSeen.add(value)
	}
}

export const dev = {
	validateDuplicateRoutes: isDevelopment() ? validateDuplicateRoutes.bind(undefined) : void 0,
	validatePattern: isDevelopment() ? validatePattern.bind(undefined) : void 0,
	warnWildcardTie: isDevelopment() ? warnWildcardTie.bind(undefined) : void 0,
}
