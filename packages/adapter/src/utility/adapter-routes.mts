import type { AdapterRoutes, ResolvedAdapterRoutes } from '../adapter.mts'
import type { RouteManifestApi } from '@rooted/router/manifest'

export function resolveAdapterRoutes(
	manifestApi: RouteManifestApi | undefined,
	routes: AdapterRoutes | undefined,
): ResolvedAdapterRoutes {
	const manualRoutes = routes ?? []
	return {
		staticPaths: [...new Set([
			...collectStaticRoutePaths(manifestApi),
			...manualRoutes.filter(route => !route.includes(':')),
		])],
		dynamicPatterns: [...new Set([
			...collectDynamicRoutePatterns(manifestApi),
			...manualRoutes.filter(route => route.includes(':')),
		])],
	}
}

function collectStaticRoutePaths(manifestApi: RouteManifestApi | undefined): string[] {
	const paths: string[] = []
	for (const route of manifestApi?.routes ?? []) {
		if (!Object.hasOwn(route, 'getMetadata')) continue
		const metadata = route.getMetadata()
		// staticPaths includes constant-token routes unrolled to concrete paths
		if (metadata.staticPaths === false) continue
		for (const staticPath of metadata.staticPaths) {
			const segments = staticPath.split('/').filter(Boolean)
			if (segments.length === 0) continue
			paths.push(staticPath)
		}
	}
	return paths
}

function collectDynamicRoutePatterns(manifestApi: RouteManifestApi | undefined): string[] {
	const patterns: string[] = []
	for (const route of manifestApi?.routes ?? []) {
		if (!Object.hasOwn(route, 'getMetadata')) continue
		const metadata = route.getMetadata()
		// Routes that unroll to concrete paths are fully prerendered, not dynamic
		if (metadata.staticPaths !== false) continue
		if (metadata.hasErrors) continue
		patterns.push(buildRoutePattern(route))
	}
	return patterns
}

// Builds a URL pattern string from a route's parts using :key for parameters.
// Wildcard tokens also use :key -- the catch-all handler covers segments they miss.
function buildRoutePattern(route: RouteManifestApi['routes'][number]): string {
	let pattern = ''
	for (const part of route.getMetadata().routeParts) {
		if (typeof part === 'string') {
			pattern += part
		} else if (Object.hasOwn(part, 'getMetadata')) {
			pattern += buildRoutePattern(part as RouteManifestApi['routes'][number])
		} else {
			// Parameter token -- always has a `key` property
			pattern += `:${(part as { key: string }).key}`
		}
	}
	return pattern
}
