export function isDevelopment() {
	// todo return based on common patterns for vite and tsup etc.
	return true
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