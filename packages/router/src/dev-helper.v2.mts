import { isDevelopment } from '@rooted/util/dev'
import { isRoute } from './route.v2.mts'
import { isParameterToken, isWildcardParameter, type Parameter } from './route.tokens.v2.mts'

function reconstructPattern(strings: TemplateStringsArray, values: readonly unknown[]): string {
	return Array.from(strings).reduce((acc, str, i) => {
		if (i === 0) return str
		const v = values[i - 1]
		let label: string
		if (isRoute(v)) label = '${Route}'
		else if (isParameterToken(v) && isWildcardParameter(v as Parameter)) label = `\${wildcard('${(v as Parameter).key}')}`
		else label = `\${${(v as Parameter).key}}`
		return acc + label + str
	}, '')
}

function validatePattern(strings: TemplateStringsArray, values: readonly unknown[]): Error[] {
	const errors: Error[] = []
	const pattern = reconstructPattern(strings, values)
	const startsWithRoute = isRoute(values[0]) && strings[0] === ''

	// Must start with / — unless it starts with a parent route interpolation
	if (!startsWithRoute && !strings[0]!.startsWith('/'))
		errors.push(new Error(`route pattern must start with a slash: "${pattern}"`))

	// Must end with /
	if (!strings[strings.length - 1]!.endsWith('/'))
		errors.push(new Error(`route pattern must end with a slash: "${pattern}"`))

	for (let i = 0; i < values.length; i++) {
		const v = values[i]

		if (isRoute(v)) {
			// Route interpolation must be the very first interpolation
			if (i !== 0)
				errors.push(new Error(`Route interpolation must be at the start of the pattern: "${pattern}"`))
			// Must have no preceding text — strings[0] must be ''
			if (strings[0] !== '')
				errors.push(new Error(`Route interpolation must have no preceding text — use route\`\${ParentRoute}/...\`: "${pattern}"`))
			// Must be followed immediately by a slash
			if (!strings[1]?.startsWith('/'))
				errors.push(new Error(`Route interpolation must be followed by a slash: "${pattern}"`))
		}

		if (isParameterToken(v) && isWildcardParameter(v as Parameter)) {
			// Wildcard must be the last interpolation
			if (i !== values.length - 1)
				errors.push(new Error(`Wildcard interpolation must be at the end of the pattern: "${pattern}"`))
			// Must be preceded by a slash
			if (!strings[i]!.endsWith('/'))
				errors.push(new Error(`Wildcard interpolation must be preceded by a slash: "${pattern}"`))
		}
	}

	return errors
}

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
	validatePattern: isDevelopment() ? validatePattern.bind(undefined) : void 0,
	logRouteErrors: isDevelopment() ? logRouteErrors.bind(undefined) : void 0,
	validateDuplicateRoutes: isDevelopment() ? validateDuplicateRoutes.bind(undefined) : void 0,
}
