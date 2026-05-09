import { isDevelopment } from '@rooted/util/dev'

import { isRoute } from './route.metadata.mts'

function logRouteErrors(errors: Error[]) {
	for (const error of errors) {
		console.warn(`[@rooted/router] ${error.message}`)
	}
}

function validateDuplicateRoutes(config: Record<string, unknown>) {
	const seen = new Set<object>()
	for (const [key, value] of Object.entries(config)) {
		if (!isRoute(value)) continue
		if (seen.has(value))
			console.warn(`[@rooted/router] Duplicate route at key "${key}". Ignored (first-wins).`)
		seen.add(value)
	}
}

export const devHelper = {
	logRouteErrors: isDevelopment() ? logRouteErrors.bind(void 0) : void 0,
	validateDuplicateRoutes: isDevelopment() ? validateDuplicateRoutes.bind(void 0) : void 0,
}
