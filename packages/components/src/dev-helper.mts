export function isDevelopment() {
	return import.meta.env.DEV
}

function componentNameChecker() {

	const names = new Set<string>()

	return function checkName(componentName: string) {
		if (names.has(componentName)) console.warn(
			`[component] Duplicate component name detected: "${componentName}"`
		)
		names.add(componentName)
	}
}

export const dev = {
	componentNameCheck: isDevelopment() ? componentNameChecker() : void 0
}