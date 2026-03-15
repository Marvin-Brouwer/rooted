import { isDevelopment } from '@rooted/util/dev'
import { isRoute } from './route.metadata.v2.mts'

function logRouteErrors(errors: Error[]) {
	for (const error of errors) {
		console.warn(`[rooted/router] ${error.message}`)
	}
}

function validateDuplicateRoutes(config: Record<string, unknown>) {
	const seen = new Set<object>()
	for (const [key, value] of Object.entries(config)) {
		if (!isRoute(value)) continue
		if (seen.has(value))
			console.warn(`[rooted/router] Duplicate route at key "${key}" — ignored (first-wins)`)
		seen.add(value)
	}
}

export const dev = {
	logRouteErrors: isDevelopment() ? logRouteErrors.bind(undefined) : void 0,
	validateDuplicateRoutes: isDevelopment() ? validateDuplicateRoutes.bind(undefined) : void 0,
}
