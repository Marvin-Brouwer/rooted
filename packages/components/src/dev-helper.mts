import { Component, ComponentConstructor, definedAt } from './component.mts'

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

function formatStackFrame(frame: string | undefined): string | undefined {
	if (!frame) return void 0

	const trimmedFrame = frame
		.trim()
		.replace('at ', '')
		.replace(location.origin + '/', '')

	const queryLocation = trimmedFrame.indexOf('?')
	if (queryLocation === -1) return trimmedFrame

	return trimmedFrame.slice(0, queryLocation) +
		trimmedFrame.slice(trimmedFrame.indexOf(':', queryLocation))
}

function appendSourceLocation() {
	// Stack: Error -> appendSourceLocation -> component() -> call site
	const definitionStackFrame = new Error().stack?.split('\n')[3]
	return formatStackFrame(definitionStackFrame)
}

function appendComponentMetadata(element: HTMLElement, component: ComponentConstructor, options: unknown) {
	if (isDevelopment()) {
		Object.assign(element, {
			component: Object.freeze(component),
			options: Object.freeze(options),
			definedAt: Object.freeze(component[definedAt])
		})
	}
}

export const dev = {
	componentNameCheck: isDevelopment() ? componentNameChecker() : void 0,
	appendSourceLocation: isDevelopment() ? appendSourceLocation.bind(undefined) : void 0,
	appendComponentMetaData: isDevelopment() ? appendComponentMetadata.bind(undefined) : void 0
}